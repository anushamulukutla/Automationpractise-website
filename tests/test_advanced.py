"""Advanced: shadow DOM, canvas, SVG, checker, permissions, basic auth, console errors."""
import re

from playwright.sync_api import Browser, Page, expect

from pages.advanced_page import AdvancedPage


def test_open_shadow_dom_is_pierced_by_locators(page: Page):
    adv = AdvancedPage(page).open()
    adv.tid("shadow-input").fill("Anu")  # inside an open shadow root, no special syntax needed
    adv.tid("shadow-btn").click()
    expect(adv.tid("shadow-result")).to_have_text("Hello, Anu!")


def test_closed_shadow_dom_is_tested_through_its_visible_effect(page: Page):
    adv = AdvancedPage(page).open()
    expect(adv.tid("closed-shadow-status")).to_have_text("Not clicked")
    # Scripts cannot reach a closed root, but a real click on the visible button still works.
    adv.tid("closed-shadow-host").click(position={"x": 60, "y": 30})
    expect(adv.tid("closed-shadow-status")).to_have_text("Button inside the closed root was clicked")


def test_canvas_drawing(page: Page):
    adv = AdvancedPage(page).open()
    adv.draw_stroke([(20, 20), (80, 60), (140, 30), (200, 90)])
    expect(adv.tid("canvas-strokes")).to_have_text("1")
    expect(adv.tid("canvas-position")).to_have_text(re.compile(r"^\d+, \d+$"))
    x, y = (int(v) for v in adv.tid("canvas-position").inner_text().split(", "))
    assert abs(x - 200) <= 2 and abs(y - 90) <= 2  # sub-pixel layout can shift the mapping by a pixel
    drawn = adv.tid("drawing-canvas").evaluate(
        "c => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;"
        " let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] !== 255 || d[i+1] !== 255 || d[i+2] !== 255) n++; return n; }"
    )
    assert drawn > 100  # pixels changed from the white background
    adv.tid("canvas-clear-btn").click()
    expect(adv.tid("canvas-strokes")).to_have_text("0")


def test_svg_shapes_are_clickable(page: Page):
    adv = AdvancedPage(page).open()
    adv.tid("svg-circle").click()
    expect(adv.tid("svg-status")).to_have_text("Clicked the circle (selected)")
    expect(adv.tid("svg-circle")).to_have_attribute("data-on", "true")
    adv.tid("svg-triangle").click()
    expect(adv.tid("svg-status")).to_have_text("Clicked the triangle (selected)")
    adv.tid("svg-circle").click()
    expect(adv.tid("svg-status")).to_have_text("Clicked the circle (deselected)")


def test_broken_links_and_images_checker(page: Page):
    adv = AdvancedPage(page).open()
    adv.tid("checker-run-btn").click()
    expect(adv.tid("checker-summary")).to_have_text("2 broken links, 1 broken image")
    expect(adv.tid("checker-link-ok")).to_have_count(1)
    expect(adv.tid("checker-link-broken")).to_have_text(["BROKEN (HTTP 404)", "BROKEN (HTTP 500)"])
    expect(adv.tid("checker-image-ok")).to_have_count(1)
    expect(adv.tid("checker-image-broken")).to_have_count(1)


def test_geolocation_granted(context, page: Page, base_url):
    context.grant_permissions(["geolocation"], origin=base_url)
    context.set_geolocation({"latitude": 43.65, "longitude": -79.38})
    adv = AdvancedPage(page).open()
    adv.tid("geo-request-btn").click()
    expect(adv.tid("geo-result")).to_have_text("Latitude 43.6500, longitude -79.3800")
    expect(adv.tid("geo-permission")).to_have_text("granted")


def test_geolocation_error_is_reported(page: Page):
    # Headless Chrome never answers an un-granted prompt, so simulate the "user denied" error instead.
    page.add_init_script(
        "navigator.geolocation.getCurrentPosition = (ok, fail) => fail({ code: 1, message: 'User denied Geolocation' });"
    )
    adv = AdvancedPage(page).open()
    adv.tid("geo-request-btn").click()
    expect(adv.tid("geo-result")).to_have_text("Location error: User denied Geolocation (code 1)")


def test_notification_permission_granted(context, page: Page, base_url):
    context.grant_permissions(["notifications"], origin=base_url)
    adv = AdvancedPage(page).open()
    expect(adv.tid("notif-permission")).to_have_text("granted")
    adv.tid("notif-request-btn").click()
    expect(adv.tid("notif-result")).to_have_text("Permission result: granted")
    adv.tid("notif-show-btn").click()
    expect(adv.tid("notif-result")).to_have_text("Notification shown")


def test_notification_cannot_show_without_permission(page: Page):
    adv = AdvancedPage(page).open()
    adv.tid("notif-show-btn").click()
    expect(adv.tid("notif-result")).to_have_text("Permission not granted, cannot show a notification")


def test_http_basic_auth_with_credentials(browser: Browser, base_url):
    context = browser.new_context(base_url=base_url, http_credentials={"username": "admin", "password": "admin"})
    page = context.new_page()
    page.goto("/basic-auth")
    expect(page.get_by_test_id("basic-auth-success")).to_contain_text("authenticated")
    context.close()


def test_http_basic_auth_without_credentials_is_401(page: Page):
    # A page navigation without credentials is aborted by Chromium in headless mode, so check the raw response.
    response = page.request.get("/basic-auth")
    assert response.status == 401
    assert "Basic" in response.headers["www-authenticate"]
    wrong = page.request.get("/basic-auth", headers={"Authorization": "Basic d3Jvbmc6Y3JlZHM="})  # wrong:creds
    assert wrong.status == 401


def test_console_errors_and_page_errors_are_captured(page: Page):
    console, failed = [], []
    page.on("console", lambda m: console.append((m.type, m.text)))
    page.on("response", lambda r: failed.append(r.url) if r.status == 404 else None)
    with page.expect_event("pageerror") as error_info:
        page.goto("/console-error.html")
    assert "Cannot read properties of undefined" in error_info.value.message
    assert ("error", "Intentional console error: something went wrong") in console
    assert any(kind == "warning" for kind, _ in console)
    assert any(url.endswith("/img/does-not-exist.png") for url in failed)

"""Alert handling: native dialogs, modal, toasts and the cookie banner."""
import re

from playwright.sync_api import Page, expect

from pages.alerts_page import AlertsPage


def test_js_alert_is_accepted(page: Page):
    alerts = AlertsPage(page).open()
    alerts.trigger_alert()
    expect(alerts.tid("alert-result")).to_have_text("Alert was dismissed")
    assert alerts.last_dialog["type"] == "alert"
    assert alerts.last_dialog["message"] == "Hello! I am a JavaScript alert."


def test_confirm_ok_and_cancel(page: Page):
    alerts = AlertsPage(page).open()

    alerts.trigger_confirm(accept=True)
    expect(alerts.tid("confirm-result")).to_have_text("You pressed OK")

    alerts.trigger_confirm(accept=False)
    expect(alerts.tid("confirm-result")).to_have_text("You pressed Cancel")
    assert alerts.last_dialog["type"] == "confirm"


def test_prompt_with_text_and_dismissed(page: Page):
    alerts = AlertsPage(page).open()

    alerts.trigger_prompt("Anu")
    expect(alerts.tid("prompt-result")).to_have_text("You entered: Anu")
    assert alerts.last_dialog["type"] == "prompt"

    alerts.trigger_prompt(None, accept=False)
    expect(alerts.tid("prompt-result")).to_have_text("You dismissed the prompt")


def test_delayed_alert_fires_after_five_seconds(page: Page):
    alerts = AlertsPage(page).open()
    alerts.trigger_delayed_alert()
    expect(alerts.tid("delayed-alert-status")).to_have_text("Alert will fire in 5 seconds...")
    # The dialog arrives later; the web-first assertion waits for the final state.
    expect(alerts.tid("delayed-alert-status")).to_have_text("Delayed alert was dismissed", timeout=8_000)
    assert alerts.last_dialog["message"] == "This alert was delayed by 5 seconds."


def test_alert_shown_on_page_load(page: Page):
    alerts = AlertsPage(page).open()
    alerts.open_page_load_alert()  # handler registered before the navigation
    expect(alerts.tid("onload-alert-result")).to_have_text("Page-load alert was dismissed")
    assert alerts.last_dialog["message"] == "This alert appeared when the page loaded."


def test_modal_confirm_and_escape(page: Page):
    alerts = AlertsPage(page).open()
    modal = alerts.tid("modal")

    alerts.open_modal()
    expect(modal).to_be_visible()
    expect(alerts.tid("modal-title")).to_have_text("Confirm your choice")
    alerts.tid("modal-confirm-btn").click()
    expect(modal).to_be_hidden()
    expect(alerts.tid("modal-result")).to_have_text("Modal confirmed")

    alerts.open_modal()
    page.keyboard.press("Escape")
    expect(modal).to_be_hidden()
    expect(alerts.tid("modal-result")).to_have_text("Modal closed with Escape")


def test_toast_dismisses_itself(page: Page):
    alerts = AlertsPage(page).open()
    alerts.show_toast("success")
    toast = alerts.tid("toast-success")
    expect(toast).to_be_visible()
    expect(toast).to_contain_text("Saved successfully")
    expect(toast).to_be_hidden(timeout=5_000)  # auto-dismisses after 3 s


def test_toast_can_be_closed_manually(page: Page):
    alerts = AlertsPage(page).open()
    alerts.show_toast("error")
    alerts.tid("toast-close-btn").click()
    expect(alerts.tid("toast-error")).to_have_count(0)


def test_cookie_banner_accept_persists(page: Page):
    alerts = AlertsPage(page).open()
    banner = alerts.tid("cookie-banner")
    expect(banner).to_be_visible(timeout=3_000)  # appears about 1 s after load

    alerts.tid("cookie-accept-btn").click()
    expect(banner).to_be_hidden()
    expect(alerts.tid("cookie-status")).to_have_text("accepted")

    page.reload()
    expect(alerts.tid("cookie-status")).to_have_text("accepted")
    page.wait_for_timeout(1_500)  # long enough for the banner to have appeared if it were going to
    expect(banner).to_be_hidden()
    cookies = {c["name"]: c["value"] for c in page.context.cookies()}
    assert cookies.get("cookie_consent") == "accepted"

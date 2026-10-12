"""Dynamic waits: rely on web-first assertions and auto-waiting, never fixed sleeps.

These use the delayed behaviours that already exist on pages 1-4. Tests for the Dynamic Elements
page (spinners, delayed buttons, stale elements) are added when that page is built.
"""
from playwright.sync_api import Page, expect

from pages.dropdowns_page import DropdownsPage


def test_delayed_dropdown_options_load(page: Page):
    dropdowns = DropdownsPage(page).open()
    select = dropdowns.tid("delayed-select")
    expect(select).to_be_disabled()

    dropdowns.load_delayed_options()
    expect(dropdowns.tid("delayed-select-status")).to_have_text("Loading options...")
    expect(select).to_be_enabled(timeout=6_000)  # options arrive after ~3 s
    expect(dropdowns.tid("delayed-select-status")).to_have_text("Loaded 5 options")
    expect(select.locator("option")).to_have_count(6)  # placeholder + 5

    select.select_option(label="Charlie")
    expect(dropdowns.tid("delayed-select-result")).to_have_text("Selected: Charlie")


def test_slow_network_setting_delays_api_calls(page: Page, base_url):
    page.goto("/settings.html")
    page.get_by_test_id("slow-network-toggle").check()
    page.get_by_test_id("slow-network-ms-input").fill("1200")
    page.get_by_test_id("settings-save-btn").click()
    expect(page.get_by_test_id("settings-status")).to_have_text("Settings saved")

    page.goto("/dropdowns.html")
    expect(page.get_by_test_id("mode-banner")).to_contain_text("Slow network")
    expect(page.get_by_test_id("country-select")).to_be_disabled()  # still loading
    expect(page.get_by_test_id("country-select")).to_be_enabled(timeout=5_000)


def test_randomize_ids_changes_ids_but_not_testids(page: Page):
    page.goto("/settings.html")
    page.get_by_test_id("randomize-ids-toggle").check()
    page.get_by_test_id("settings-save-btn").click()
    expect(page.get_by_test_id("settings-status")).to_have_text("Settings saved")

    page.goto("/dropdowns.html")
    first = page.get_by_test_id("native-single-select").get_attribute("id")
    page.reload()
    second = page.get_by_test_id("native-single-select").get_attribute("id")
    assert first != second
    assert first.startswith("native-select-")

    # The label is still wired to the (renamed) select.
    page.get_by_label("Single select").select_option("apple")
    expect(page.get_by_test_id("native-select-result")).to_have_text("Selected: Apple")

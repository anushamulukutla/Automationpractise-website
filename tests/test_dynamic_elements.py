"""Dynamic Elements page: waiting for things that change, appear, disappear or get re-rendered."""
import pytest
from playwright.sync_api import Page, expect

from pages.dynamic_page import DynamicPage


def test_random_id_changes_but_testid_is_stable(page: Page):
    dynamic = DynamicPage(page).open()
    first_id = dynamic.random_button.get_attribute("id")
    page.reload()
    second_id = dynamic.random_button.get_attribute("id")
    assert first_id != second_id
    dynamic.random_button.click()  # located by data-testid, so the id does not matter
    expect(dynamic.tid("random-id-result")).to_contain_text("Clicked the button with id")


def test_element_appears_after_delay(page: Page):
    dynamic = DynamicPage(page).open()
    dynamic.start_appear(2)
    expect(dynamic.tid("appearing-element")).to_have_count(0)  # not there yet
    expect(dynamic.tid("appearing-element")).to_be_visible(timeout=5_000)
    expect(dynamic.tid("appear-status")).to_have_text("Element appeared")


def test_element_disappears(page: Page):
    dynamic = DynamicPage(page).open()
    dynamic.tid("start-disappear-btn").click()
    expect(dynamic.tid("disappearing-element")).to_be_visible()
    expect(dynamic.tid("disappearing-element")).to_be_hidden(timeout=5_000)
    expect(dynamic.tid("disappear-status")).to_have_text("Element is gone")


def test_button_becomes_enabled_after_delay(page: Page):
    dynamic = DynamicPage(page).open()
    button = dynamic.tid("delayed-enable-btn")
    expect(button).to_be_disabled()
    expect(button).to_be_enabled(timeout=7_000)
    button.click()
    expect(dynamic.tid("delayed-enable-status")).to_have_text("Submitted!")


def test_spinner_and_skeleton_then_ajax_table(page: Page):
    dynamic = DynamicPage(page).open()
    dynamic.load_table()
    expect(dynamic.tid("table-spinner")).to_be_visible()
    expect(dynamic.tid("table-skeleton")).to_be_visible()
    expect(dynamic.tid("ajax-table")).to_be_visible(timeout=6_000)
    expect(dynamic.tid("table-spinner")).to_have_count(0)
    expect(dynamic.tid("ajax-row")).to_have_count(4)
    expect(dynamic.tid("ajax-row").first).to_contain_text("Ada Lovelace")


def test_infinite_scroll_loads_all_items(page: Page):
    dynamic = DynamicPage(page).open()
    items = dynamic.tid("infinite-item")
    expect(items).to_have_count(10)
    for expected in (20, 30, 40, 50):
        dynamic.scroll_infinite_to_bottom()
        expect(items).to_have_count(expected)
    expect(dynamic.tid("infinite-status")).to_have_text("All 50 items loaded")


def test_stale_element_after_rerender(page: Page):
    dynamic = DynamicPage(page).open()
    old_handle = dynamic.tid("stale-item-btn").first.element_handle()
    old_handle.click()
    expect(dynamic.tid("stale-click-result")).to_have_text("Clicked Alpha")
    assert old_handle.evaluate("el => el.isConnected") is False  # the saved handle is now stale
    # A Locator re-queries every time, so it keeps working.
    dynamic.tid("stale-item-btn").nth(1).click()
    expect(dynamic.tid("stale-click-result")).to_have_text("Clicked Bravo")
    expect(dynamic.tid("stale-render-count")).to_have_text("3")


def test_lazy_section_loads_when_scrolled_into_view(page: Page):
    dynamic = DynamicPage(page).open()
    expect(dynamic.tid("lazy-content")).to_be_hidden()
    dynamic.tid("lazy-section").scroll_into_view_if_needed()
    expect(dynamic.tid("lazy-content")).to_be_visible(timeout=4_000)
    expect(dynamic.tid("lazy-text")).to_contain_text("fetched only after")


def test_add_and_remove_elements(page: Page):
    dynamic = DynamicPage(page).open()
    for _ in range(3):
        dynamic.tid("add-element-btn").click()
    expect(dynamic.tid("added-element")).to_have_count(3)
    dynamic.tid("delete-element-btn").first.click()
    expect(dynamic.tid("added-element")).to_have_count(2)
    expect(dynamic.tid("added-count")).to_have_text("2")


def test_dynamic_table_rows(page: Page):
    dynamic = DynamicPage(page).open()
    expect(dynamic.tid("dynamic-table-empty")).to_be_visible()
    dynamic.tid("add-row-btn").click()
    dynamic.tid("add-row-btn").click()
    expect(dynamic.tid("dynamic-row")).to_have_count(2)
    expect(dynamic.tid("dynamic-table-empty")).to_be_hidden()
    dynamic.tid("remove-row-btn").first.click()
    expect(dynamic.tid("dynamic-row-name")).to_have_text(["Row 2"])


def test_progress_bar_reaches_100(page: Page):
    dynamic = DynamicPage(page).open()
    dynamic.start_progress()
    expect(dynamic.tid("progress-bar")).not_to_have_attribute("aria-valuenow", "0")
    expect(dynamic.tid("progress-bar")).to_have_attribute("aria-valuenow", "100", timeout=8_000)
    expect(dynamic.tid("progress-status")).to_have_text("Complete")

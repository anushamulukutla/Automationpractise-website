"""Iframe switching with Playwright frame locators."""
from playwright.sync_api import Page, expect

from pages.iframes_page import IframesPage


def test_form_is_loaded_in_the_named_iframe(page: Page):
    iframes = IframesPage(page).open()
    iframe = iframes.tid("form-iframe")

    expect(iframe).to_have_attribute("name", "formFrame")
    expect(iframe).to_have_attribute("id", "form-frame")
    expect(iframe).to_have_attribute("src", "frame-form.html")
    expect(iframe).to_have_attribute("title", "Contact form")
    expect(iframes.single_frame.get_by_test_id("frame-form")).to_have_attribute("novalidate", "")


def test_fill_form_inside_single_iframe(page: Page):
    iframes = IframesPage(page).open()
    iframes.fill_and_submit_single_form("Anu", "anu@example.com")
    expect(iframes.single_frame.get_by_test_id("frame-form-result")).to_have_text("Submitted: Anu <anu@example.com>")


def test_single_iframe_validation_message(page: Page):
    iframes = IframesPage(page).open()
    iframes.single_frame.get_by_test_id("frame-submit-btn").click()
    expect(iframes.single_frame.get_by_test_id("frame-form-result")).to_have_text("Name and email are required")


def test_nested_iframes_three_levels(page: Page):
    iframes = IframesPage(page).open()
    l1 = iframes.frame("nested-iframe-l1")
    l2 = l1.frame_locator("[data-testid='nested-iframe-l2']")

    l1.get_by_test_id("nested-l1-btn").click()
    expect(l1.get_by_test_id("nested-l1-result")).to_have_text("Level 1 button clicked")

    l2.get_by_test_id("nested-l2-btn").click()
    expect(l2.get_by_test_id("nested-l2-result")).to_have_text("Level 2 button clicked")

    iframes.level3.get_by_test_id("nested-l3-btn").click()
    expect(iframes.level3.get_by_test_id("nested-l3-result")).to_have_text("Level 3 button clicked")


def test_dynamic_iframe_content_appears_after_delay(page: Page):
    iframes = IframesPage(page).open()
    frame = iframes.dynamic_frame
    expect(frame.get_by_test_id("dynamic-frame-status")).to_have_text("Loading...")
    expect(frame.get_by_test_id("dynamic-frame-content")).to_contain_text("Initial content", timeout=5_000)


def test_parent_buttons_update_iframe_content(page: Page):
    iframes = IframesPage(page).open()
    frame = iframes.dynamic_frame
    content = frame.get_by_test_id("dynamic-frame-content")
    expect(content).to_be_visible(timeout=5_000)  # wait out the initial load first

    iframes.tid("set-frame-content-a-btn").click()
    expect(content).to_have_text("Content A from parent")
    iframes.tid("set-frame-content-b-btn").click()
    expect(content).to_have_text("Content B from parent")
    iframes.tid("clear-frame-content-btn").click()
    expect(content).to_be_hidden()


def test_iframe_with_dynamic_id_is_found_by_testid(page: Page):
    iframes = IframesPage(page).open()
    first_id = iframes.tid("dynamic-frame-id").inner_text()

    iframes.dynamic_id_frame.get_by_test_id("simple-frame-btn").click()
    expect(iframes.dynamic_id_frame.get_by_test_id("simple-frame-result")).to_have_text(
        "Clicked inside dynamic-id frame"
    )

    iframes.tid("regenerate-frame-id-btn").click()
    assert iframes.tid("dynamic-frame-id").inner_text() != first_id
    # Same locator still works after the id and name changed.
    iframes.dynamic_id_frame.get_by_test_id("simple-frame-btn").click()
    expect(iframes.dynamic_id_frame.get_by_test_id("simple-frame-result")).to_be_visible()


def test_sandboxed_iframe_runs_scripts_but_has_opaque_origin(page: Page):
    iframes = IframesPage(page).open()
    frame = iframes.sandboxed_frame
    expect(frame.get_by_test_id("sandbox-origin")).to_have_text("null")
    frame.get_by_test_id("sandbox-btn").click()
    expect(frame.get_by_test_id("sandbox-result")).to_have_text("Script ran inside the sandboxed frame")

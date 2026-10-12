"""New tab / window handling."""
import re

from playwright.sync_api import Page, expect

from pages.windows_page import WindowsPage


def test_link_opens_new_tab(page: Page):
    windows = WindowsPage(page).open()
    new_tab = windows.open_new_tab()

    expect(new_tab).to_have_url(re.compile(r"/windows/new-tab\.html$"))
    expect(new_tab.get_by_test_id("new-tab-title")).to_have_text("New Tab")
    assert len(page.context.pages) == 2

    new_tab.close()
    expect(windows.title).to_have_text("Windows and Tabs")  # original tab is unaffected


def test_popup_window(page: Page):
    windows = WindowsPage(page).open()
    popup = windows.open_popup()

    expect(popup.get_by_test_id("popup-title")).to_have_text("Popup Window")
    expect(popup.get_by_test_id("popup-size")).to_be_visible()
    # window.close() ends the page mid-click, so wait for the close event instead of the click result.
    with popup.expect_event("close"):
        popup.get_by_test_id("popup-close-btn").click(no_wait_after=True)
    assert popup.is_closed()


def test_multiple_tabs_opened_at_once(page: Page):
    windows = WindowsPage(page).open()
    tabs = windows.open_multiple_tabs(expected=3)

    assert len(tabs) == 3
    numbers = sorted(tab.get_by_test_id("tab-number").inner_text() for tab in tabs)
    assert numbers == ["1", "2", "3"]
    assert len(page.context.pages) == 4  # parent + 3 tabs


def test_child_window_passes_data_back_to_parent(page: Page):
    windows = WindowsPage(page).open()
    child = windows.open_child_window()

    child.get_by_test_id("child-message-input").fill("Hello from the child")
    child.get_by_test_id("child-send-btn").click()
    expect(child.get_by_test_id("child-status")).to_have_text("Message sent to parent")

    expect(windows.tid("child-result")).to_have_text("Hello from the child")


def test_redirect_chain_lands_on_final_page(page: Page):
    windows = WindowsPage(page).open()
    windows.follow_redirect_chain()

    expect(page).to_have_url(re.compile(r"/windows/redirect-landing\.html\?hops=3$"))
    expect(page.get_by_test_id("redirect-landing-text")).to_have_text("You arrived after 3 server redirects.")


def test_link_opens_in_same_tab(page: Page):
    windows = WindowsPage(page).open()
    windows.follow_same_tab_link()

    expect(page).to_have_url(re.compile(r"/windows/same-tab\.html$"))
    assert len(page.context.pages) == 1
    page.get_by_test_id("same-tab-back-link").click()
    expect(windows.title).to_have_text("Windows and Tabs")

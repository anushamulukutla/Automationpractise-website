from playwright.sync_api import Page, expect

from .base_page import BasePage


class WindowsPage(BasePage):
    path = "/windows.html"

    def open_new_tab(self) -> Page:
        # target=_blank with rel=noopener: listen on the context, not just the page.
        with self.page.context.expect_page() as new_page_info:
            self.tid("new-tab-link").click()
        new_page = new_page_info.value
        new_page.wait_for_load_state()
        return new_page

    def open_popup(self) -> Page:
        with self.page.expect_popup() as popup_info:
            self.tid("open-popup-btn").click()
        popup = popup_info.value
        popup.wait_for_load_state()
        return popup

    def open_multiple_tabs(self, expected: int = 3) -> list[Page]:
        """Click once; collect every tab the context reports until `expected` have arrived."""
        opened: list[Page] = []
        self.page.context.on("page", lambda tab: opened.append(tab))
        self.tid("open-multiple-tabs-btn").click()
        expect(self.tid("multi-tabs-status")).to_have_text(f"Opened {expected} of 3 tabs")
        for _ in range(50):  # up to ~5 s for the pages to register
            if len(opened) >= expected:
                break
            self.page.wait_for_timeout(100)
        for tab in opened:
            tab.wait_for_load_state()
        return opened

    def open_child_window(self) -> Page:
        with self.page.expect_popup() as popup_info:
            self.tid("open-child-btn").click()
        child = popup_info.value
        child.wait_for_load_state()
        return child

    def follow_redirect_chain(self):
        self.tid("redirect-chain-link").click()

    def follow_same_tab_link(self):
        self.tid("same-tab-link").click()

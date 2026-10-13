from playwright.sync_api import FrameLocator

from .base_page import BasePage


class IframesPage(BasePage):
    path = "/iframes.html"

    def frame(self, test_id: str) -> FrameLocator:
        return self.page.frame_locator(f"[data-testid='{test_id}']")

    @property
    def single_frame(self) -> FrameLocator:
        return self.frame("form-iframe")

    def fill_and_submit_single_form(self, name: str, email: str):
        form = self.single_frame
        form.get_by_test_id("frame-name-input").fill(name)
        form.get_by_test_id("frame-email-input").fill(email)
        form.get_by_test_id("frame-submit-btn").click()

    @property
    def level3(self) -> FrameLocator:
        """Level 3 is reached by chaining frame locators: l1 -> l2 -> l3."""
        return self.frame("nested-iframe-l1").frame_locator("[data-testid='nested-iframe-l2']").frame_locator(
            "[data-testid='nested-iframe-l3']"
        )

    @property
    def dynamic_frame(self) -> FrameLocator:
        return self.frame("dynamic-iframe")

    @property
    def dynamic_id_frame(self) -> FrameLocator:
        # The frame's id and name change on every load, so never locate it by id.
        return self.frame("dynamic-id-iframe")

    @property
    def sandboxed_frame(self) -> FrameLocator:
        return self.frame("sandboxed-iframe")

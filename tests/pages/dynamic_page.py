from playwright.sync_api import Locator

from .base_page import BasePage


class DynamicPage(BasePage):
    path = "/dynamic.html"

    @property
    def random_button(self) -> Locator:
        return self.tid("random-id-btn")

    def start_appear(self, seconds: int):
        self.tid("appear-delay-input").fill(str(seconds))
        self.tid("start-appear-btn").click()

    def load_table(self):
        self.tid("load-table-btn").click()

    @property
    def infinite_box(self) -> Locator:
        return self.tid("infinite-scroll-container")

    def scroll_infinite_to_bottom(self):
        self.infinite_box.evaluate("el => { el.scrollTop = el.scrollHeight; }")

    def start_progress(self):
        self.tid("start-progress-btn").click()

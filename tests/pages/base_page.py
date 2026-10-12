from playwright.sync_api import Locator, Page


class BasePage:
    """Common behaviour for every page object. Locators use data-testid only."""

    path = "/"

    def __init__(self, page: Page):
        self.page = page

    def open(self):
        self.page.goto(self.path)
        return self

    def tid(self, test_id: str) -> Locator:
        return self.page.get_by_test_id(test_id)

    @property
    def title(self) -> Locator:
        return self.tid("page-title")

    def go_to(self, nav_test_id: str):
        self.tid(nav_test_id).click()

from playwright.sync_api import Locator

from .base_page import BasePage


class TablesPage(BasePage):
    path = "/tables.html"

    @property
    def rows(self) -> Locator:
        return self.page.locator("[data-testid='table-body'] > tr[data-testid^='table-row-']")

    def column_texts(self, prefix: str) -> list[str]:
        return self.page.locator(f"[data-testid^='{prefix}-cell-']").all_inner_texts()

    def set_page_size(self, size: int):
        self.tid("page-size-select").select_option(str(size))

    def sort_by(self, column: str):
        self.tid(f"sort-{column}-btn").click()

    def filter_text(self, text: str):
        self.tid("table-filter-input").fill(text)

    def edit_cell(self, row_id: int, field: str, value: str):
        cell = self.tid(f"{field}-cell-{row_id}")
        cell.dblclick()
        self.tid("cell-input").fill(value)
        self.tid("cell-input").press("Enter")

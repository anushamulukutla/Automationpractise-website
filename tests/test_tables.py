"""Tables, sorting, filtering, pagination, selection, expansion and inline editing."""
from playwright.sync_api import Page, expect

from pages.tables_page import TablesPage


def _salaries(tables: TablesPage) -> list[int]:
    return [int(s.replace("$", "").replace(",", "")) for s in tables.column_texts("salary")]


def test_loads_first_page_of_120_rows(page: Page):
    tables = TablesPage(page).open()
    expect(tables.rows).to_have_count(10)
    expect(tables.tid("page-info")).to_have_text("Showing 1-10 of 120 rows (page 1 of 12)")
    expect(tables.tid("page-prev-btn")).to_be_disabled()


def test_page_size_options(page: Page):
    tables = TablesPage(page).open()
    for size in (25, 50, 10):
        tables.set_page_size(size)
        expect(tables.rows).to_have_count(size)


def test_pagination_next_last_and_numbers(page: Page):
    tables = TablesPage(page).open()
    tables.tid("page-next-btn").click()
    expect(tables.tid("page-info")).to_have_text("Showing 11-20 of 120 rows (page 2 of 12)")
    tables.tid("page-btn-4").click()
    expect(tables.tid("page-info")).to_contain_text("page 4 of 12")
    tables.tid("page-last-btn").click()
    expect(tables.tid("page-info")).to_have_text("Showing 111-120 of 120 rows (page 12 of 12)")
    expect(tables.tid("page-next-btn")).to_be_disabled()
    tables.tid("page-first-btn").click()
    expect(tables.tid("page-btn-1")).to_have_attribute("aria-current", "page")


def test_sort_by_salary_ascending_then_descending(page: Page):
    tables = TablesPage(page).open()
    tables.sort_by("salary")
    expect(tables.tid("sort-salary-btn").locator("xpath=..")).to_have_attribute("aria-sort", "ascending")
    asc = _salaries(tables)
    assert asc == sorted(asc)
    tables.sort_by("salary")
    expect(tables.tid("sort-salary-btn").locator("xpath=..")).to_have_attribute("aria-sort", "descending")
    desc = _salaries(tables)
    assert desc == sorted(desc, reverse=True)
    assert desc[0] >= asc[-1]


def test_filter_by_text_and_no_results(page: Page):
    tables = TablesPage(page).open()
    tables.filter_text("zzzzzz-no-match")
    expect(tables.rows).to_have_count(0)
    expect(tables.tid("table-empty")).to_be_visible()
    expect(tables.tid("page-info")).to_have_text("Showing 0-0 of 0 rows (page 1 of 1)")
    tables.filter_text("")
    expect(tables.rows).to_have_count(10)


def test_filter_by_department(page: Page):
    tables = TablesPage(page).open()
    tables.tid("table-dept-filter").select_option("Sales")
    expect(tables.tid("page-info")).to_contain_text("of 24 rows")  # 120 rows over 5 departments
    assert set(tables.column_texts("department")) == {"Sales"}


def test_select_all_on_page_and_individual_rows(page: Page):
    tables = TablesPage(page).open()
    tables.tid("select-all-checkbox").check()
    expect(tables.tid("selected-count")).to_have_text("10 selected")
    tables.tid("row-select-3").uncheck()
    expect(tables.tid("selected-count")).to_have_text("9 selected")
    expect(tables.tid("select-all-checkbox")).not_to_be_checked()
    tables.tid("page-next-btn").click()  # selection survives paging
    tables.tid("row-select-11").check()
    expect(tables.tid("selected-count")).to_have_text("10 selected")
    tables.tid("clear-selection-btn").click()
    expect(tables.tid("selected-count")).to_have_text("0 selected")


def test_expand_and_collapse_row(page: Page):
    tables = TablesPage(page).open()
    details = tables.tid("row-details-1")
    expect(details).to_have_count(0)
    tables.tid("expand-1-btn").click()
    expect(details).to_be_visible()
    expect(tables.tid("detail-email-1")).to_contain_text("@")
    expect(tables.tid("expand-1-btn")).to_have_attribute("aria-expanded", "true")
    tables.tid("expand-1-btn").click()
    expect(details).to_have_count(0)


def test_inline_edit_saves_with_enter(page: Page):
    tables = TablesPage(page).open()
    tables.edit_cell(1, "name", "Edited Name")
    expect(tables.tid("name-cell-1")).to_have_text("Edited Name")
    expect(tables.tid("edit-status")).to_have_text("Saved name for row 1")
    tables.edit_cell(2, "salary", "123456")
    expect(tables.tid("salary-cell-2")).to_have_text("$123,456")


def test_inline_edit_escape_cancels_and_invalid_is_rejected(page: Page):
    tables = TablesPage(page).open()
    original = tables.tid("name-cell-1").inner_text()
    tables.tid("name-cell-1").dblclick()
    tables.tid("cell-input").fill("Should not be saved")
    tables.tid("cell-input").press("Escape")
    expect(tables.tid("name-cell-1")).to_have_text(original)

    tables.edit_cell(1, "name", "x")  # too short
    expect(tables.tid("edit-status")).to_have_text("Invalid name, change discarded")
    expect(tables.tid("name-cell-1")).to_have_text(original)

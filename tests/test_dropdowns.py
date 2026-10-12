"""Dropdown selection: native, custom, dependent, autocomplete."""
from playwright.sync_api import Page, expect

from pages.dropdowns_page import DropdownsPage


def test_native_single_select_by_label(page: Page):
    dropdowns = DropdownsPage(page).open()
    dropdowns.choose_fruit("Mango")
    expect(dropdowns.tid("native-single-select")).to_have_value("mango")
    expect(dropdowns.tid("native-select-result")).to_have_text("Selected: Mango")


def test_native_multi_select(page: Page):
    dropdowns = DropdownsPage(page).open()
    dropdowns.choose_colours(["red", "blue"])
    expect(dropdowns.tid("native-multi-select")).to_have_values(["red", "blue"])
    expect(dropdowns.tid("multi-select-result")).to_have_text("Selected: Red, Blue")


def test_grouped_options(page: Page):
    dropdowns = DropdownsPage(page).open()
    dropdowns.choose_grouped("postman")
    expect(dropdowns.tid("grouped-select-result")).to_have_text("Selected: Postman (API testing)")


def test_custom_div_dropdown(page: Page):
    dropdowns = DropdownsPage(page).open()
    expect(dropdowns.tid("custom-dropdown-menu")).to_be_hidden()

    dropdowns.choose_custom("custom-dropdown", "green")
    expect(dropdowns.tid("custom-dropdown-selected")).to_have_text("Green")
    expect(dropdowns.tid("custom-dropdown-trigger")).to_have_text("Green")
    expect(dropdowns.tid("custom-dropdown-menu")).to_be_hidden()


def test_custom_dropdown_keyboard(page: Page):
    dropdowns = DropdownsPage(page).open()
    dropdowns.tid("custom-dropdown-trigger").focus()
    page.keyboard.press("ArrowDown")  # opens, first option active
    page.keyboard.press("ArrowDown")
    page.keyboard.press("Enter")
    expect(dropdowns.tid("custom-dropdown-selected")).to_have_text("Green")


def test_searchable_dropdown_filters_options(page: Page):
    dropdowns = DropdownsPage(page).open()
    dropdowns.tid("searchable-dropdown-trigger").click()
    dropdowns.tid("searchable-dropdown-search").fill("script")
    visible = page.locator("[data-testid^='searchable-dropdown-option-']:visible")
    expect(visible).to_have_count(2)  # JavaScript, TypeScript

    dropdowns.tid("searchable-dropdown-search").fill("zzz")
    expect(dropdowns.tid("searchable-dropdown-empty")).to_be_visible()

    dropdowns.tid("searchable-dropdown-search").fill("pyth")
    dropdowns.tid("searchable-dropdown-option-python").click()
    expect(dropdowns.tid("searchable-dropdown-selected")).to_have_text("Python")


def test_dependent_dropdowns_country_state_city(page: Page):
    dropdowns = DropdownsPage(page).open()
    expect(dropdowns.tid("state-select")).to_be_disabled()
    expect(dropdowns.tid("country-select")).to_be_enabled()  # waits for the API

    dropdowns.choose_location("Canada", "Ontario", "Toronto")
    expect(dropdowns.tid("dependent-result")).to_have_text("Selected: Toronto, Ontario, Canada")

    # Changing the country resets the children.
    dropdowns.tid("country-select").select_option(label="India")
    expect(dropdowns.tid("city-select")).to_be_disabled()
    expect(dropdowns.tid("state-select")).to_be_enabled()
    expect(dropdowns.tid("state-select").locator("option")).to_have_text(
        ["Select a state", "Karnataka", "Maharashtra", "Telangana"]
    )


def test_autocomplete_suggestions(page: Page):
    dropdowns = DropdownsPage(page).open()
    dropdowns.autocomplete("ind", "Indonesia")
    expect(dropdowns.tid("autocomplete-result")).to_have_text("Indonesia")
    expect(dropdowns.tid("autocomplete-input")).to_have_value("Indonesia")
    expect(dropdowns.tid("autocomplete-list")).to_be_hidden()


def test_autocomplete_no_matches(page: Page):
    dropdowns = DropdownsPage(page).open()
    dropdowns.tid("autocomplete-input").press_sequentially("qqq", delay=50)
    expect(dropdowns.tid("autocomplete-no-results")).to_be_visible()

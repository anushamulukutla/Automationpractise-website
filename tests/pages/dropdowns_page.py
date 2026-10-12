from .base_page import BasePage


class DropdownsPage(BasePage):
    path = "/dropdowns.html"

    # Native selects
    def choose_fruit(self, label: str):
        self.tid("native-single-select").select_option(label=label)

    def choose_colours(self, values: list[str]):
        self.tid("native-multi-select").select_option(values)

    def choose_grouped(self, value: str):
        self.tid("grouped-select").select_option(value)

    # Custom (non-<select>) dropdowns
    def choose_custom(self, prefix: str, value: str):
        self.tid(f"{prefix}-trigger").click()
        self.tid(f"{prefix}-option-{value}").click()

    def search_and_choose(self, prefix: str, query: str, value: str):
        self.tid(f"{prefix}-trigger").click()
        self.tid(f"{prefix}-search").fill(query)
        self.tid(f"{prefix}-option-{value}").click()

    # Dependent dropdowns: each level is enabled only after its parent is chosen
    def choose_location(self, country: str, state: str, city: str):
        self.tid("country-select").select_option(label=country)
        self.tid("state-select").select_option(label=state)  # auto-waits until enabled
        self.tid("city-select").select_option(label=city)

    # Autocomplete
    def autocomplete(self, text: str, suggestion: str):
        field = self.tid("autocomplete-input")
        field.press_sequentially(text, delay=50)
        self.tid("autocomplete-suggestion").filter(has_text=suggestion).first.click()

    # Delayed options
    def load_delayed_options(self):
        self.tid("load-delayed-options-btn").click()

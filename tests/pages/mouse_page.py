from .base_page import BasePage


class MousePage(BasePage):
    path = "/mouse.html"

    def sortable_order(self) -> str:
        return self.tid("sortable-order").inner_text()

    def press_in_key_input(self, combo: str):
        field = self.tid("key-input")
        field.focus()
        field.press(combo)

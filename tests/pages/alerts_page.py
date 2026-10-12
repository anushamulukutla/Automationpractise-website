from playwright.sync_api import Page

from .base_page import BasePage


class AlertsPage(BasePage):
    path = "/alerts.html"

    def __init__(self, page: Page):
        super().__init__(page)
        self.last_dialog = {}

    def _on_next_dialog(self, accept: bool = True, text: str | None = None):
        """Register a one-shot handler BEFORE the action that triggers the dialog."""
        self.last_dialog = {}

        def handler(dialog):
            self.last_dialog = {"type": dialog.type, "message": dialog.message, "default": dialog.default_value}
            if accept:
                dialog.accept(text) if text is not None else dialog.accept()
            else:
                dialog.dismiss()

        self.page.once("dialog", handler)

    def trigger_alert(self):
        self._on_next_dialog()
        self.tid("js-alert-btn").click()

    def trigger_confirm(self, accept: bool):
        self._on_next_dialog(accept=accept)
        self.tid("js-confirm-btn").click()

    def trigger_prompt(self, text: str | None, accept: bool = True):
        self._on_next_dialog(accept=accept, text=text)
        self.tid("js-prompt-btn").click()

    def trigger_delayed_alert(self):
        self._on_next_dialog()
        self.tid("delayed-alert-btn").click()

    def open_page_load_alert(self):
        self._on_next_dialog()
        self.tid("onload-alert-link").click()

    # In-page modal, toasts, cookie banner
    def open_modal(self):
        self.tid("open-modal-btn").click()

    def show_toast(self, kind: str):
        self.tid(f"toast-{kind}-btn").click()

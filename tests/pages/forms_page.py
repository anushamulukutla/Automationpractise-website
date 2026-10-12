from playwright.sync_api import Locator

from .base_page import BasePage


class FormsPage(BasePage):
    path = "/forms.html"

    def fill_valid_registration(self, email: str = "qa.tester@example.com"):
        self.tid("reg-fullname-input").fill("Quinn Tester")
        self.tid("reg-email-input").fill(email)
        self.tid("reg-password-input").fill("Secret123")
        self.tid("reg-confirm-input").fill("Secret123")
        self.tid("reg-phone-input").fill("+1 555 123 4567")
        self.tid("reg-dob-input").fill("1990-05-20")
        self.tid("reg-gender-female").check()
        self.tid("reg-interest-api").check()
        self.tid("reg-newsletter-toggle").check()
        self.tid("reg-experience-slider").fill("12")
        self.tid("reg-bio-textarea").fill("I test things for a living.")
        self.tid("reg-terms-checkbox").check()
        self.tid("human-checkbox").check()

    def submit(self):
        self.tid("reg-submit-btn").click()

    @property
    def error_items(self) -> Locator:
        return self.tid("form-error-item")

    # Wizard
    def wizard_step1(self, email: str, password: str):
        self.tid("wizard-email-input").fill(email)
        self.tid("wizard-password-input").fill(password)
        self.tid("wizard-next-btn").click()

    def wizard_step2(self, name: str, country: str):
        self.tid("wizard-name-input").fill(name)
        self.tid("wizard-country-select").select_option(label=country)
        self.tid("wizard-next-btn").click()

"""Forms and validation."""
import re

from playwright.sync_api import Page, expect

from pages.forms_page import FormsPage


def test_empty_submit_shows_summary_and_field_errors(page: Page):
    forms = FormsPage(page).open()
    forms.submit()
    expect(forms.tid("form-error-summary")).to_be_visible()
    expect(forms.error_items.first).to_be_visible()
    expect(forms.tid("reg-fullname-error")).to_have_text("Full name must be at least 2 characters")
    expect(forms.tid("reg-email-error")).to_have_text("Email is required")
    expect(forms.tid("reg-gender-error")).to_have_text("Please choose an option")
    expect(forms.tid("reg-terms-error")).to_have_text("You must accept the terms")
    expect(forms.tid("human-error")).to_have_text("Please confirm you are human")
    expect(forms.tid("reg-fullname-input")).to_have_attribute("aria-invalid", "true")
    expect(forms.tid("registration-success")).to_be_hidden()


def test_inline_validation_on_blur_then_live_fix(page: Page):
    forms = FormsPage(page).open()
    email = forms.tid("reg-email-input")
    email.fill("not-an-email")
    email.blur()
    expect(forms.tid("reg-email-error")).to_have_text("Enter a valid email address")
    email.fill("someone@example.com")  # once an error is shown, typing re-validates live
    expect(forms.tid("reg-email-error")).to_have_text("")
    expect(email).not_to_have_attribute("aria-invalid", "true")


def test_password_rules_and_confirmation(page: Page):
    forms = FormsPage(page).open()
    forms.tid("reg-password-input").fill("weak")
    forms.tid("reg-password-input").blur()
    expect(forms.tid("reg-password-error")).to_contain_text("8+ characters")
    forms.tid("reg-password-input").fill("Secret123")
    forms.tid("reg-confirm-input").fill("Different1")
    forms.tid("reg-confirm-input").blur()
    expect(forms.tid("reg-confirm-error")).to_have_text("Passwords do not match")


def test_phone_regex_and_age_rule(page: Page):
    forms = FormsPage(page).open()
    forms.tid("reg-phone-input").fill("abc")
    forms.tid("reg-phone-input").blur()
    expect(forms.tid("reg-phone-error")).to_have_text("Enter a valid phone number")
    forms.tid("reg-dob-input").fill("2015-01-01")
    forms.tid("reg-dob-input").blur()
    expect(forms.tid("reg-dob-error")).to_have_text("You must be at least 18 years old")


def test_slider_and_bio_counter(page: Page):
    forms = FormsPage(page).open()
    forms.tid("reg-experience-slider").fill("15")
    expect(forms.tid("reg-experience-value")).to_have_text("15")
    forms.tid("reg-bio-textarea").fill("hello")
    expect(forms.tid("reg-bio-count")).to_have_text("5")


def test_successful_registration(page: Page):
    forms = FormsPage(page).open()
    forms.fill_valid_registration("quinn.tester@example.com")
    forms.submit()
    expect(forms.tid("registration-success")).to_have_text("Registration successful! Welcome, Quinn Tester.")
    expect(forms.tid("form-error-summary")).to_be_hidden()
    expect(forms.tid("reg-fullname-input")).to_have_value("")  # form was reset


def test_server_side_duplicate_email_error(page: Page):
    forms = FormsPage(page).open()
    forms.fill_valid_registration("admin@example.com")
    forms.submit()
    expect(forms.tid("reg-email-error")).to_have_text("Email is already registered")
    expect(forms.tid("form-error-summary")).to_contain_text("Registration failed")


def test_reset_form_clears_everything(page: Page):
    forms = FormsPage(page).open()
    forms.fill_valid_registration()
    forms.tid("reg-reset-btn").click()
    expect(forms.tid("reg-email-input")).to_have_value("")
    expect(forms.tid("reg-terms-checkbox")).not_to_be_checked()
    expect(forms.tid("reg-experience-value")).to_have_text("3")


def test_i_am_human_checkbox_is_required(page: Page):
    forms = FormsPage(page).open()
    forms.fill_valid_registration()
    forms.tid("human-checkbox").uncheck()
    forms.submit()
    expect(forms.tid("human-error")).to_have_text("Please confirm you are human")
    expect(forms.tid("registration-success")).to_be_hidden()


def test_wizard_happy_path(page: Page):
    forms = FormsPage(page).open()
    expect(forms.tid("wizard-step-indicator")).to_have_text("Step 1 of 3")
    forms.wizard_step1("wizard@example.com", "Secret123")
    expect(forms.tid("wizard-step-indicator")).to_have_text("Step 2 of 3")
    expect(forms.tid("wizard-step-1")).to_be_hidden()
    forms.wizard_step2("Wendy Wizard", "Canada")
    expect(forms.tid("wizard-step-indicator")).to_have_text("Step 3 of 3")
    expect(forms.tid("summary-email")).to_have_text("wizard@example.com")
    expect(forms.tid("summary-country")).to_have_text("Canada")
    forms.tid("wizard-submit-btn").click()
    expect(forms.tid("wizard-success")).to_contain_text("Account created for wizard@example.com")


def test_wizard_blocks_next_until_valid_and_back_keeps_values(page: Page):
    forms = FormsPage(page).open()
    forms.tid("wizard-next-btn").click()
    expect(forms.tid("wizard-email-error")).to_have_text("Enter a valid email address")
    expect(forms.tid("wizard-step-indicator")).to_have_text("Step 1 of 3")

    forms.wizard_step1("back@example.com", "Secret123")
    forms.tid("wizard-next-btn").click()  # step 2 is empty
    expect(forms.tid("wizard-country-error")).to_have_text("Please choose a country")
    forms.tid("wizard-back-btn").click()
    expect(forms.tid("wizard-email-input")).to_have_value("back@example.com")

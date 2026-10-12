"""Auth and sessions: login states, JWT, timeout, remember me, protected page, storage viewer."""
import re

import pytest
from playwright.sync_api import Page, expect

from pages.auth_page import AuthPage


def test_valid_login_and_logout(page: Page):
    auth = AuthPage(page).open()
    auth.login("admin", "Admin@123")
    expect(auth.tid("session-panel")).to_be_visible()
    expect(auth.tid("login-success")).to_have_text("Logged in as admin")
    expect(auth.tid("session-role")).to_have_text("admin")
    expect(auth.tid("session-countdown")).to_contain_text("Expires in")
    expect(auth.tid("login-panel")).to_be_hidden()

    auth.logout()
    expect(auth.tid("login-panel")).to_be_visible()
    expect(auth.tid("session-panel")).to_be_hidden()


@pytest.mark.parametrize(
    "username, password, code, message",
    [
        ("admin", "wrong-password", "invalid_credentials", "Invalid username or password"),
        ("locked", "Locked@123", "account_locked", "Account is locked"),
        ("inactive", "Inactive@123", "account_inactive", "Account is inactive"),
        ("expired", "Expired@123", "password_expired", "Password has expired"),
        ("nobody", "Nope@123", "invalid_credentials", "Invalid username or password"),
    ],
    ids=["wrong-password", "locked", "inactive", "expired-password", "unknown-user"],
)
def test_login_failures(page: Page, username, password, code, message):
    auth = AuthPage(page).open()
    auth.login(username, password)
    expect(auth.tid("login-error")).to_have_text(message)
    expect(auth.tid("login-error")).to_have_attribute("data-code", code)
    expect(auth.tid("session-panel")).to_be_hidden()


def test_login_requires_both_fields(page: Page):
    auth = AuthPage(page).open()
    auth.tid("login-submit-btn").click()
    expect(auth.tid("login-error")).to_have_text("Username and password are required")


def test_quick_fill_buttons(page: Page):
    auth = AuthPage(page).open()
    auth.tid("fill-locked-btn").click()
    expect(auth.tid("login-username-input")).to_have_value("locked")
    auth.tid("login-submit-btn").click()
    expect(auth.tid("login-error")).to_have_attribute("data-code", "account_locked")


def test_remember_me_sets_cookie_and_prefills_username(page: Page):
    auth = AuthPage(page).open()
    auth.login("standard", "User@123", remember=True)
    expect(auth.tid("session-remembered")).to_contain_text("yes")
    cookies = {c["name"]: c for c in page.context.cookies()}
    assert cookies["remember_user"]["value"] == "standard"
    assert page.evaluate("localStorage.getItem('qa_session') !== null")

    page.reload()  # session persists (localStorage) and the cookie is still there
    expect(auth.tid("session-panel")).to_be_visible()
    auth.logout()
    expect(auth.tid("login-username-input")).to_have_value("standard")
    expect(auth.tid("login-remember-checkbox")).to_be_checked()


def test_without_remember_me_session_lives_in_session_storage(page: Page):
    auth = AuthPage(page).open()
    auth.login("standard", "User@123")
    assert page.evaluate("sessionStorage.getItem('qa_session') !== null")
    assert page.evaluate("localStorage.getItem('qa_session') === null")
    assert "remember_user" not in {c["name"] for c in page.context.cookies()}


def test_protected_page_redirects_to_login_then_back(page: Page):
    page.goto("/protected.html")
    expect(page).to_have_url(re.compile(r"/auth\.html\?reason=login_required"))
    auth = AuthPage(page)
    expect(auth.tid("redirect-notice")).to_have_text("You must log in to view that page.")

    auth.login("standard", "User@123")
    expect(page).to_have_url(re.compile(r"/protected\.html$"))
    expect(page.get_by_test_id("protected-welcome")).to_have_text("Welcome, standard!")
    expect(page.get_by_test_id("protected-secret")).to_be_visible()


def test_logout_from_protected_page_locks_it_again(page: Page):
    auth = AuthPage(page).open()
    auth.login("admin", "Admin@123")
    page.get_by_test_id("protected-page-link").click()
    expect(page.get_by_test_id("protected-role")).to_have_text("admin")
    page.get_by_test_id("protected-logout-btn").click()
    expect(page).to_have_url(re.compile(r"/auth\.html$"))
    page.goto("/protected.html")
    expect(page).to_have_url(re.compile(r"reason=login_required"))


def test_session_times_out(page: Page):
    auth = AuthPage(page).open()
    auth.login("admin", "Admin@123", session_seconds=5)
    expect(auth.tid("session-panel")).to_be_visible()
    expect(auth.tid("session-expired-message")).to_be_visible(timeout=9_000)
    expect(auth.tid("login-panel")).to_be_visible()
    page.goto("/protected.html")
    expect(page).to_have_url(re.compile(r"reason=login_required"))


def test_jwt_api_login_decodes_claims_and_calls_me(page: Page):
    auth = AuthPage(page).open()
    auth.tid("jwt-login-btn").click()
    expect(auth.tid("jwt-token")).to_contain_text("eyJ")
    expect(auth.tid("jwt-payload")).to_contain_text('"username": "admin"')
    auth.tid("jwt-me-btn").click()
    expect(auth.tid("jwt-status")).to_have_text("Valid token: HTTP 200")
    expect(auth.tid("jwt-me-result")).to_contain_text("admin@example.com")


def test_jwt_bad_token_is_rejected(page: Page):
    auth = AuthPage(page).open()
    auth.tid("jwt-bad-btn").click()
    expect(auth.tid("jwt-status")).to_have_text("Bad token: HTTP 401")
    expect(auth.tid("jwt-me-result")).to_contain_text("invalid_token")


def test_storage_viewer_shows_added_entries_and_clears(page: Page):
    auth = AuthPage(page).open()
    expect(auth.tid("storage-empty")).to_have_count(3)  # one "empty" row per table
    auth.tid("add-cookie-btn").click()
    auth.tid("add-local-btn").click()
    auth.tid("add-session-btn").click()
    expect(auth.tid("cookies-body").get_by_test_id("storage-key")).to_have_text(["test_cookie_1"])
    expect(auth.tid("local-storage-body").get_by_test_id("storage-value")).to_have_text(["value_2"])
    expect(auth.tid("session-storage-body").get_by_test_id("storage-key")).to_have_text(["test_session_3"])
    auth.tid("clear-storage-btn").click()
    expect(auth.tid("storage-empty")).to_have_count(3)

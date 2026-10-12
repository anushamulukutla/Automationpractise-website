"""Shared fixtures.

The app must be running first (npm start). Set BASE_URL to point at another host/port.
"""
import os
import urllib.request

import pytest

BASE_URL = os.getenv("BASE_URL", "http://localhost:3000").rstrip("/")


@pytest.fixture(scope="session")
def base_url():
    # Overrides pytest-base-url, so page.goto("/alerts.html") resolves against the app.
    return BASE_URL


@pytest.fixture(autouse=True)
def reset_app_state(base_url):
    """Restore the clean seeded data and default toggles before every test."""
    request = urllib.request.Request(f"{base_url}/api/reset", method="POST", data=b"")
    with urllib.request.urlopen(request, timeout=10) as response:
        assert response.status == 200


@pytest.fixture()
def api(playwright, base_url):
    """Browser-less HTTP client for API tests."""
    context = playwright.request.new_context(base_url=base_url)
    yield context
    context.dispose()


def login(api, username="admin", password="Admin@123", **extra):
    return api.post("/api/auth/login", data={"username": username, "password": password, **extra})


@pytest.fixture()
def admin_headers(api):
    token = login(api).json()["token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def user_headers(api):
    token = login(api, "standard", "User@123").json()["token"]
    return {"Authorization": f"Bearer {token}"}

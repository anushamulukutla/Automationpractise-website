"""Test data endpoints, using Playwright's APIRequestContext (no browser needed)."""
import io
import zipfile

from playwright.sync_api import APIRequestContext, Playwright
import pytest


@pytest.fixture()
def api(playwright: Playwright, base_url) -> APIRequestContext:
    context = playwright.request.new_context(base_url=base_url)
    yield context
    context.dispose()


def test_health(api):
    response = api.get("/health")
    assert response.ok
    assert response.json()["status"] == "ok"


def test_reset_restores_seed_data(api):
    api.post("/api/testdata/generate", data={"type": "users", "count": 5})
    assert api.get("/api/testdata/summary").json()["counts"]["users"] == 10

    assert api.post("/api/reset").ok
    summary = api.get("/api/testdata/summary").json()
    assert summary["counts"] == {"users": 5, "products": 20, "orders": 10, "addresses": 5}
    assert {u["username"] for u in summary["seedUsers"]} >= {"admin", "standard", "locked", "inactive"}


def test_generate_validates_input(api):
    assert api.post("/api/testdata/generate", data={"type": "cats", "count": 3}).status == 400
    assert api.post("/api/testdata/generate", data={"type": "users", "count": 0}).status == 400
    created = api.post("/api/testdata/generate", data={"type": "products", "count": 3})
    assert created.status == 201
    assert len(created.json()["items"]) == 3


def test_export_csv_and_import_round_trip(api):
    csv_text = api.get("/api/testdata/export?type=users&format=csv").text()
    assert csv_text.splitlines()[0].startswith("id,username,email")

    imported = api.post(
        "/api/testdata/import?type=users",
        headers={"Content-Type": "text/csv"},
        data="username,email,status\nnew.user,new@example.com,active\nadmin,dup@example.com,active\n",
    )
    body = imported.json()
    assert body["imported"] == 1
    assert body["errors"][0]["row"] == 3


def test_sample_files_pack_contents(api):
    response = api.get("/api/testdata/sample-files.zip")
    assert response.ok
    names = zipfile.ZipFile(io.BytesIO(response.body())).namelist()
    assert "valid/sample.pdf" in names and "invalid/too-large.pdf" in names


def test_flaky_mode_returns_503_and_reset_clears_it(api):
    api.put("/api/settings", data={"flakyMode": True, "flakyRate": 1})
    assert api.get("/api/countries").status == 503
    assert api.post("/api/reset").ok  # reset is never flaky
    assert api.get("/api/countries").ok

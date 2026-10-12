"""REST API tests with pytest + Playwright's APIRequestContext (no browser). Run: pytest test_rest_api.py"""
import time

import pytest
from playwright.sync_api import Page, expect

from conftest import login


# ---------------------------------------------------------------- auth
def test_login_returns_jwt_and_user(api):
    response = login(api)
    assert response.status == 200
    body = response.json()
    assert body["tokenType"] == "Bearer" and body["token"].count(".") == 2
    assert body["user"]["username"] == "admin" and "password" not in body["user"]


@pytest.mark.parametrize(
    "username, password, status, code",
    [("admin", "bad", 401, "invalid_credentials"), ("locked", "Locked@123", 423, "account_locked"),
     ("inactive", "Inactive@123", 403, "account_inactive"), ("expired", "Expired@123", 403, "password_expired")],
)
def test_login_error_statuses(api, username, password, status, code):
    response = login(api, username, password)
    assert response.status == status
    assert response.json()["code"] == code


def test_login_missing_fields_is_400(api):
    assert api.post("/api/auth/login", data={"username": "admin"}).status == 400


def test_protected_endpoint_needs_a_valid_token(api, admin_headers):
    assert api.get("/api/users").status == 401
    assert api.get("/api/users", headers={"Authorization": "Bearer nope"}).json()["code"] == "invalid_token"
    assert api.get("/api/users", headers=admin_headers).status == 200


def test_expired_token_is_rejected(api):
    token = login(api, expiresIn=1).json()["token"]
    time.sleep(2.2)
    response = api.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status == 401 and response.json()["code"] == "token_expired"


# ---------------------------------------------------------------- users CRUD
def test_users_crud_lifecycle(api, admin_headers):
    created = api.post("/api/users", headers=admin_headers, data={"username": "neo", "email": "neo@example.com"})
    assert created.status == 201
    user = created.json()
    assert created.headers["location"] == f"/api/users/{user['id']}"
    assert "password" not in user

    assert api.get(f"/api/users/{user['id']}", headers=admin_headers).json()["email"] == "neo@example.com"

    patched = api.patch(f"/api/users/{user['id']}", headers=admin_headers, data={"phone": "555-0000"})
    assert patched.status == 200 and patched.json()["phone"] == "555-0000" and patched.json()["username"] == "neo"

    replaced = api.put(f"/api/users/{user['id']}", headers=admin_headers, data={"username": "trinity", "email": "t@example.com"})
    assert replaced.status == 200 and replaced.json()["phone"] == ""  # PUT resets omitted fields

    assert api.delete(f"/api/users/{user['id']}", headers=admin_headers).status == 204
    assert api.get(f"/api/users/{user['id']}", headers=admin_headers).status == 404


def test_users_validation_and_conflicts(api, admin_headers):
    bad = api.post("/api/users", headers=admin_headers, data={"username": "x", "email": "nope"})
    assert bad.status == 400 and len(bad.json()["details"]) == 2
    assert api.put("/api/users/1", headers=admin_headers, data={"username": "only-name"}).status == 400
    dup = api.post("/api/users", headers=admin_headers, data={"username": "admin", "email": "other@example.com"})
    assert dup.status == 409


def test_only_admin_can_delete_users(api, user_headers, admin_headers):
    assert api.delete("/api/users/3", headers=user_headers).status == 403
    assert api.delete("/api/users/3", headers=admin_headers).status == 204


def test_unknown_id_is_404(api, admin_headers):
    for path in ("/api/users/9999", "/api/products/9999", "/api/orders/9999", "/api/users/abc"):
        assert api.get(path, headers=admin_headers).status == 404


# ---------------------------------------------------------------- list features
def test_pagination(api, admin_headers):
    page1 = api.get("/api/products?limit=8&page=1").json()
    assert page1["total"] == 20 and page1["totalPages"] == 3 and len(page1["data"]) == 8
    page3 = api.get("/api/products?limit=8&page=3").json()
    assert len(page3["data"]) == 4
    assert {p["id"] for p in page1["data"]}.isdisjoint({p["id"] for p in page3["data"]})


@pytest.mark.parametrize("query", ["page=0", "limit=0", "limit=101", "limit=abc", "order=sideways", "sort=nonexistent"])
def test_bad_query_parameters_are_400(api, query):
    assert api.get(f"/api/products?{query}").status == 400


def test_sorting(api):
    asc = [p["price"] for p in api.get("/api/products?limit=20&sort=price&order=asc").json()["data"]]
    desc = [p["price"] for p in api.get("/api/products?limit=20&sort=price&order=desc").json()["data"]]
    assert asc == sorted(asc) and desc == sorted(desc, reverse=True)


def test_filtering_and_search(api, admin_headers):
    admins = api.get("/api/users?role=admin", headers=admin_headers).json()
    assert admins["total"] == 1 and admins["data"][0]["username"] == "admin"
    assert api.get("/api/users?status=locked", headers=admin_headers).json()["total"] == 1
    assert api.get("/api/users?q=STANDARD", headers=admin_headers).json()["total"] == 1
    cheap = api.get("/api/products?maxPrice=100&limit=100").json()["data"]
    assert cheap and all(p["price"] <= 100 for p in cheap)


# ---------------------------------------------------------------- products and orders
def test_products_are_public_to_read_but_not_to_write(api, admin_headers):
    assert api.get("/api/products").status == 200
    assert api.post("/api/products", data={"name": "Widget", "price": 9.5}).status == 401
    created = api.post("/api/products", headers=admin_headers, data={"name": "Widget", "price": 9.5})
    assert created.status == 201 and created.json()["stock"] == 0
    assert api.post("/api/products", headers=admin_headers, data={"name": "Bad", "price": -1}).status == 400


def test_order_total_is_calculated_from_product_prices(api, admin_headers):
    product = api.get("/api/products/1").json()
    created = api.post("/api/orders", headers=admin_headers, data={"userId": 1, "items": [{"productId": 1, "quantity": 3}]})
    assert created.status == 201
    order = created.json()
    assert order["status"] == "pending" and order["total"] == round(product["price"] * 3, 2)
    shipped = api.patch(f"/api/orders/{order['id']}", headers=admin_headers, data={"status": "shipped"})
    assert shipped.json()["status"] == "shipped"
    assert api.delete(f"/api/orders/{order['id']}", headers=admin_headers).status == 204


def test_order_validation(api, admin_headers):
    response = api.post("/api/orders", headers=admin_headers, data={"userId": 99, "items": [{"productId": 999, "quantity": 0}]})
    assert response.status == 400
    assert len(response.json()["details"]) == 2
    assert api.post("/api/orders", headers=admin_headers, data={"userId": 1, "items": []}).status == 400


# ---------------------------------------------------------------- resilience
def test_slow_endpoint_respects_ms(api):
    start = time.perf_counter()
    response = api.get("/slow?ms=700")
    assert response.ok and time.perf_counter() - start >= 0.65
    assert api.get("/slow?ms=99999").status == 400


def test_flaky_endpoint_extremes_and_retry_pattern(api):
    assert api.get("/flaky?rate=1").status == 500
    assert api.get("/flaky?rate=0").status == 200
    # Retry until it works: with a 50% failure rate 12 attempts all failing is a 1 in 4096 event.
    statuses = []
    for _ in range(12):
        statuses.append(api.get("/flaky?rate=0.5").status)
        if statuses[-1] == 200:
            break
    assert statuses[-1] == 200


@pytest.mark.parametrize("code", [200, 201, 204, 400, 401, 404, 418, 500, 503])
def test_status_endpoint_echoes_any_code(api, code):
    assert api.get(f"/status/{code}").status == code


def test_flaky_mode_setting_affects_api_calls(api):
    api.put("/api/settings", data={"flakyMode": True, "flakyRate": 1})
    assert api.get("/api/products").status == 503
    assert api.get("/health").ok  # /health is never affected
    assert api.post("/api/reset").ok


# ---------------------------------------------------------------- upload API, docs, reset
def test_upload_api_rules(api):
    def upload(name, data, mime="application/octet-stream"):
        return api.post("/api/upload", multipart={"files": {"name": name, "mimeType": mime, "buffer": data}})

    assert upload("ok.pdf", b"%PDF-1.4 x").status == 201
    assert upload("bad.txt", b"hello").status == 415
    assert upload("big.pdf", b"%PDF" + b" " * (2 * 1024 * 1024)).status == 413
    assert upload("empty.csv", b"").status == 400
    assert upload("fake.png", b"not a png").status == 415
    assert api.post("/api/upload").status == 400  # no files at all
    assert api.get("/api/uploads").json()["total"] == 1


def test_openapi_document_and_swagger_ui(api, page: Page):
    spec = api.get("/openapi.json").json()
    assert spec["openapi"].startswith("3.") and "/api/users/{id}" in spec["paths"]
    assert set(spec["paths"]["/api/users/{id}"]) >= {"get", "put", "patch", "delete"}
    page.goto("/docs")
    expect(page.locator(".swagger-ui .info .title")).to_contain_text("QA Practice App API", timeout=15_000)
    expect(page.locator(".opblock-tag", has_text="Users")).to_be_visible()


def test_reset_restores_default_users_and_products(api, admin_headers):
    api.post("/api/users", headers=admin_headers, data={"username": "temp", "email": "temp@example.com"})
    api.post("/api/reset")
    token = login(api).json()["token"]
    total = api.get("/api/users", headers={"Authorization": f"Bearer {token}"}).json()["total"]
    assert total == 5


def test_rest_api_page_console(page: Page):
    page.goto("/rest-api.html")
    page.get_by_test_id("get-token-btn").click()
    expect(page.get_by_test_id("token-status")).to_contain_text("Token filled in")
    page.get_by_test_id("send-request-btn").click()
    expect(page.get_by_test_id("response-status")).to_have_text("200 OK")
    expect(page.get_by_test_id("response-body")).to_contain_text('"totalPages"')
    page.get_by_test_id("request-token-input").fill("")
    page.get_by_test_id("send-request-btn").click()
    expect(page.get_by_test_id("response-status")).to_contain_text("401")

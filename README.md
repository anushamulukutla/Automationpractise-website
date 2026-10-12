# QA Automation Practice App

A local web app for practicing and demoing UI and API test automation. It works with Playwright, Selenium and Cypress: every interactive element has a stable `data-testid`, and pages marked **tricky** add dynamic IDs and delays so you can practice resilient locators.

> **Status: complete.** All 12 pages, the REST API with Swagger, test data tooling, Docker and 169 sample Playwright tests are included.

## Quick start

Requires Node.js 18 or newer.

```bash
npm install
npm start            # http://localhost:3000
```

Or with Docker:

```bash
docker compose up --build
```

Check it is up: `curl http://localhost:3000/health`

Change the port with `PORT=4000 npm start`.

## Folder structure

```
qa-practice-app/
├── server.js                 Express app: middleware, routes, redirect chain, settings injection
├── src/
│   ├── jwt.js, auth.js       HS256 JWT helper and the bearer-token middleware
│   ├── openapi.js            OpenAPI 3 description served at /openapi.json and /docs
│   ├── files.js              Sample file generators (PDF, PNG, CSV)
│   ├── state.js              In-memory store, global settings, reset()
│   ├── seed.js               Default dataset (deterministic) and seed credentials
│   ├── csv.js                CSV writer and parser
│   ├── data/geo.js           Country / state / city data and autocomplete names
│   └── routes/
│       ├── core.js           /api/settings, /api/reset
│       ├── auth.js           POST /api/auth/login (JWT), /api/auth/me, /api/register
│       ├── rest.js           /api/users, /api/products, /api/orders CRUD with pagination, filter, sort
│       ├── util.js           /slow, /flaky, /status/:code (also mounted at /api/...)
│       ├── files.js          Upload (validation), uploaded list, downloads
│       ├── dynamic.js        Infinite scroll items, delayed table data, 120-row table data
│       ├── geo.js            Dropdown endpoints (countries, states, cities, autocomplete, delayed options)
│       └── testdata.js       Generate, export, import, sample files zip
├── public/                   Static frontend (plain HTML, CSS and JS, no build step)
│   ├── *.html                One page per topic
│   ├── frames/               Documents loaded inside iframes
│   ├── windows/              Documents opened as tabs, popups and child windows
│   ├── js/                   layout.js (sidebar, helpers) plus one script per page
│   └── css/styles.css
├── scripts/
│   ├── seed.js               Print or export the default dataset, or reset a running server
│   └── gen-testids.js        Regenerates the data-testid tables in this README
├── tests/                    Playwright (Python + pytest, Page Object Model) sample tests
├── Dockerfile
└── docker-compose.yml
```

## Pages

| Page | URL | What is on it |
| --- | --- | --- |
| Alerts and Dialogs | `/alerts.html` | JS alert, confirm and prompt (each shows its result), alert after 5 s, alert on page load (`/alerts-onload.html`), Bootstrap-style modal, auto-dismissing toasts, cookie banner |
| Iframes | `/iframes.html` | Single iframe with a form, nested iframes (3 levels), iframe with dynamic content, iframe with dynamic ID and name, sandboxed iframe, parent buttons that update the iframe |
| Windows and Tabs | `/windows.html` | `target=_blank` link, popup via `window.open` with a size, three tabs from one click, child window that posts data back, 3-hop redirect chain, same-tab link |
| Dropdowns and Selects | `/dropdowns.html` | Native single and multi select, optgroup, custom div dropdown, searchable dropdown, dependent Country / State / City from the API, autocomplete, options that load after 3 s |
| Dynamic Elements | `/dynamic.html` | Random id and class on every load, element that appears or disappears, button enabled after a delay, spinner and skeleton with an AJAX table, infinite scroll, stale element (DOM re-render), lazy-loaded section, add and remove elements, dynamic table rows, progress bar |
| File Upload and Download | `/files.html` | Single, multiple, drag-and-drop and progress-bar uploads, validation (2 MB, pdf / png / csv, content check), uploaded files list with delete, PDF / CSV / image downloads, delayed download |
| Forms and Validation | `/forms.html` | Registration form (text, email, password, phone, date, radio, checkboxes, toggle, slider, textarea), inline and on-submit validation, server-side duplicate email, "I am human" checkbox, 3-step wizard |
| Tables and Pagination | `/tables.html` | 120 rows: sort, text and department filter, 10 / 25 / 50 per page, pagination, row selection and select all, expandable rows, inline cell editing |
| Mouse and Keyboard | `/mouse.html` | Hover menu and tooltip, right-click menu, double-click, drag and drop, sortable list (drag or Alt+Arrow), key display, keyboard shortcuts, scroll into view |
| Auth and Sessions | `/auth.html`, `/protected.html` | Login for valid, invalid, locked, inactive and expired-password users, remember me (cookie), session timeout, protected page redirect, JWT API login, cookies / localStorage / sessionStorage viewer |
| Advanced | `/advanced.html` | Open and closed shadow DOM, canvas, SVG, broken links and images checker, geolocation and notification prompts, HTTP basic auth (`/basic-auth`, admin / admin), console-error page |
| REST API | `/rest-api.html`, `/docs` | Endpoint overview, request console, delay and failure buttons, Swagger UI at `/docs`, OpenAPI JSON at `/openapi.json` |
| Test Data | `/testdata.html` | Counts, seed credentials, generate / export / import, reset, sample files zip |
| Settings | `/settings.html` | Slow network, flaky mode, randomize IDs, reset |

### Tricky variants

| Where | What makes it tricky |
| --- | --- |
| Alerts: delayed alert | Fires 5 s after the click, so the handler must be registered first |
| Alerts: page-load alert | Fires during navigation, before you can interact |
| Alerts: cookie banner | Appears about 1 s after load |
| Iframes: dynamic content | Content shows "Loading..." for 2 s after every load |
| Iframes: dynamic ID and name | `id` and `name` change on each load; locate by `data-testid` or title |
| Dropdowns: delayed options | Options arrive 3 s after you ask for them |
| Dynamic: random id | The button's `id` and class change on every load, always |
| Dynamic: stale element | Clicking an item rebuilds the whole list, so saved element handles go stale |
| Dynamic: delayed button / element | Enabled after 4 s; appearing element after N seconds |
| Dynamic: infinite scroll | 500 ms latency per page, 50 items in total |
| Files: upload with progress | Server takes 2 s, so you can watch the progress bar and the disabled button |
| Files: delayed download | The file arrives 3 s after the click |
| Auth: session timeout | Choose a short session (5 s minimum) and wait for it to expire |
| Advanced: closed shadow root | Cannot be reached from scripts; test through the visible effect |
| Settings: Randomize IDs | Every `id` inside the page gets a new random suffix and class on each load |

## Settings (global QA toggles)

| Toggle | Effect |
| --- | --- |
| Slow network | Adds latency (default 1500 ms) to every API call |
| Flaky mode | API calls fail with HTTP 503 at the chosen rate (default 30%) |
| Randomize IDs | New random `id` values and a random class on every element id, on each page load. `label[for]` and `aria-*` references are rewritten to match; `data-testid` never changes |

When any toggle is on, a banner at the top of each page says so (`mode-banner`). `/health`, `/api/settings` and `/api/reset` are never slowed or failed, so a test can always get back to a clean state. Settings live in server memory and return to the defaults on reset.

## Test data management

* **Reset:** `POST /api/reset` restores the default dataset and the default toggles. Add `?keepSettings=true` to leave the toggles alone. Call it before each test run (the sample tests do this in an autouse fixture).
* **Default dataset** (the same every time): 5 users, 20 products, 10 orders, 5 addresses.
* **Seed script:** `npm run seed` prints the dataset. `node scripts/seed.js --out seed.json` writes it to a file and `node scripts/seed.js --url http://localhost:3000` resets a running server.

| Username | Password | Role | Status |
| --- | --- | --- | --- |
| `admin` | `Admin@123` | admin | active |
| `standard` | `User@123` | user | active |
| `locked` | `Locked@123` | user | locked |
| `inactive` | `Inactive@123` | user | inactive |
| `expired` | `Expired@123` | user | expired-password |

The `expired` user is an extra, added for the expired-password login scenario planned for the Auth page.

### Test data endpoints

| Method and path | Purpose |
| --- | --- |
| `GET /api/testdata/summary` | Record counts and seed credentials |
| `POST /api/testdata/generate` | Body `{"type":"users\|products\|addresses","count":1-500,"persist":true}`. Returns 201 with the generated items (faker) |
| `GET /api/testdata/export?type=users&format=json\|csv` | Download current data |
| `POST /api/testdata/import?type=users` | Body is raw CSV (`Content-Type: text/csv`). Returns `{imported, skipped, errors:[{row,message}]}` |
| `GET /api/testdata/sample-files.zip` | Valid and invalid files for upload tests (see the README inside the zip) |

CSV columns: users need `username,email` (optional `password,firstName,lastName,role,status,phone`); products need `name,price` (optional `category,stock,sku`); addresses need `street,city,country` (optional `state,zip`).

### Other endpoints

| Method and path | Purpose |
| --- | --- |
| `GET /health` | `{"status":"ok", ...}` |
| `GET /api/settings`, `PUT /api/settings` | Read or partially update the toggles |
| `GET /api/countries`, `/api/countries/:code/states`, `/api/countries/:code/states/:state/cities` | Dependent dropdown data |
| `GET /api/autocomplete?q=ind` | Typeahead suggestions |
| `GET /api/delayed-options?ms=3000` | Options returned after a delay (max 10 s) |
| `POST /api/auth/login` | Body `{username, password, expiresIn?}`. Returns a JWT. 401 wrong credentials, 403 inactive or expired password, 423 locked |
| `GET /api/auth/me` | Current user (needs `Authorization: Bearer <token>`) |
| `POST /api/register` | Used by the Forms page. 201 / 400 / 409 (try `admin@example.com`) |
| `POST /api/upload` | Multipart field `files`. 201 / 400 / 413 / 415. `?delay=ms` slows the response |
| `GET /api/uploads`, `DELETE /api/uploads/:id` | List and remove uploaded files |
| `GET /api/download/pdf\|csv\|image`, `GET /api/download/delayed?ms=3000` | Sample downloads |
| `GET /api/dynamic/items`, `/api/dynamic/people`, `/api/table-data` | Data for the Dynamic Elements and Tables pages |
| `GET /redirect/1` | Redirects to `/redirect/2`, then `/redirect/3`, then the landing page |

## REST API

Interactive docs: `/docs` (Swagger UI) and `/openapi.json` (import into Postman). Log in with `POST /api/auth/login` and send `Authorization: Bearer <token>`.

| Resource | Methods | Auth |
| --- | --- | --- |
| `/api/users`, `/api/users/:id` | GET, POST, PUT, PATCH, DELETE | token; DELETE needs the `admin` role (403 for `standard`) |
| `/api/products`, `/api/products/:id` | GET, POST, PUT, PATCH, DELETE | GET is public; writes need a token |
| `/api/orders`, `/api/orders/:id` | GET, POST, PUT, PATCH, DELETE | token |
| `/slow?ms=3000` | GET | none. Responds after the delay (max 30 s) |
| `/flaky?rate=0.5` | GET | none. Fails with 500 at the given rate |
| `/status/:code` | GET | none. Responds with that status |

* **List endpoints:** `page`, `limit` (1 to 100), `sort`, `order=asc|desc`, `q` (text search) and filters (`role`, `status`, `category`, `minPrice`, `maxPrice`, `userId`). The response is `{data, page, limit, total, totalPages}`.
* **Status codes used:** 200, 201 (with a `Location` header), 204, 400 (with `details`), 401 (`code` is `missing_token`, `invalid_token` or `token_expired`), 403, 404, 409 (duplicate user), 413, 415, 423, 500 (`/flaky`), 503 (Flaky mode).
* **PUT vs PATCH:** PUT needs all required fields and resets omitted optional ones; PATCH changes only what you send.
* **Orders:** send `{userId, items:[{productId, quantity}]}`; the server computes `total` from product prices.
* `/slow` and `/flaky` work with and without the `/api` prefix. The Settings toggles (slow network, flaky mode) apply to everything under `/api` except settings and reset.

## data-testid conventions

* Lower-case words separated by hyphens: `<feature>-<element>-<type>`, for example `login-submit-btn`.
* Suffixes: `-btn`, `-link`, `-input`, `-select`, `-toggle`, `-result` (text that shows an outcome), `-status`, `-list`, `-title`.
* Test IDs are stable: they do not change with Randomize IDs or between reloads.
* Repeated items share a prefix, for example `custom-dropdown-option-<value>` or `toast-success`. Entries marked "pattern" in the tables below are generated per item.

## Accessibility and responsive layout

Form controls have labels, status text uses `role="status"` / `aria-live`, dialogs have `role="dialog"` and `aria-modal`, custom dropdowns use `combobox` / `listbox` / `option` roles with keyboard support, and there is a skip link and a landmark structure (`nav`, `main`). Below 800 px wide the sidebar collapses behind a Menu button (`nav-toggle-btn`).

## Sample automation tests (Playwright, Python, pytest, Page Object Model)

```bash
cd tests
python -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements.txt
playwright install chromium
# with the app running in another terminal (npm start):
pytest                         # headless
pytest --headed --slowmo 300   # watch it run
BASE_URL=http://localhost:4000 pytest
```

| File | Covers |
| --- | --- |
| `test_alerts.py` | Alert, confirm, prompt, delayed alert, page-load alert, modal, toasts, cookie banner |
| `test_iframes.py` | Frame locators: form, 3 nested levels, dynamic content, parent-to-frame updates, dynamic ID, sandboxed |
| `test_windows.py` | New tab, popup, three tabs, child-to-parent data, redirect chain, same tab |
| `test_dropdowns.py` | Native, multi, optgroup, custom, keyboard, searchable, dependent, autocomplete |
| `test_dynamic_wait.py` | Delayed options, slow network toggle, randomized IDs (web-first assertions, no fixed sleeps) |
| `test_dynamic_elements.py` | Random ids, appear / disappear, delayed button, spinner and AJAX table, infinite scroll, stale element, lazy section, add / remove, progress bar |
| `test_file_upload.py` | Single, multiple, drop zone, progress bar, client and server validation, delete, downloads (PDF, CSV, image, delayed) |
| `test_forms.py` | Required fields, inline validation, password and phone rules, slider, success and duplicate email, "I am human", wizard |
| `test_tables.py` | Pagination, page size, sorting, filters, selection, expandable rows, inline edit |
| `test_mouse_keyboard.py` | Hover, tooltip, context menu, double-click, drag and drop, sortable list, key display, shortcuts, scroll into view |
| `test_auth.py` | Login states, remember me, protected page redirect, session timeout, JWT, storage viewer |
| `test_advanced.py` | Shadow DOM, canvas, SVG, link checker, permissions, basic auth, console errors |
| `test_rest_api.py` | JWT, CRUD, status codes, pagination, sort, filter, order totals, /slow, /flaky, upload API, OpenAPI and Swagger UI |
| `test_test_data_api.py` | Health, reset, generate, CSV export and import, sample zip, flaky mode (API only) |

Page objects live in `tests/pages/`. They locate everything by `data-testid`, and `conftest.py` resets the app before every test. The suite has 169 tests and takes about 2.5 minutes. Run a single file with `pytest test_file_upload.py`.

Notes for other tools: Selenium and Cypress can use the same `data-testid` attributes (`[data-testid="login-submit-btn"]`). A regular browser may block more than one tab opened from a single click; automation browsers normally do not.

## data-testid reference

Generated from the source by `npm run docs:testids`; do not edit between the markers.

<!-- TESTIDS:START -->

### Every page (layout)

| data-testid | Element |
| --- | --- |
| `app-brand` | span |
| `nav-toggle-btn` | button |
| `sidebar-nav` | ul |
| `nav-home` | a (sidebar link) |
| `nav-alerts` | a (sidebar link) |
| `nav-iframes` | a (sidebar link) |
| `nav-windows` | a (sidebar link) |
| `nav-dropdowns` | a (sidebar link) |
| `nav-dynamic` | a (sidebar link) |
| `nav-files` | a (sidebar link) |
| `nav-forms` | a (sidebar link) |
| `nav-tables` | a (sidebar link) |
| `nav-mouse` | a (sidebar link) |
| `nav-auth` | a (sidebar link) |
| `nav-advanced` | a (sidebar link) |
| `nav-rest-api` | a (sidebar link) |
| `nav-testdata` | a (sidebar link) |
| `nav-settings` | a (sidebar link) |
| `skip-to-content-link` | a |

### Advanced (`/advanced.html`)

| data-testid | Element |
| --- | --- |
| `page-title` | h1 |
| `section-shadow` | section |
| `shadow-host` | qa |
| `closed-shadow-host` | qa |
| `closed-shadow-status` | p (role=status) |
| `section-canvas` | section |
| `drawing-canvas` | canvas (role=img) |
| `canvas-clear-btn` | button |
| `canvas-strokes` | strong |
| `canvas-position` | code |
| `section-svg` | section |
| `svg-root` | svg (role=group) |
| `svg-circle` | circle (role=button) |
| `svg-rect` | rect (role=button) |
| `svg-triangle` | path (role=button) |
| `svg-label` | text |
| `svg-status` | p (role=status) |
| `section-checker` | section |
| `check-links` | ul |
| `check-link-ok` | a |
| `check-link-404` | a |
| `check-link-500` | a |
| `check-images` | div |
| `check-image-ok` | img |
| `check-image-broken` | img |
| `checker-run-btn` | button |
| `checker-summary` | span (role=status) |
| `checker-results` | tbody |
| `section-permissions` | section |
| `geo-request-btn` | button |
| `geo-permission` | strong |
| `geo-result` | p (role=status) |
| `notif-request-btn` | button |
| `notif-show-btn` | button |
| `notif-permission` | strong |
| `notif-result` | p (role=status) |
| `section-misc` | section |
| `basic-auth-link` | a |
| `console-error-link` | a |
| `shadow-input` | input[text] (created by script) |
| `shadow-btn` | button (created by script) |
| `shadow-result` | p (role=status) (created by script) |
| `closed-shadow-btn` | button (created by script) |
| `checker-row` | tr (created by script) |
| `checker-link-` | td (created by script) |
| `checker-image-` | td (created by script) |

### Alert on Page Load (`/alerts-onload.html`)

| data-testid | Element |
| --- | --- |
| `page-title` | h1 |
| `onload-alert-result` | span (role=status) |
| `onload-back-link` | a |

### Alerts and Dialogs (`/alerts.html`)

| data-testid | Element |
| --- | --- |
| `page-title` | h1 |
| `section-native-dialogs` | section |
| `js-alert-btn` | button |
| `alert-result` | span (role=status) |
| `js-confirm-btn` | button |
| `confirm-result` | span (role=status) |
| `js-prompt-btn` | button |
| `prompt-result` | span (role=status) |
| `delayed-alert-btn` | button |
| `delayed-alert-status` | span (role=status) |
| `onload-alert-link` | a |
| `section-modal` | section |
| `open-modal-btn` | button |
| `modal-result` | span (role=status) |
| `section-toasts` | section |
| `toast-success-btn` | button |
| `toast-error-btn` | button |
| `toast-info-btn` | button |
| `section-cookie` | section |
| `cookie-status` | strong (role=status) |
| `cookie-reset-btn` | button |
| `modal-backdrop` | div |
| `modal` | div (role=dialog) |
| `modal-title` | h2 |
| `modal-close-btn` | button |
| `modal-body` | div |
| `modal-cancel-btn` | button |
| `modal-confirm-btn` | button |
| `toast-container` | div |
| `cookie-banner` | div (role=dialog) |
| `cookie-banner-text` | p |
| `cookie-reject-btn` | button |
| `cookie-accept-btn` | button |
| `toast-` | div (created by script) |
| `toast-message` | span (created by script) |
| `toast-close-btn` | button (created by script) |

### Auth and Sessions (`/auth.html`)

| data-testid | Element |
| --- | --- |
| `page-title` | h1 |
| `redirect-notice` | div (role=alert) |
| `session-expired-message` | div (role=alert) |
| `section-login` | section |
| `login-panel` | div |
| `login-form` | form |
| `login-username-input` | input[text] |
| `login-password-input` | input[password] |
| `login-remember-checkbox` | input[checkbox] |
| `session-timeout-input` | input[number] |
| `login-submit-btn` | button |
| `login-error` | div (role=alert) |
| `fill-admin-btn` | button |
| `fill-standard-btn` | button |
| `fill-locked-btn` | button |
| `fill-inactive-btn` | button |
| `fill-expired-btn` | button |
| `fill-invalid-btn` | button |
| `session-panel` | div |
| `login-success` | div (role=status) |
| `session-user` | dd |
| `session-role` | dd |
| `session-countdown` | dd |
| `session-remembered` | dd |
| `protected-page-link` | a |
| `logout-btn` | button |
| `protected-page-anon-link` | a |
| `section-jwt` | section |
| `jwt-login-btn` | button |
| `jwt-me-btn` | button |
| `jwt-bad-btn` | button |
| `jwt-status` | span (role=status) |
| `jwt-token` | pre |
| `jwt-payload` | pre |
| `jwt-me-result` | pre |
| `section-storage` | section |
| `refresh-storage-btn` | button |
| `add-cookie-btn` | button |
| `add-local-btn` | button |
| `add-session-btn` | button |
| `clear-storage-btn` | button |
| `cookies-table` | table |
| `cookies-body` | tbody |
| `local-storage-table` | table |
| `local-storage-body` | tbody |
| `session-storage-table` | table |
| `session-storage-body` | tbody |
| `storage-row` | tr (created by script) |
| `storage-key` | td (created by script) |
| `storage-value` | td (created by script) |
| `storage-empty` | td (created by script) |

### Console Error Page (`/console-error.html`)

| data-testid | Element |
| --- | --- |
| `console-error-title` | h1 |
| `console-error-text` | p |
| `console-error-back-link` | a |

### Dropdowns and Selects (`/dropdowns.html`)

| data-testid | Element |
| --- | --- |
| `page-title` | h1 |
| `section-native-selects` | section |
| `native-single-select` | select |
| `native-select-result` | p (role=status) |
| `native-multi-select` | select |
| `multi-select-result` | p (role=status) |
| `grouped-select` | select |
| `grouped-select-result` | p (role=status) |
| `section-custom-dropdown` | section |
| `custom-dropdown` | div |
| `custom-dropdown-trigger` | button (role=combobox) |
| `custom-dropdown-menu` | div |
| `custom-dropdown-list` | ul (role=listbox) |
| `custom-dropdown-selected` | strong (role=status) |
| `section-searchable-dropdown` | section |
| `searchable-dropdown` | div |
| `searchable-dropdown-trigger` | button (role=combobox) |
| `searchable-dropdown-menu` | div |
| `searchable-dropdown-search` | input[text] |
| `searchable-dropdown-list` | ul (role=listbox) |
| `searchable-dropdown-empty` | p |
| `searchable-dropdown-selected` | strong (role=status) |
| `section-dependent-dropdowns` | section |
| `country-select` | select |
| `state-select` | select |
| `city-select` | select |
| `dependent-result` | p (role=status) |
| `section-autocomplete` | section |
| `autocomplete-input` | input[text] (role=combobox) |
| `autocomplete-list` | ul (role=listbox) |
| `autocomplete-loading` | p (role=status) |
| `autocomplete-result` | strong (role=status) |
| `section-delayed-options` | section |
| `load-delayed-options-btn` | button |
| `delayed-select-status` | span (role=status) |
| `delayed-select` | select |
| `delayed-select-result` | p (role=status) |
| `autocomplete-suggestion` | li (role=option) (created by script) |
| `autocomplete-no-results` | li (created by script) |

### Dynamic Elements (`/dynamic.html`)

| data-testid | Element |
| --- | --- |
| `page-title` | h1 |
| `section-random-ids` | section |
| `random-id-btn` | button |
| `random-id-value` | code |
| `random-class-value` | code |
| `random-id-result` | p (role=status) |
| `section-appear-disappear` | section |
| `appear-delay-input` | input[number] |
| `start-appear-btn` | button |
| `appear-status` | p (role=status) |
| `appear-host` | div |
| `start-disappear-btn` | button |
| `disappear-status` | p (role=status) |
| `disappear-host` | div |
| `section-delayed-enable` | section |
| `delayed-enable-btn` | button |
| `restart-enable-btn` | button |
| `delayed-enable-status` | span (role=status) |
| `section-ajax-table` | section |
| `load-table-btn` | button |
| `clear-table-btn` | button |
| `ajax-table-host` | div |
| `section-infinite-scroll` | section |
| `infinite-scroll-container` | div (role=region) |
| `infinite-status` | p (role=status) |
| `section-stale` | section |
| `stale-list` | ul |
| `stale-render-count` | strong |
| `stale-click-result` | span (role=status) |
| `section-lazy` | section |
| `lazy-section` | div |
| `lazy-placeholder` | p |
| `lazy-content` | div |
| `lazy-text` | p |
| `section-add-remove` | section |
| `add-element-btn` | button |
| `added-count` | strong |
| `added-elements` | div |
| `section-dynamic-table` | section |
| `add-row-btn` | button |
| `dynamic-row-count` | strong |
| `dynamic-table-body` | tbody |
| `dynamic-table-empty` | p |
| `section-progress` | section |
| `start-progress-btn` | button |
| `progress-status` | span (role=status) |
| `progress-bar` | div (role=progressbar) |
| `progress-fill` | div |
| `appearing-element` | div (created by script) |
| `disappearing-element` | div (created by script) |
| `table-spinner` | div (role=status) (created by script) |
| `table-skeleton` | div (created by script) |
| `ajax-table-error` | p (role=alert) (created by script) |
| `ajax-table` | table (created by script) |
| `ajax-row` | tr (created by script) |
| `infinite-item` | div (created by script) |
| `stale-item-btn` | button (created by script) |
| `added-element` | div (created by script) |
| `delete-element-btn` | button (created by script) |
| `dynamic-row` | tr (created by script) |
| `dynamic-row-name` | td (created by script) |
| `remove-row-btn` | button (created by script) |

### File Upload and Download (`/files.html`)

| data-testid | Element |
| --- | --- |
| `page-title` | h1 |
| `section-rules` | section |
| `validation-rules` | ul |
| `rules-sample-files-link` | a |
| `upload-errors` | div (role=alert) |
| `section-single-upload` | section |
| `single-file-input` | input[file] |
| `single-upload-btn` | button |
| `single-upload-status` | span (role=status) |
| `section-multi-upload` | section |
| `multi-file-input` | input[file] |
| `multi-upload-btn` | button |
| `multi-upload-status` | span (role=status) |
| `section-drop-zone` | section |
| `drop-zone` | div (role=button) |
| `drop-zone-input` | input[file] |
| `drop-zone-status` | p (role=status) |
| `section-progress-upload` | section |
| `progress-file-input` | input[file] |
| `progress-upload-btn` | button |
| `progress-status` | span (role=status) |
| `upload-progress` | div (role=progressbar) |
| `upload-progress-fill` | div |
| `section-uploaded-files` | section |
| `uploaded-files-table` | table |
| `uploaded-files-body` | tbody |
| `no-files-message` | p |
| `uploaded-count` | strong |
| `section-downloads` | section |
| `download-pdf-link` | a |
| `download-csv-link` | a |
| `download-image-link` | a |
| `delayed-download-btn` | button |
| `download-status` | span (role=status) |
| `upload-error-item` | div (created by script) |
| `uploaded-file-row` | tr (created by script) |
| `uploaded-file-name` | td (created by script) |
| `delete-file-btn` | button (created by script) |

### Forms and Validation (`/forms.html`)

| data-testid | Element |
| --- | --- |
| `page-title` | h1 |
| `section-registration` | section |
| `form-error-summary` | div (role=alert) |
| `registration-success` | div (role=status) |
| `registration-form` | form |
| `reg-fullname-input` | input[text] |
| `reg-fullname-error` | p |
| `reg-email-input` | input[email] |
| `reg-email-error` | p |
| `reg-password-input` | input[password] |
| `reg-password-error` | p |
| `reg-confirm-input` | input[password] |
| `reg-confirm-error` | p |
| `reg-phone-input` | input[text] |
| `reg-phone-error` | p |
| `reg-dob-input` | input[date] |
| `reg-dob-error` | p |
| `reg-gender-female` | input[radio] |
| `reg-gender-male` | input[radio] |
| `reg-gender-other` | input[radio] |
| `reg-gender-error` | p |
| `reg-interest-ui` | input[checkbox] |
| `reg-interest-api` | input[checkbox] |
| `reg-interest-perf` | input[checkbox] |
| `reg-newsletter-toggle` | input[checkbox] (role=switch) |
| `reg-experience-value` | output |
| `reg-experience-slider` | input[range] |
| `reg-bio-textarea` | textarea |
| `reg-bio-count` | span |
| `reg-bio-error` | p |
| `reg-terms-checkbox` | input[checkbox] |
| `reg-terms-error` | p |
| `human-checkbox` | input[checkbox] |
| `human-error` | p |
| `reg-submit-btn` | button |
| `reg-reset-btn` | button |
| `section-wizard` | section |
| `wizard-steps` | ol |
| `wizard-step-label-1` | li |
| `wizard-step-label-2` | li |
| `wizard-step-label-3` | li |
| `wizard-step-indicator` | p (role=status) |
| `wizard-form` | form |
| `wizard-step-1` | div |
| `wizard-email-input` | input[email] |
| `wizard-email-error` | p |
| `wizard-password-input` | input[password] |
| `wizard-password-error` | p |
| `wizard-step-2` | div |
| `wizard-name-input` | input[text] |
| `wizard-name-error` | p |
| `wizard-country-select` | select |
| `wizard-country-error` | p |
| `wizard-step-3` | div |
| `wizard-summary` | dl |
| `wizard-back-btn` | button |
| `wizard-next-btn` | button |
| `wizard-submit-btn` | button |
| `wizard-success` | div (role=status) |
| `form-error-item` | li (created by script) |
| `summary-email` | dd (created by script) |
| `summary-name` | dd (created by script) |
| `summary-country` | dd (created by script) |

### Iframes (`/iframes.html`)

| data-testid | Element |
| --- | --- |
| `page-title` | h1 |
| `section-single-iframe` | section |
| `single-iframe` | iframe |
| `section-nested-iframes` | section |
| `nested-iframe-l1` | iframe |
| `section-dynamic-iframe` | section |
| `dynamic-iframe` | iframe |
| `set-frame-content-a-btn` | button |
| `set-frame-content-b-btn` | button |
| `clear-frame-content-btn` | button |
| `reload-dynamic-frame-btn` | button |
| `section-dynamic-id-iframe` | section |
| `dynamic-id-frame-host` | div |
| `dynamic-frame-id` | code |
| `dynamic-frame-name` | code |
| `regenerate-frame-id-btn` | button |
| `section-sandboxed-iframe` | section |
| `sandboxed-iframe` | iframe |
| `dynamic-id-iframe` | iframe (created by script) |

### QA Practice App (`/index.html`)

| data-testid | Element |
| --- | --- |
| `page-title` | h1 |
| `home-page-list` | ul |
| `home-link-alerts` | a |
| `home-link-iframes` | a |
| `home-link-windows` | a |
| `home-link-dropdowns` | a |
| `home-link-dynamic` | a |
| `home-link-files` | a |
| `home-link-forms` | a |
| `home-link-tables` | a |
| `home-link-mouse` | a |
| `home-link-auth` | a |
| `home-link-advanced` | a |
| `home-link-rest-api` | a |
| `home-link-docs` | a |
| `home-link-testdata` | a |
| `home-link-settings` | a |
| `home-link-health` | a |

### Mouse and Keyboard (`/mouse.html`)

| data-testid | Element |
| --- | --- |
| `page-title` | h1 |
| `section-hover` | section |
| `hover-menu-wrap` | div |
| `hover-menu-trigger` | button |
| `hover-menu` | ul (role=menu) |
| `hover-item-profile` | button (role=menuitem) |
| `hover-item-settings` | button (role=menuitem) |
| `hover-item-logout` | button (role=menuitem) |
| `tooltip-trigger` | button |
| `tooltip` | span (role=tooltip) |
| `hover-result` | span (role=status) |
| `section-clicks` | section |
| `context-area` | div |
| `context-result` | p (role=status) |
| `double-click-btn` | button |
| `click-count` | strong |
| `double-click-result` | p (role=status) |
| `section-drag-drop` | section |
| `drag-area` | div |
| `drag-source` | div (role=button) |
| `drop-target` | div |
| `drag-result` | p (role=status) |
| `drag-reset-btn` | button |
| `section-sortable` | section |
| `sortable-list` | ul |
| `sortable-item-one` | li |
| `sortable-item-two` | li |
| `sortable-item-three` | li |
| `sortable-item-four` | li |
| `sortable-order` | strong |
| `section-keyboard` | section |
| `key-input` | input[text] |
| `key-display` | dd |
| `key-code` | dd |
| `key-modifiers` | dd |
| `shortcut-result` | p (role=status) |
| `section-scroll` | section |
| `scroll-to-target-btn` | button |
| `scroll-status` | span (role=status) |
| `scroll-target` | div |
| `scroll-target-btn` | button |
| `scroll-target-result` | span (role=status) |
| `context-menu` | ul (role=menu) |
| `context-copy` | button (role=menuitem) |
| `context-paste` | button (role=menuitem) |
| `context-delete` | button (role=menuitem) |

### Protected Page (`/protected.html`)

| data-testid | Element |
| --- | --- |
| `page-title` | h1 |
| `protected-content` | section |
| `protected-welcome` | p (role=status) |
| `protected-role` | dd |
| `protected-countdown` | dd |
| `protected-secret` | p |
| `protected-back-link` | a |
| `protected-logout-btn` | button |

### REST API (`/rest-api.html`)

| data-testid | Element |
| --- | --- |
| `page-title` | h1 |
| `section-links` | section |
| `swagger-docs-link` | a |
| `openapi-json-link` | a |
| `health-link` | a |
| `section-endpoints` | section |
| `endpoints-table` | table |
| `section-console` | section |
| `get-token-btn` | button |
| `token-status` | span (role=status) |
| `request-method-select` | select |
| `request-path-input` | input[text] |
| `request-token-input` | input[text] |
| `request-body-textarea` | textarea |
| `send-request-btn` | button |
| `response-status` | strong |
| `response-time` | strong |
| `response-body` | pre |
| `section-resilience` | section |
| `slow-request-btn` | button |
| `flaky-request-btn` | button |
| `resilience-status` | span (role=status) |
| `flaky-attempts` | strong |
| `flaky-successes` | strong |
| `flaky-failures` | strong |

### Settings (`/settings.html`)

| data-testid | Element |
| --- | --- |
| `page-title` | h1 |
| `section-toggles` | section |
| `slow-network-toggle` | input[checkbox] (role=switch) |
| `slow-network-ms-input` | input[number] |
| `flaky-mode-toggle` | input[checkbox] (role=switch) |
| `flaky-rate-input` | input[number] |
| `randomize-ids-toggle` | input[checkbox] (role=switch) |
| `settings-save-btn` | button |
| `settings-status` | span (role=status) |
| `section-reset` | section |
| `reset-keep-settings` | input[checkbox] |
| `reset-data-btn` | button |
| `reset-status` | span (role=status) |

### Tables and Pagination (`/tables.html`)

| data-testid | Element |
| --- | --- |
| `page-title` | h1 |
| `section-table` | section |
| `table-filter-input` | input[text] |
| `table-dept-filter` | select |
| `page-size-select` | select |
| `selected-count` | span (role=status) |
| `clear-selection-btn` | button |
| `edit-status` | span (role=status) |
| `data-table` | table |
| `select-all-checkbox` | input[checkbox] |
| `sort-id-btn` | button |
| `sort-name-btn` | button |
| `sort-department-btn` | button |
| `sort-status-btn` | button |
| `sort-salary-btn` | button |
| `table-body` | tbody |
| `table-empty` | p |
| `page-first-btn` | button |
| `page-prev-btn` | button |
| `page-buttons` | span |
| `page-next-btn` | button |
| `page-last-btn` | button |
| `page-info` | span (role=status) |
| `table-row-` | tr (created by script) |
| `row-select-` | input[checkbox] (created by script) |
| `id-cell-` | td (created by script) |
| `name-cell-` | td (created by script) |
| `department-cell-` | td (created by script) |
| `status-cell-` | td (created by script) |
| `salary-cell-` | td (created by script) |
| `expand-` | button (created by script) |
| `row-details-` | tr (created by script) |
| `detail-email-` | span (created by script) |
| `page-btn-` | button (created by script) |
| `cell-input` | input (created by script) |

### Test Data (`/testdata.html`)

| data-testid | Element |
| --- | --- |
| `page-title` | h1 |
| `section-counts` | section |
| `count-users` | td |
| `count-products` | td |
| `count-orders` | td |
| `count-addresses` | td |
| `refresh-counts-btn` | button |
| `reset-btn` | button |
| `reset-status` | span (role=status) |
| `section-seed-users` | section |
| `seed-users-body` | tbody |
| `section-generate` | section |
| `testdata-type-select` | select |
| `testdata-count-input` | input[number] |
| `generate-btn` | button |
| `generate-status` | span (role=status) |
| `testdata-output` | pre |
| `export-json-link` | a |
| `export-csv-link` | a |
| `import-csv-input` | input[file] |
| `import-btn` | button |
| `import-status` | span (role=status) |
| `import-result` | pre |
| `section-sample-files` | section |
| `download-sample-files-link` | a |
| `seed-user-row-` | tr (created by script) |

### Windows and Tabs (`/windows.html`)

| data-testid | Element |
| --- | --- |
| `page-title` | h1 |
| `section-new-tab` | section |
| `new-tab-link` | a |
| `same-tab-link` | a |
| `section-popup` | section |
| `open-popup-btn` | button |
| `popup-status` | span (role=status) |
| `section-multiple-tabs` | section |
| `open-multiple-tabs-btn` | button |
| `multi-tabs-status` | span (role=status) |
| `section-child-window` | section |
| `open-child-btn` | button |
| `child-result` | strong (role=status) |
| `section-redirect` | section |
| `redirect-chain-link` | a |

### Dynamic frame (`/frames/dynamic-frame.html`)

| data-testid | Element |
| --- | --- |
| `dynamic-frame-title` | h2 |
| `dynamic-frame-status` | p (role=status) |
| `dynamic-frame-content` | p |

### Form frame (`/frames/form-frame.html`)

| data-testid | Element |
| --- | --- |
| `frame-form-title` | h2 |
| `frame-form` | form |
| `frame-name-input` | input[text] |
| `frame-email-input` | input[email] |
| `frame-submit-btn` | button |
| `frame-form-result` | span (role=status) |

### Nested frame level 1 (`/frames/nested-1.html`)

| data-testid | Element |
| --- | --- |
| `nested-l1-title` | h2 |
| `nested-l1-btn` | button |
| `nested-l1-result` | span (role=status) |
| `nested-iframe-l2` | iframe |

### Nested frame level 2 (`/frames/nested-2.html`)

| data-testid | Element |
| --- | --- |
| `nested-l2-title` | h2 |
| `nested-l2-btn` | button |
| `nested-l2-result` | span (role=status) |
| `nested-iframe-l3` | iframe |

### Nested frame level 3 (`/frames/nested-3.html`)

| data-testid | Element |
| --- | --- |
| `nested-l3-title` | h2 |
| `nested-l3-btn` | button |
| `nested-l3-result` | span (role=status) |

### Sandboxed frame (`/frames/sandboxed-frame.html`)

| data-testid | Element |
| --- | --- |
| `sandbox-title` | h2 |
| `sandbox-origin` | code |
| `sandbox-btn` | button |
| `sandbox-result` | span (role=status) |
| `sandbox-form` | form |
| `sandbox-submit-btn` | button |

### Simple frame (`/frames/simple-frame.html`)

| data-testid | Element |
| --- | --- |
| `simple-frame-title` | h2 |
| `simple-frame-btn` | button |
| `simple-frame-result` | span (role=status) |

### Child Window (`/windows/child.html`)

| data-testid | Element |
| --- | --- |
| `child-title` | h1 |
| `child-message-input` | input[text] |
| `child-send-btn` | button |
| `child-close-btn` | button |
| `child-status` | p (role=status) |

### New Tab (`/windows/new-tab.html`)

| data-testid | Element |
| --- | --- |
| `new-tab-title` | h1 |
| `new-tab-text` | p |
| `new-tab-close-btn` | button |

### Popup Window (`/windows/popup.html`)

| data-testid | Element |
| --- | --- |
| `popup-title` | h1 |
| `popup-size` | strong |
| `popup-close-btn` | button |

### Redirect Landing (`/windows/redirect-landing.html`)

| data-testid | Element |
| --- | --- |
| `redirect-landing-title` | h1 |
| `redirect-landing-text` | p |
| `redirect-back-link` | a |

### Same Tab (`/windows/same-tab.html`)

| data-testid | Element |
| --- | --- |
| `same-tab-title` | h1 |
| `same-tab-text` | p |
| `same-tab-back-link` | a |

### Tab (`/windows/tab.html`)

| data-testid | Element |
| --- | --- |
| `tab-title` | h1 |
| `tab-number` | span |
| `tab-text` | p |

<!-- TESTIDS:END -->

## Roadmap

Phase 1 (pages 1 to 4, Test Data, Settings, Docker) and phase 2 (pages 5 to 12, REST API with Swagger, remaining tests) are both done.

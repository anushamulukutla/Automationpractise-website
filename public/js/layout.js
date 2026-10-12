/* Shared layout: sidebar navigation, settings banner, "Randomize IDs" and small helpers (window.qa). */
(function () {
  var NAV = [
    { href: '/', label: 'Home', testid: 'nav-home', page: 'home' },
    { section: 'UI practice' },
    { href: '/alerts.html', label: '1. Alerts and Dialogs', testid: 'nav-alerts', page: 'alerts' },
    { href: '/iframes.html', label: '2. Iframes', testid: 'nav-iframes', page: 'iframes' },
    { href: '/windows.html', label: '3. Windows and Tabs', testid: 'nav-windows', page: 'windows' },
    { href: '/dropdowns.html', label: '4. Dropdowns and Selects', testid: 'nav-dropdowns', page: 'dropdowns' },
    { href: '/dynamic.html', label: '5. Dynamic Elements', testid: 'nav-dynamic', page: 'dynamic' },
    { href: '/files.html', label: '6. File Upload and Download', testid: 'nav-files', page: 'files' },
    { href: '/forms.html', label: '7. Forms and Validation', testid: 'nav-forms', page: 'forms' },
    { href: '/tables.html', label: '8. Tables and Pagination', testid: 'nav-tables', page: 'tables' },
    { href: '/mouse.html', label: '9. Mouse and Keyboard', testid: 'nav-mouse', page: 'mouse' },
    { href: '/auth.html', label: '10. Auth and Sessions', testid: 'nav-auth', page: 'auth' },
    { href: '/advanced.html', label: '11. Advanced', testid: 'nav-advanced', page: 'advanced' },
    { href: '/rest-api.html', label: '12. REST API', testid: 'nav-rest-api', page: 'rest-api' },
    { section: 'Tools' },
    { href: '/testdata.html', label: 'Test Data', testid: 'nav-testdata', page: 'testdata' },
    { href: '/settings.html', label: 'Settings', testid: 'nav-settings', page: 'settings' },
  ];

  var qa = (window.qa = window.qa || {});
  var settings = (qa.settings = window.__QA_SETTINGS__ || {});

  qa.testid = function (id, root) {
    return (root || document).querySelector('[data-testid="' + id + '"]');
  };
  qa.testids = function (id, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll('[data-testid="' + id + '"]'));
  };
  qa.sleep = function (ms) {
    return new Promise(function (r) { setTimeout(r, ms); });
  };
  qa.rand = function () {
    return Math.random().toString(36).slice(2, 8);
  };
  /** fetch wrapper: returns { ok, status, data } and never throws on HTTP errors. */
  qa.api = async function (path, options) {
    var opts = Object.assign({ headers: {} }, options || {});
    if (opts.body && typeof opts.body !== 'string') {
      opts.body = JSON.stringify(opts.body);
      opts.headers['Content-Type'] = 'application/json';
    }
    var res = await fetch(path, opts);
    var data = null;
    try {
      data = (res.headers.get('content-type') || '').indexOf('json') >= 0 ? await res.json() : await res.text();
    } catch (e) { /* empty body */ }
    return { ok: res.ok, status: res.status, data: data };
  };

  function renderNav() {
    var root = document.getElementById('sidebar-root');
    if (!root) return;
    var current = document.body.getAttribute('data-page');
    var items = NAV.map(function (n) {
      if (n.section) return '<li class="nav-section" role="presentation">' + n.section + '</li>';
      if (n.soon) return '<li><span class="nav-soon" aria-disabled="true">' + n.soon + ' (coming soon)</span></li>';
      var cur = n.page === current ? ' aria-current="page"' : '';
      return '<li><a href="' + n.href + '" data-testid="' + n.testid + '"' + cur + '>' + n.label + '</a></li>';
    }).join('');
    root.setAttribute('data-testid', 'sidebar');
    root.innerHTML =
      '<div class="sidebar-header">' +
      '<span class="brand" data-testid="app-brand">QA Practice App</span>' +
      '<button type="button" class="nav-toggle" data-testid="nav-toggle-btn" aria-expanded="false" aria-controls="nav-list">Menu</button>' +
      '</div>' +
      '<nav aria-label="Main navigation"><ul class="nav-list" id="nav-list" data-testid="sidebar-nav">' + items + '</ul></nav>';

    var toggle = root.querySelector('.nav-toggle');
    var list = root.querySelector('.nav-list');
    toggle.addEventListener('click', function () {
      var open = list.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
  }

  function renderBanner() {
    var active = [];
    if (settings.slowNetwork) active.push('Slow network (' + settings.slowNetworkMs + ' ms)');
    if (settings.flakyMode) active.push('Flaky mode (' + Math.round(settings.flakyRate * 100) + '% failures)');
    if (settings.randomizeIds) active.push('Randomize IDs');
    var main = document.getElementById('main');
    if (!main) return;
    var banner = document.createElement('div');
    banner.className = 'mode-banner';
    banner.setAttribute('data-testid', 'mode-banner');
    banner.setAttribute('role', 'status');
    banner.hidden = active.length === 0;
    if (active.length) banner.textContent = 'Active QA modes: ' + active.join(', ');
    main.insertBefore(banner, main.firstChild);
  }

  /* "Randomize IDs": every id inside <main> gets a random suffix and a random class on each page load.
     data-testid values never change. References (label[for], aria-*) are rewritten to match. */
  function randomizeIds() {
    var main = document.getElementById('main');
    if (!main) return;
    var map = {};
    Array.prototype.forEach.call(main.querySelectorAll('[id]'), function (el) {
      var next = el.id + '-' + qa.rand();
      map[el.id] = next;
      el.id = next;
      el.classList.add('r-' + qa.rand());
    });
    ['for', 'aria-controls', 'aria-labelledby', 'aria-describedby'].forEach(function (attr) {
      Array.prototype.forEach.call(main.querySelectorAll('[' + attr + ']'), function (el) {
        el.setAttribute(attr, el.getAttribute(attr).split(/\s+/).map(function (t) { return map[t] || t; }).join(' '));
      });
    });
  }

  renderNav();
  renderBanner();
  if (settings.randomizeIds) randomizeIds();
})();

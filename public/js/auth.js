(function () {
  var t = qa.testid;
  var S = qa.session;
  var params = new URLSearchParams(location.search);
  var countdown = null;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }

  /* ---- Why were we sent here? ---- */
  var reason = params.get('reason');
  if (reason === 'login_required') {
    var n = t('redirect-notice');
    n.textContent = 'You must log in to view that page.';
    n.hidden = false;
  } else if (reason === 'session_expired') {
    t('session-expired-message').hidden = false;
  }
  function safeRedirect() {
    var r = params.get('redirect');
    return r && r.charAt(0) === '/' && r.charAt(1) !== '/' ? r : null;
  }

  /* ---- Remember-me cookie pre-fills the username ---- */
  var remembered = S.cookie('remember_user');
  if (remembered) {
    t('login-username-input').value = remembered;
    t('login-remember-checkbox').checked = true;
  }

  /* ---- Render login vs session state ---- */
  function showSession() {
    var s = S.get();
    t('login-panel').hidden = !!s;
    t('session-panel').hidden = !s;
    clearInterval(countdown);
    if (!s) return;
    t('login-success').textContent = 'Logged in as ' + s.user.username;
    t('session-user').textContent = s.user.username + ' (' + s.user.email + ')';
    t('session-role').textContent = s.user.role;
    t('session-remembered').textContent = s.remember ? 'yes (localStorage + cookie)' : 'no (sessionStorage only)';
    function tick() {
      var left = Math.ceil((s.expiresAt - Date.now()) / 1000);
      if (left <= 0) {
        clearInterval(countdown);
        S.clear();
        t('session-expired-message').hidden = false;
        showSession();
        refreshStorage();
        return;
      }
      t('session-countdown').textContent = 'Expires in ' + left + ' s';
    }
    tick();
    countdown = setInterval(tick, 1000);
  }

  /* ---- Login ---- */
  function showError(msg, code) {
    var box = t('login-error');
    box.textContent = msg;
    box.setAttribute('data-code', code || '');
    box.hidden = false;
  }
  t('login-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    t('login-error').hidden = true;
    t('session-expired-message').hidden = true;
    var username = t('login-username-input').value.trim();
    var password = t('login-password-input').value;
    if (!username || !password) { showError('Username and password are required', 'missing_fields'); return; }
    var seconds = Math.min(Math.max(Number(t('session-timeout-input').value) || 60, 5), 3600);
    var res = await qa.api('/api/auth/login', { method: 'POST', body: { username: username, password: password, expiresIn: seconds } });
    if (!res.ok) {
      var d = res.data || {};
      showError(d.error || 'Login failed (HTTP ' + res.status + ')', d.code || 'http_' + res.status);
      return;
    }
    var remember = t('login-remember-checkbox').checked;
    S.set({ token: res.data.token, user: res.data.user, expiresAt: Date.now() + res.data.expiresIn * 1000, remember: remember });
    if (remember) S.setCookie('remember_user', username, 30); else S.deleteCookie('remember_user');
    t('login-password-input').value = '';
    var dest = safeRedirect();
    if (dest) { location.href = dest; return; }
    showSession();
    refreshStorage();
  });

  Array.prototype.forEach.call(document.querySelectorAll('[data-user]'), function (b) {
    b.addEventListener('click', function () {
      var parts = b.getAttribute('data-user').split('|');
      t('login-username-input').value = parts[0];
      t('login-password-input').value = parts[1];
    });
  });

  t('logout-btn').addEventListener('click', function () {
    S.clear();
    t('login-success').textContent = '';
    showSession();
    refreshStorage();
  });

  /* ---- JWT via the API ---- */
  var jwt = null;
  function decodePayload(token) {
    try { return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); } catch (e) { return null; }
  }
  function status(text, cls) {
    var el = t('jwt-status');
    el.textContent = text;
    el.className = 'result' + (cls ? ' ' + cls : '');
  }
  t('jwt-login-btn').addEventListener('click', async function () {
    status('Requesting token...');
    var res = await qa.api('/api/auth/login', { method: 'POST', body: { username: 'admin', password: 'Admin@123' } });
    if (!res.ok) { status('Login failed (HTTP ' + res.status + ')', 'err'); return; }
    jwt = res.data.token;
    status('Token received (HTTP ' + res.status + ')', 'ok');
    t('jwt-token').textContent = jwt;
    t('jwt-payload').textContent = JSON.stringify(decodePayload(jwt), null, 2);
    t('jwt-me-btn').disabled = false;
  });
  async function callMe(token, label) {
    status('Calling /api/auth/me...');
    var res = await qa.api('/api/auth/me', { headers: { Authorization: 'Bearer ' + token } });
    status(label + ': HTTP ' + res.status, res.ok ? 'ok' : 'err');
    t('jwt-me-result').textContent = JSON.stringify(res.data, null, 2);
  }
  t('jwt-me-btn').addEventListener('click', function () { callMe(jwt, 'Valid token'); });
  t('jwt-bad-btn').addEventListener('click', function () { callMe('not.a.token', 'Bad token'); });

  /* ---- Storage viewer ---- */
  function rows(pairs, emptyText) {
    return pairs.length
      ? pairs.map(function (p) { return '<tr data-testid="storage-row"><td data-testid="storage-key">' + esc(p[0]) + '</td><td data-testid="storage-value">' + esc(p[1]) + '</td></tr>'; }).join('')
      : '<tr><td colspan="2" data-testid="storage-empty">' + emptyText + '</td></tr>';
  }
  function storagePairs(store) {
    var out = [];
    try { for (var i = 0; i < store.length; i++) out.push([store.key(i), store.getItem(store.key(i))]); } catch (e) { /* unavailable */ }
    return out;
  }
  function refreshStorage() {
    var cookies = document.cookie ? document.cookie.split('; ').map(function (c) {
      var i = c.indexOf('=');
      return [c.slice(0, i), decodeURIComponent(c.slice(i + 1))];
    }) : [];
    t('cookies-body').innerHTML = rows(cookies, 'No cookies');
    t('local-storage-body').innerHTML = rows(storagePairs(localStorage), 'localStorage is empty');
    t('session-storage-body').innerHTML = rows(storagePairs(sessionStorage), 'sessionStorage is empty');
  }
  var counter = 0;
  t('add-cookie-btn').addEventListener('click', function () { counter++; S.setCookie('test_cookie_' + counter, 'value_' + counter, 1); refreshStorage(); });
  t('add-local-btn').addEventListener('click', function () { counter++; localStorage.setItem('test_local_' + counter, 'value_' + counter); refreshStorage(); });
  t('add-session-btn').addEventListener('click', function () { counter++; sessionStorage.setItem('test_session_' + counter, 'value_' + counter); refreshStorage(); });
  t('refresh-storage-btn').addEventListener('click', refreshStorage);
  t('clear-storage-btn').addEventListener('click', function () {
    document.cookie.split('; ').forEach(function (c) { if (c) S.deleteCookie(c.split('=')[0]); });
    try { localStorage.clear(); sessionStorage.clear(); } catch (e) { /* unavailable */ }
    showSession();
    refreshStorage();
  });

  showSession();
  refreshStorage();
})();

(function () {
  var t = qa.testid;
  function setText(id, text, cls) {
    var el = t(id);
    el.textContent = text;
    el.className = 'result' + (cls ? ' ' + cls : '');
  }

  t('get-token-btn').addEventListener('click', async function () {
    var res = await qa.api('/api/auth/login', { method: 'POST', body: { username: 'admin', password: 'Admin@123' } });
    if (res.ok) {
      t('request-token-input').value = res.data.token;
      setText('token-status', 'Token filled in (admin, valid for 1 hour)', 'ok');
    } else {
      setText('token-status', 'Could not get a token (HTTP ' + res.status + ')', 'err');
    }
  });

  t('send-request-btn').addEventListener('click', async function () {
    var method = t('request-method-select').value;
    var path = t('request-path-input').value.trim();
    var token = t('request-token-input').value.trim();
    var bodyText = t('request-body-textarea').value.trim();
    var statusEl = t('response-status');
    var bodyEl = t('response-body');

    if (!path || path.charAt(0) !== '/') {
      statusEl.textContent = '-';
      bodyEl.textContent = 'The path must start with "/" (same-origin requests only).';
      return;
    }
    var opts = { method: method, headers: {} };
    if (token) opts.headers.Authorization = 'Bearer ' + token;
    if (method !== 'GET' && method !== 'DELETE' && bodyText) {
      try { JSON.parse(bodyText); } catch (e) { statusEl.textContent = '-'; bodyEl.textContent = 'The JSON body is not valid: ' + e.message; return; }
      opts.body = bodyText;
      opts.headers['Content-Type'] = 'application/json';
    }
    statusEl.textContent = '...';
    var start = performance.now();
    try {
      var res = await fetch(path, opts);
      var text = await res.text();
      var ms = Math.round(performance.now() - start);
      statusEl.textContent = res.status + ' ' + res.statusText;
      t('response-time').textContent = ms + ' ms';
      try { text = JSON.stringify(JSON.parse(text), null, 2); } catch (e) { /* not JSON, show as is */ }
      bodyEl.textContent = text || '(empty body)';
    } catch (e) {
      statusEl.textContent = 'Network error';
      bodyEl.textContent = e.message;
    }
  });

  t('slow-request-btn').addEventListener('click', async function () {
    var btn = t('slow-request-btn');
    btn.disabled = true;
    setText('resilience-status', 'Waiting for /slow (3 s)...');
    var start = performance.now();
    var res = await qa.api('/slow?ms=3000');
    btn.disabled = false;
    setText('resilience-status', 'Slow response received after ' + Math.round(performance.now() - start) + ' ms (HTTP ' + res.status + ')', res.ok ? 'ok' : 'err');
  });

  var attempts = 0, ok = 0, failed = 0;
  t('flaky-request-btn').addEventListener('click', async function () {
    var res = await qa.api('/flaky?rate=0.5');
    attempts++;
    if (res.ok) ok++; else failed++;
    t('flaky-attempts').textContent = attempts;
    t('flaky-successes').textContent = ok;
    t('flaky-failures').textContent = failed;
    setText('resilience-status', res.ok ? 'Succeeded (HTTP 200)' : 'Failed (HTTP ' + res.status + '), try again', res.ok ? 'ok' : 'err');
  });
})();

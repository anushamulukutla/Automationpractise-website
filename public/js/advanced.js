(function () {
  var t = qa.testid;
  function setText(id, text, cls) {
    var el = t(id);
    el.textContent = text;
    el.className = 'result' + (cls ? ' ' + cls : '');
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }

  /* ---- Shadow DOM: open and closed roots ---- */
  var cardStyle =
    '<style>.box{border:2px solid #8793ab;border-radius:8px;padding:12px;background:#fff;font-family:system-ui}' +
    'input{padding:6px 8px;border:1px solid #8793ab;border-radius:6px;font:inherit;width:90%}' +
    'button{margin-top:8px;background:#2447c9;color:#fff;border:0;border-radius:6px;padding:7px 12px;font:inherit;cursor:pointer}' +
    '.out{margin:8px 0 0;color:#146c43;min-height:1.4em}</style>';

  class QaShadowCard extends HTMLElement {
    connectedCallback() {
      if (this.shadowRoot) return;
      var root = this.attachShadow({ mode: 'open' });
      root.innerHTML = cardStyle +
        '<div class="box"><label for="n" style="display:block;font-weight:600">Your name</label>' +
        '<input id="n" type="text" autocomplete="off" data-testid="shadow-input">' +
        '<button type="button" data-testid="shadow-btn">Say hello</button>' +
        '<p class="out" role="status" data-testid="shadow-result"></p></div>';
      var input = root.querySelector('input');
      root.querySelector('button').addEventListener('click', function () {
        root.querySelector('.out').textContent = input.value ? 'Hello, ' + input.value + '!' : 'Please type a name';
      });
    }
  }
  class QaClosedCard extends HTMLElement {
    connectedCallback() {
      if (this.dataset.ready) return;
      this.dataset.ready = '1';
      var root = this.attachShadow({ mode: 'closed' });
      root.innerHTML = cardStyle + '<div class="box"><button type="button" data-testid="closed-shadow-btn">Click inside closed root</button></div>';
      var host = this;
      root.querySelector('button').addEventListener('click', function () {
        host.dispatchEvent(new CustomEvent('closed-click', { bubbles: true }));
      });
    }
  }
  customElements.define('qa-shadow-card', QaShadowCard);
  customElements.define('qa-closed-card', QaClosedCard);
  document.addEventListener('closed-click', function () { setText('closed-shadow-status', 'Button inside the closed root was clicked', 'ok'); });

  /* ---- Canvas drawing ---- */
  var canvas = t('drawing-canvas');
  var ctx = canvas.getContext('2d');
  var drawing = false, strokes = 0;
  function pos(e) {
    var r = canvas.getBoundingClientRect();
    // Subtract the border so the pointer maps to the drawing surface exactly.
    return {
      x: Math.round((e.clientX - r.left - canvas.clientLeft) * (canvas.width / canvas.clientWidth)),
      y: Math.round((e.clientY - r.top - canvas.clientTop) * (canvas.height / canvas.clientHeight)),
    };
  }
  function clearCanvas() {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#2447c9';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
  }
  clearCanvas();
  canvas.addEventListener('mousedown', function (e) {
    drawing = true;
    var p = pos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + 0.01, p.y); // a click leaves a dot
    ctx.stroke();
    strokes++;
    t('canvas-strokes').textContent = strokes;
    t('canvas-position').textContent = p.x + ', ' + p.y;
  });
  canvas.addEventListener('mousemove', function (e) {
    if (!drawing) return;
    var p = pos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    t('canvas-position').textContent = p.x + ', ' + p.y;
  });
  document.addEventListener('mouseup', function () { drawing = false; });
  t('canvas-clear-btn').addEventListener('click', function () {
    clearCanvas();
    strokes = 0;
    t('canvas-strokes').textContent = '0';
    t('canvas-position').textContent = '-';
  });

  /* ---- SVG ---- */
  ['circle', 'rect', 'triangle'].forEach(function (name) {
    var el = t('svg-' + name);
    function activate() {
      var on = el.getAttribute('data-on') !== 'true';
      el.setAttribute('data-on', on);
      el.setAttribute('stroke', on ? '#f5a524' : 'none');
      el.setAttribute('stroke-width', on ? '5' : '0');
      setText('svg-status', 'Clicked the ' + name + (on ? ' (selected)' : ' (deselected)'), 'ok');
    }
    el.addEventListener('click', activate);
    el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); } });
  });

  /* ---- Broken links and images checker ---- */
  t('checker-run-btn').addEventListener('click', async function () {
    var rows = [];
    var brokenLinks = 0, brokenImages = 0;
    var links = Array.prototype.slice.call(t('check-links').querySelectorAll('a'));
    for (var i = 0; i < links.length; i++) {
      var a = links[i];
      var code;
      try { code = (await fetch(a.getAttribute('href'), { method: 'HEAD' })).status; } catch (e) { code = 0; }
      var bad = code < 200 || code >= 400;
      if (bad) brokenLinks++;
      rows.push('<tr data-testid="checker-row"><td>Link ' + esc(a.getAttribute('href')) + '</td><td data-testid="checker-link-' + (bad ? 'broken' : 'ok') + '">' + (bad ? 'BROKEN (HTTP ' + code + ')' : 'OK (HTTP ' + code + ')') + '</td></tr>');
    }
    Array.prototype.forEach.call(t('check-images').querySelectorAll('img'), function (img) {
      var bad = !img.complete || img.naturalWidth === 0;
      if (bad) brokenImages++;
      rows.push('<tr data-testid="checker-row"><td>Image ' + esc(img.getAttribute('src')) + '</td><td data-testid="checker-image-' + (bad ? 'broken' : 'ok') + '">' + (bad ? 'BROKEN' : 'OK') + '</td></tr>');
    });
    t('checker-results').innerHTML = rows.join('');
    setText('checker-summary', brokenLinks + ' broken link' + (brokenLinks === 1 ? '' : 's') + ', ' + brokenImages + ' broken image' + (brokenImages === 1 ? '' : 's'), brokenLinks + brokenImages ? 'err' : 'ok');
  });

  /* ---- Permissions: geolocation and notifications ---- */
  function showPermission(name, id) {
    if (!navigator.permissions || !navigator.permissions.query) return;
    navigator.permissions.query({ name: name }).then(function (p) {
      t(id).textContent = p.state;
      p.onchange = function () { t(id).textContent = p.state; };
    }).catch(function () { /* unsupported */ });
  }
  showPermission('geolocation', 'geo-permission');
  if ('Notification' in window) t('notif-permission').textContent = Notification.permission; else t('notif-permission').textContent = 'unsupported';

  t('geo-request-btn').addEventListener('click', function () {
    if (!navigator.geolocation) { setText('geo-result', 'Geolocation is not supported', 'err'); return; }
    setText('geo-result', 'Requesting location...');
    navigator.geolocation.getCurrentPosition(
      function (p) { setText('geo-result', 'Latitude ' + p.coords.latitude.toFixed(4) + ', longitude ' + p.coords.longitude.toFixed(4), 'ok'); showPermission('geolocation', 'geo-permission'); },
      function (err) { setText('geo-result', 'Location error: ' + err.message + ' (code ' + err.code + ')', 'err'); showPermission('geolocation', 'geo-permission'); },
      { timeout: 8000 }
    );
  });

  t('notif-request-btn').addEventListener('click', async function () {
    if (!('Notification' in window)) { setText('notif-result', 'Notifications are not supported', 'err'); return; }
    var result = await Notification.requestPermission();
    t('notif-permission').textContent = result;
    setText('notif-result', 'Permission result: ' + result, result === 'granted' ? 'ok' : 'err');
  });
  t('notif-show-btn').addEventListener('click', function () {
    if (!('Notification' in window) || Notification.permission !== 'granted') { setText('notif-result', 'Permission not granted, cannot show a notification', 'err'); return; }
    new Notification('QA Practice App', { body: 'Hello from the practice app!' });
    setText('notif-result', 'Notification shown', 'ok');
  });
})();

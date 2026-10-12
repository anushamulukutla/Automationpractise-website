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
  function html(markup) {
    var d = document.createElement('div');
    d.innerHTML = markup.trim();
    return d.firstChild;
  }

  /* ---- Random id and class on every load ---- */
  var rnd = t('random-id-btn');
  var newId = 'btn_' + qa.rand() + qa.rand();
  var newClass = 'cls_' + qa.rand();
  rnd.id = newId;
  rnd.classList.add(newClass);
  t('random-id-value').textContent = newId;
  t('random-class-value').textContent = newClass;
  rnd.addEventListener('click', function () { setText('random-id-result', 'Clicked the button with id ' + rnd.id, 'ok'); });

  /* ---- Element appears after N seconds ---- */
  t('start-appear-btn').addEventListener('click', function () {
    var n = Math.min(Math.max(Number(t('appear-delay-input').value) || 3, 1), 10);
    var host = t('appear-host');
    host.innerHTML = '';
    setText('appear-status', 'Waiting for the element (' + n + ' s)...');
    setTimeout(function () {
      host.appendChild(html('<div class="card" data-testid="appearing-element" style="margin:8px 0 0"><strong>I appeared!</strong> after ' + n + ' seconds.</div>'));
      setText('appear-status', 'Element appeared', 'ok');
    }, n * 1000);
  });

  /* ---- Element disappears ---- */
  t('start-disappear-btn').addEventListener('click', function () {
    var host = t('disappear-host');
    host.innerHTML = '';
    host.appendChild(html('<div class="card" data-testid="disappearing-element" style="margin:8px 0 0">I will vanish in 3 seconds.</div>'));
    setText('disappear-status', 'Element is visible');
    setTimeout(function () {
      host.innerHTML = '';
      setText('disappear-status', 'Element is gone', 'ok');
    }, 3000);
  });

  /* ---- Button enabled after a delay ---- */
  var enableBtn = t('delayed-enable-btn');
  var enableTimer = null;
  function startEnableTimer() {
    clearTimeout(enableTimer);
    enableBtn.disabled = true;
    setText('delayed-enable-status', 'Waiting...');
    enableTimer = setTimeout(function () {
      enableBtn.disabled = false;
      setText('delayed-enable-status', 'Button is now enabled', 'ok');
    }, 4000);
  }
  enableBtn.addEventListener('click', function () { setText('delayed-enable-status', 'Submitted!', 'ok'); });
  t('restart-enable-btn').addEventListener('click', startEnableTimer);
  startEnableTimer();

  /* ---- Skeleton + spinner, then an AJAX table ---- */
  var tableHost = t('ajax-table-host');
  var tableRun = 0;
  t('load-table-btn').addEventListener('click', async function () {
    var mine = ++tableRun;
    tableHost.setAttribute('aria-busy', 'true');
    tableHost.innerHTML =
      '<div class="spinner" role="status" aria-label="Loading" data-testid="table-spinner"></div>' +
      '<div data-testid="table-skeleton">' + [1, 2, 3, 4].map(function () { return '<div class="skeleton"></div>'; }).join('') + '</div>';
    var res = await qa.api('/api/dynamic/people?delay=2000');
    if (mine !== tableRun) return;
    tableHost.removeAttribute('aria-busy');
    if (!res.ok) {
      tableHost.innerHTML = '<p class="result err" role="alert" data-testid="ajax-table-error">Failed to load (HTTP ' + res.status + ')</p>';
      return;
    }
    tableHost.innerHTML =
      '<table data-testid="ajax-table" aria-label="People"><thead><tr><th scope="col">ID</th><th scope="col">Name</th><th scope="col">Role</th></tr></thead><tbody>' +
      res.data.map(function (p) {
        return '<tr data-testid="ajax-row"><td>' + p.id + '</td><td>' + esc(p.name) + '</td><td>' + esc(p.role) + '</td></tr>';
      }).join('') + '</tbody></table>';
  });
  t('clear-table-btn').addEventListener('click', function () { tableRun++; tableHost.innerHTML = ''; tableHost.removeAttribute('aria-busy'); });

  /* ---- Infinite scroll ---- */
  var box = t('infinite-scroll-container');
  var page = 1, loading = false, more = true;
  async function loadMore() {
    if (loading || !more) return;
    loading = true;
    setText('infinite-status', 'Loading more...');
    var res = await qa.api('/api/dynamic/items?page=' + page + '&size=10');
    loading = false;
    if (!res.ok) { setText('infinite-status', 'Failed to load (HTTP ' + res.status + ')', 'err'); return; }
    res.data.items.forEach(function (it) {
      box.appendChild(html('<div class="scroll-item" data-testid="infinite-item">' + esc(it.title) + '</div>'));
    });
    page++;
    more = res.data.hasMore;
    setText('infinite-status', more ? 'Loaded ' + box.children.length + ' of ' + res.data.total + '. Scroll for more.' : 'All ' + res.data.total + ' items loaded', more ? '' : 'ok');
    if (more && box.scrollHeight <= box.clientHeight) loadMore(); // fill short containers
  }
  box.addEventListener('scroll', function () {
    if (box.scrollTop + box.clientHeight >= box.scrollHeight - 20) loadMore();
  });
  loadMore();

  /* ---- Stale element: every click replaces all list nodes ---- */
  var staleList = t('stale-list');
  var renders = 0;
  function renderStale() {
    renders++;
    staleList.innerHTML = '';
    ['Alpha', 'Bravo', 'Charlie'].forEach(function (name) {
      var li = html('<li><button type="button" class="btn secondary" data-testid="stale-item-btn">' + name + '</button></li>');
      li.firstChild.addEventListener('click', function () {
        setText('stale-click-result', 'Clicked ' + name, 'ok');
        renderStale();
      });
      staleList.appendChild(li);
    });
    t('stale-render-count').textContent = renders;
  }
  renderStale();

  /* ---- Lazy-loaded section ---- */
  var lazy = t('lazy-section');
  function loadLazy() {
    setTimeout(function () {
      t('lazy-placeholder').hidden = true;
      t('lazy-content').hidden = false;
    }, 800);
  }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      if (entries.some(function (e) { return e.isIntersecting; })) { io.disconnect(); loadLazy(); }
    }, { threshold: 0.2 });
    io.observe(lazy);
  } else { loadLazy(); }

  /* ---- Add / remove elements ---- */
  var added = 0, addedLive = 0;
  var addedHost = t('added-elements');
  t('add-element-btn').addEventListener('click', function () {
    added++; addedLive++;
    var n = added;
    var row = html('<div class="row" style="margin-bottom:6px" data-testid="added-element"><span>Element ' + n + '</span><button type="button" class="btn danger" data-testid="delete-element-btn">Delete</button></div>');
    row.querySelector('button').addEventListener('click', function () {
      row.remove(); addedLive--;
      t('added-count').textContent = addedLive;
    });
    addedHost.appendChild(row);
    t('added-count').textContent = addedLive;
  });

  /* ---- Dynamic table rows ---- */
  var rowSeq = 0;
  var body = t('dynamic-table-body');
  function syncRows() {
    t('dynamic-row-count').textContent = body.children.length;
    t('dynamic-table-empty').hidden = body.children.length > 0;
  }
  t('add-row-btn').addEventListener('click', function () {
    rowSeq++;
    var tr = html('<table><tbody><tr data-testid="dynamic-row"><td>' + rowSeq + '</td><td data-testid="dynamic-row-name">Row ' + rowSeq +
      '</td><td><button type="button" class="btn danger" data-testid="remove-row-btn">Remove</button></td></tr></tbody></table>').querySelector('tr');
    tr.querySelector('button').addEventListener('click', function () { tr.remove(); syncRows(); });
    body.appendChild(tr);
    syncRows();
  });
  syncRows();

  /* ---- Progress bar ---- */
  var bar = t('progress-bar');
  var fill = t('progress-fill');
  var pTimer = null;
  t('start-progress-btn').addEventListener('click', function () {
    clearInterval(pTimer);
    var v = 0;
    t('start-progress-btn').disabled = true;
    function paint() {
      bar.setAttribute('aria-valuenow', v);
      fill.style.width = v + '%';
      setText('progress-status', v >= 100 ? 'Complete' : 'Progress: ' + v + '%', v >= 100 ? 'ok' : '');
    }
    paint();
    pTimer = setInterval(function () {
      v = Math.min(v + 5, 100);
      paint();
      if (v >= 100) { clearInterval(pTimer); t('start-progress-btn').disabled = false; }
    }, 250);
  });
})();

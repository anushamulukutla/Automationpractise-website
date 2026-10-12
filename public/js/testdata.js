(function () {
  var t = qa.testid;
  var typeSel = t('testdata-type-select');

  function show(id, text, cls) {
    var el = t(id);
    el.textContent = text;
    el.className = 'result' + (cls ? ' ' + cls : '');
  }

  async function refresh() {
    var res = await qa.api('/api/testdata/summary');
    if (!res.ok) return;
    Object.keys(res.data.counts).forEach(function (k) {
      var el = t('count-' + k);
      if (el) el.textContent = res.data.counts[k];
    });
    t('seed-users-body').innerHTML = res.data.seedUsers.map(function (u) {
      return '<tr data-testid="seed-user-row-' + u.username + '"><td>' + u.username + '</td><td><code>' + u.password +
        '</code></td><td>' + u.role + '</td><td>' + u.status + '</td></tr>';
    }).join('');
  }

  function updateExportLinks() {
    var type = typeSel.value;
    t('export-json-link').href = '/api/testdata/export?type=' + type + '&format=json';
    t('export-csv-link').href = '/api/testdata/export?type=' + type + '&format=csv';
  }
  typeSel.addEventListener('change', updateExportLinks);

  t('generate-btn').addEventListener('click', async function () {
    var type = typeSel.value;
    var count = Number(t('testdata-count-input').value);
    show('generate-status', 'Generating...');
    var res = await qa.api('/api/testdata/generate', { method: 'POST', body: { type: type, count: count } });
    if (!res.ok) {
      show('generate-status', (res.data && res.data.error) || 'Generate failed (HTTP ' + res.status + ')', 'err');
      return;
    }
    show('generate-status', 'Generated ' + res.data.count + ' ' + type, 'ok');
    t('testdata-output').textContent = JSON.stringify(res.data.items.slice(0, 10), null, 2) +
      (res.data.count > 10 ? '\n... showing first 10 of ' + res.data.count : '');
    refresh();
  });

  t('import-btn').addEventListener('click', async function () {
    var file = t('import-csv-input').files[0];
    var out = t('import-result');
    if (!file) { show('import-status', 'Choose a CSV file first', 'err'); return; }
    show('import-status', 'Importing...');
    var text = await file.text();
    var res = await qa.api('/api/testdata/import?type=' + typeSel.value, {
      method: 'POST',
      headers: { 'Content-Type': 'text/csv' },
      body: text,
    });
    out.hidden = false;
    out.textContent = JSON.stringify(res.data, null, 2);
    if (res.ok) {
      show('import-status', 'Imported ' + res.data.imported + ', skipped ' + res.data.skipped, res.data.skipped ? 'err' : 'ok');
      refresh();
    } else {
      show('import-status', (res.data && res.data.error) || 'Import failed (HTTP ' + res.status + ')', 'err');
    }
  });

  t('reset-btn').addEventListener('click', async function () {
    var res = await qa.api('/api/reset?keepSettings=true', { method: 'POST' });
    show('reset-status', res.ok ? 'Data reset to defaults' : 'Reset failed (HTTP ' + res.status + ')', res.ok ? 'ok' : 'err');
    t('testdata-output').textContent = 'Nothing generated yet.';
    refresh();
  });
  t('refresh-counts-btn').addEventListener('click', refresh);

  refresh();
})();

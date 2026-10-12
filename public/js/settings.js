(function () {
  var t = qa.testid;
  var slow = t('slow-network-toggle');
  var slowMs = t('slow-network-ms-input');
  var flaky = t('flaky-mode-toggle');
  var flakyRate = t('flaky-rate-input');
  var rnd = t('randomize-ids-toggle');
  var status = t('settings-status');

  function show(el, text, cls) {
    el.textContent = text;
    el.className = 'result' + (cls ? ' ' + cls : '');
  }
  function fillForm(s) {
    slow.checked = !!s.slowNetwork;
    slowMs.value = s.slowNetworkMs;
    flaky.checked = !!s.flakyMode;
    flakyRate.value = Math.round(s.flakyRate * 100);
    rnd.checked = !!s.randomizeIds;
  }

  qa.api('/api/settings').then(function (res) {
    if (res.ok) fillForm(res.data);
    else show(status, 'Could not load settings (HTTP ' + res.status + ')', 'err');
  });

  t('settings-save-btn').addEventListener('click', async function () {
    var res = await qa.api('/api/settings', {
      method: 'PUT',
      body: {
        slowNetwork: slow.checked,
        slowNetworkMs: Number(slowMs.value),
        flakyMode: flaky.checked,
        flakyRate: Number(flakyRate.value) / 100,
        randomizeIds: rnd.checked,
      },
    });
    if (res.ok) {
      fillForm(res.data);
      show(status, 'Settings saved', 'ok');
    } else {
      show(status, 'Save failed: ' + ((res.data && res.data.error) || 'HTTP ' + res.status), 'err');
    }
  });

  t('reset-data-btn').addEventListener('click', async function () {
    var keep = t('reset-keep-settings').checked;
    var res = await qa.api('/api/reset?keepSettings=' + keep, { method: 'POST' });
    var out = t('reset-status');
    if (res.ok) {
      show(out, 'Data reset to defaults', 'ok');
      fillForm(res.data.settings);
    } else {
      show(out, 'Reset failed (HTTP ' + res.status + ')', 'err');
    }
  });
})();

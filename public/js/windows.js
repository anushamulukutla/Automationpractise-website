(function () {
  var t = qa.testid;

  // Popup window with an explicit size.
  t('open-popup-btn').addEventListener('click', function () {
    var popup = window.open('/windows/popup.html', 'popupWindow', 'width=500,height=400');
    t('popup-status').textContent = popup ? 'Popup opened' : 'Popup was blocked';
  });

  // Several tabs from one click.
  t('open-multiple-tabs-btn').addEventListener('click', function () {
    var opened = 0;
    [1, 2, 3].forEach(function (n) {
      if (window.open('/windows/tab.html?n=' + n, '_blank')) opened++;
    });
    t('multi-tabs-status').textContent = 'Opened ' + opened + ' of 3 tabs';
  });

  // Child window: data comes back through postMessage.
  t('open-child-btn').addEventListener('click', function () {
    window.open('/windows/child.html', 'childWindow', 'width=480,height=360');
  });
  window.addEventListener('message', function (e) {
    if (e.origin !== location.origin || !e.data || e.data.type !== 'child-data') return;
    var el = t('child-result');
    el.textContent = e.data.value;
    el.className = 'result ok';
  });
})();

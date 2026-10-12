(function () {
  var t = qa.testid;

  /* ---- Parent buttons that update the dynamic iframe ---- */
  var dynamicFrame = t('dynamic-iframe');
  function sendToFrame(text) {
    dynamicFrame.contentWindow.postMessage({ type: 'set-content', text: text }, location.origin);
  }
  t('set-frame-content-a-btn').addEventListener('click', function () { sendToFrame('Content A from parent'); });
  t('set-frame-content-b-btn').addEventListener('click', function () { sendToFrame('Content B from parent'); });
  t('clear-frame-content-btn').addEventListener('click', function () { sendToFrame(''); });
  t('reload-dynamic-frame-btn').addEventListener('click', function () {
    dynamicFrame.src = '/frames/dynamic-frame.html?t=' + Date.now();
  });

  /* ---- Iframe with a dynamic id and name (new values on every load) ---- */
  function mountDynamicIdFrame() {
    var suffix = qa.rand();
    var id = 'frame_' + suffix;
    var name = 'name_' + suffix;
    t('dynamic-id-frame-host').innerHTML =
      '<iframe class="h-sm" id="' + id + '" name="' + name + '" src="/frames/simple-frame.html" ' +
      'title="Iframe with dynamic id and name" data-testid="dynamic-id-iframe"></iframe>';
    t('dynamic-frame-id').textContent = id;
    t('dynamic-frame-name').textContent = name;
  }
  t('regenerate-frame-id-btn').addEventListener('click', mountDynamicIdFrame);
  mountDynamicIdFrame();
})();

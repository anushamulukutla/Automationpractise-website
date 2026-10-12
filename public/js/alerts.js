(function () {
  var t = qa.testid;
  function setResult(id, text, cls) {
    var el = t(id);
    el.textContent = text;
    el.className = 'result' + (cls ? ' ' + cls : '');
  }

  /* ---- Native dialogs ---- */
  t('js-alert-btn').addEventListener('click', function () {
    alert('Hello! I am a JavaScript alert.');
    setResult('alert-result', 'Alert was dismissed', 'ok');
  });

  t('js-confirm-btn').addEventListener('click', function () {
    var ok = confirm('Do you want to proceed?');
    setResult('confirm-result', ok ? 'You pressed OK' : 'You pressed Cancel', ok ? 'ok' : 'err');
  });

  t('js-prompt-btn').addEventListener('click', function () {
    var value = prompt('What is your name?', '');
    if (value === null) setResult('prompt-result', 'You dismissed the prompt', 'err');
    else setResult('prompt-result', 'You entered: ' + value, 'ok');
  });

  t('delayed-alert-btn').addEventListener('click', function () {
    var btn = t('delayed-alert-btn');
    btn.disabled = true;
    setResult('delayed-alert-status', 'Alert will fire in 5 seconds...');
    setTimeout(function () {
      alert('This alert was delayed by 5 seconds.');
      setResult('delayed-alert-status', 'Delayed alert was dismissed', 'ok');
      btn.disabled = false;
    }, 5000);
  });

  /* ---- Modal ---- */
  var backdrop = t('modal-backdrop');
  var lastFocus = null;
  function openModal() {
    lastFocus = document.activeElement;
    backdrop.hidden = false;
    t('modal-confirm-btn').focus();
  }
  function closeModal(resultText) {
    backdrop.hidden = true;
    if (resultText) setResult('modal-result', resultText, resultText === 'Modal confirmed' ? 'ok' : '');
    if (lastFocus) lastFocus.focus();
  }
  t('open-modal-btn').addEventListener('click', openModal);
  t('modal-close-btn').addEventListener('click', function () { closeModal('Modal closed with X'); });
  t('modal-cancel-btn').addEventListener('click', function () { closeModal('Modal cancelled'); });
  t('modal-confirm-btn').addEventListener('click', function () { closeModal('Modal confirmed'); });
  backdrop.addEventListener('click', function (e) { if (e.target === backdrop) closeModal('Modal closed by backdrop click'); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !backdrop.hidden) closeModal('Modal closed with Escape');
  });

  /* ---- Toasts (auto-dismiss after 3s) ---- */
  var TOAST_MS = 3000;
  var MESSAGES = { success: 'Saved successfully', error: 'Something went wrong', info: 'Here is some information' };
  function showToast(type) {
    var holder = document.createElement('div');
    holder.innerHTML =
      '<div class="toast ' + type + '" role="' + (type === 'error' ? 'alert' : 'status') + '" data-testid="toast-' + type + '">' +
      '<span data-testid="toast-message">' + MESSAGES[type] + '</span>' +
      '<button type="button" class="icon-btn" aria-label="Dismiss notification" data-testid="toast-close-btn">&times;</button>' +
      '</div>';
    var el = holder.firstChild;
    el.querySelector('button').addEventListener('click', function () { el.remove(); });
    t('toast-container').appendChild(el);
    setTimeout(function () { el.remove(); }, TOAST_MS);
  }
  ['success', 'error', 'info'].forEach(function (type) {
    t('toast-' + type + '-btn').addEventListener('click', function () { showToast(type); });
  });

  /* ---- Cookie banner ---- */
  function getConsent() {
    var m = document.cookie.match(/(?:^|;\s*)cookie_consent=([^;]*)/);
    return m ? decodeURIComponent(m[1]) : null;
  }
  function setConsent(value) {
    document.cookie = 'cookie_consent=' + encodeURIComponent(value) + '; path=/; max-age=31536000; SameSite=Lax';
    t('cookie-banner').hidden = true;
    renderConsent();
  }
  function renderConsent() {
    setResult('cookie-status', getConsent() || 'not set');
  }
  t('cookie-accept-btn').addEventListener('click', function () { setConsent('accepted'); });
  t('cookie-reject-btn').addEventListener('click', function () { setConsent('rejected'); });
  t('cookie-reset-btn').addEventListener('click', function () {
    document.cookie = 'cookie_consent=; path=/; max-age=0; SameSite=Lax';
    renderConsent();
    t('cookie-banner').hidden = false;
  });
  renderConsent();
  if (!getConsent()) setTimeout(function () { if (!getConsent()) t('cookie-banner').hidden = false; }, 1000);
})();

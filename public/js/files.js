(function () {
  var t = qa.testid;
  var MAX = 2 * 1024 * 1024;
  var ALLOWED = ['pdf', 'png', 'csv'];

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function setText(id, text, cls) {
    var el = t(id);
    el.textContent = text;
    el.className = 'result' + (cls ? ' ' + cls : '');
  }
  function fmtSize(n) {
    return n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(1) + ' KB' : (n / 1048576).toFixed(2) + ' MB';
  }

  /* ---- Client-side validation; the server validates again (including content) ---- */
  function check(file) {
    var ext = (file.name.split('.').pop() || '').toLowerCase();
    if (file.size === 0) return file.name + ': file is empty';
    if (ALLOWED.indexOf(ext) < 0) return file.name + ': type ".' + ext + '" is not allowed (pdf, png, csv only)';
    if (file.size > MAX) return file.name + ': exceeds the 2 MB limit (' + fmtSize(file.size) + ')';
    return null;
  }
  function showErrors(messages) {
    var box = t('upload-errors');
    box.hidden = messages.length === 0;
    box.innerHTML = messages.map(function (m) { return '<div data-testid="upload-error-item">' + esc(m) + '</div>'; }).join('');
  }

  /* ---- Upload helper: returns { saved, errors[] } ---- */
  function send(files, opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var errors = [];
      var valid = [];
      Array.prototype.forEach.call(files, function (f) {
        var problem = check(f);
        if (problem) errors.push(problem); else valid.push(f);
      });
      if (!valid.length) return resolve({ saved: 0, errors: errors });
      var fd = new FormData();
      valid.forEach(function (f) { fd.append('files', f); });
      var xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/upload' + (opts.delay ? '?delay=' + opts.delay : ''));
      if (opts.onProgress) xhr.upload.onprogress = function (e) { if (e.lengthComputable) opts.onProgress(Math.round((e.loaded / e.total) * 100)); };
      xhr.onload = function () {
        var data = {};
        try { data = JSON.parse(xhr.responseText); } catch (e) { /* keep empty */ }
        (data.results || []).forEach(function (r) { if (!r.ok) errors.push(r.name + ': ' + r.error); });
        if (!data.results) errors.push(data.error || 'Upload failed (HTTP ' + xhr.status + ')');
        resolve({ saved: data.saved || 0, errors: errors });
      };
      xhr.onerror = function () { errors.push('Network error during upload'); resolve({ saved: 0, errors: errors }); };
      xhr.send(fd);
    });
  }

  function report(statusId, result) {
    showErrors(result.errors);
    if (result.saved && !result.errors.length) setText(statusId, 'Uploaded ' + result.saved + ' file' + (result.saved > 1 ? 's' : '') + ' successfully', 'ok');
    else if (result.saved) setText(statusId, 'Uploaded ' + result.saved + ', ' + result.errors.length + ' failed', 'err');
    else setText(statusId, 'Upload failed', 'err');
    refresh();
  }

  /* ---- Uploaded files list ---- */
  async function refresh() {
    var res = await qa.api('/api/uploads');
    if (!res.ok) return;
    var body = t('uploaded-files-body');
    body.innerHTML = res.data.data.map(function (f) {
      return '<tr data-testid="uploaded-file-row"><td data-testid="uploaded-file-name">' + esc(f.name) + '</td><td>' + esc(f.type) + '</td><td>' + fmtSize(f.size) +
        '</td><td><button type="button" class="btn danger" data-id="' + f.id + '" aria-label="Delete ' + esc(f.name) + '" data-testid="delete-file-btn">Delete</button></td></tr>';
    }).join('');
    t('no-files-message').hidden = res.data.total > 0;
    t('uploaded-count').textContent = res.data.total;
  }
  t('uploaded-files-body').addEventListener('click', async function (e) {
    var btn = e.target.closest('[data-testid="delete-file-btn"]');
    if (!btn) return;
    await qa.api('/api/uploads/' + btn.getAttribute('data-id'), { method: 'DELETE' });
    refresh();
  });

  /* ---- Single and multiple ---- */
  t('single-upload-btn').addEventListener('click', async function () {
    var input = t('single-file-input');
    if (!input.files.length) { setText('single-upload-status', 'Choose a file first', 'err'); return; }
    setText('single-upload-status', 'Uploading...');
    report('single-upload-status', await send(input.files));
  });
  t('multi-upload-btn').addEventListener('click', async function () {
    var input = t('multi-file-input');
    if (!input.files.length) { setText('multi-upload-status', 'Choose files first', 'err'); return; }
    setText('multi-upload-status', 'Uploading...');
    report('multi-upload-status', await send(input.files));
  });

  /* ---- Drag and drop ---- */
  var zone = t('drop-zone');
  var zoneInput = t('drop-zone-input');
  async function handleDropped(files) {
    if (!files.length) return;
    setText('drop-zone-status', 'Uploading ' + files.length + ' file(s)...');
    report('drop-zone-status', await send(files));
  }
  ['dragenter', 'dragover'].forEach(function (name) {
    zone.addEventListener(name, function (e) { e.preventDefault(); zone.classList.add('over'); });
  });
  ['dragleave', 'drop'].forEach(function (name) {
    zone.addEventListener(name, function (e) { e.preventDefault(); zone.classList.remove('over'); });
  });
  zone.addEventListener('drop', function (e) { handleDropped(e.dataTransfer.files); });
  zoneInput.addEventListener('change', function () { handleDropped(zoneInput.files); zoneInput.value = ''; });
  zone.addEventListener('click', function (e) { if (e.target !== zoneInput) zoneInput.click(); });
  zone.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); zoneInput.click(); } });

  /* ---- Upload with progress ---- */
  var bar = t('upload-progress');
  var fill = t('upload-progress-fill');
  function paint(v) {
    bar.setAttribute('aria-valuenow', v);
    fill.style.width = v + '%';
  }
  t('progress-upload-btn').addEventListener('click', async function () {
    var input = t('progress-file-input');
    var btn = t('progress-upload-btn');
    if (!input.files.length) { setText('progress-status', 'Choose a file first', 'err'); return; }
    var problem = check(input.files[0]);
    if (problem) { showErrors([problem]); setText('progress-status', 'Upload failed', 'err'); return; }
    btn.disabled = true;
    paint(0);
    setText('progress-status', 'Uploading...');
    var result = await send(input.files, {
      delay: 2000,
      onProgress: function (p) { paint(Math.min(p, 99)); setText('progress-status', 'Uploading... ' + p + '%'); },
    });
    btn.disabled = false;
    if (result.saved) {
      paint(100);
      showErrors(result.errors);
      setText('progress-status', 'Upload complete', 'ok');
    } else {
      showErrors(result.errors);
      paint(0);
      setText('progress-status', 'Upload failed', 'err');
    }
    refresh();
  });

  /* ---- Delayed download (fetch, then save as a file) ---- */
  t('delayed-download-btn').addEventListener('click', async function () {
    var btn = t('delayed-download-btn');
    btn.disabled = true;
    setText('download-status', 'Preparing download...');
    try {
      var res = await fetch('/api/download/delayed?ms=3000&kind=pdf');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var blob = await res.blob();
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'delayed-sample.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
      setText('download-status', 'Download ready: delayed-sample.pdf', 'ok');
    } catch (e) {
      setText('download-status', 'Download failed (' + e.message + ')', 'err');
    }
    btn.disabled = false;
  });

  refresh();
})();

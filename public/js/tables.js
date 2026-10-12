(function () {
  var t = qa.testid;
  var all = [];
  var state = { sort: null, dir: 'asc', filter: '', dept: '', size: 10, page: 1 };
  var selected = {};   // id -> true (selection survives paging and filtering)
  var expanded = {};   // id -> true

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function money(n) { return '$' + Number(n).toLocaleString('en-US'); }

  function visibleRows() {
    var q = state.filter.trim().toLowerCase();
    var rows = all.filter(function (r) {
      if (state.dept && r.department !== state.dept) return false;
      return !q || (r.name + ' ' + r.email + ' ' + r.notes).toLowerCase().indexOf(q) >= 0;
    });
    if (state.sort) {
      var k = state.sort, m = state.dir === 'asc' ? 1 : -1;
      rows = rows.slice().sort(function (a, b) {
        var x = a[k], y = b[k];
        return (typeof x === 'number' ? x - y : String(x).localeCompare(String(y))) * m;
      });
    }
    return rows;
  }

  function render() {
    var rows = visibleRows();
    var pages = Math.max(1, Math.ceil(rows.length / state.size));
    state.page = Math.min(state.page, pages);
    var start = (state.page - 1) * state.size;
    var pageRows = rows.slice(start, start + state.size);

    t('table-body').innerHTML = pageRows.map(function (r) {
      var open = !!expanded[r.id];
      return '<tr data-testid="table-row-' + r.id + '"' + (selected[r.id] ? ' aria-selected="true"' : '') + '>' +
        '<td><input type="checkbox" data-id="' + r.id + '" aria-label="Select ' + esc(r.name) + '"' + (selected[r.id] ? ' checked' : '') + ' data-testid="row-select-' + r.id + '"></td>' +
        '<td data-testid="id-cell-' + r.id + '">' + r.id + '</td>' +
        '<td class="editable" data-id="' + r.id + '" data-field="name" data-testid="name-cell-' + r.id + '">' + esc(r.name) + '</td>' +
        '<td data-testid="department-cell-' + r.id + '">' + esc(r.department) + '</td>' +
        '<td data-testid="status-cell-' + r.id + '">' + esc(r.status) + '</td>' +
        '<td class="editable" data-id="' + r.id + '" data-field="salary" data-testid="salary-cell-' + r.id + '">' + money(r.salary) + '</td>' +
        '<td><button type="button" class="btn secondary" data-expand="' + r.id + '" aria-expanded="' + open + '" data-testid="expand-' + r.id + '-btn">' + (open ? 'Hide' : 'Details') + '</button></td></tr>' +
        (open ? '<tr class="detail-row" data-testid="row-details-' + r.id + '"><td></td><td colspan="6"><strong>Email:</strong> <span data-testid="detail-email-' + r.id + '">' + esc(r.email) +
          '</span><br><strong>Joined:</strong> ' + esc(r.joined) + '<br><strong>Notes:</strong> ' + esc(r.notes) + '</td></tr>' : '');
    }).join('');

    t('table-empty').hidden = rows.length > 0;
    var first = rows.length ? start + 1 : 0;
    t('page-info').textContent = 'Showing ' + first + '-' + (start + pageRows.length) + ' of ' + rows.length + ' rows (page ' + state.page + ' of ' + pages + ')';
    t('page-first-btn').disabled = t('page-prev-btn').disabled = state.page === 1;
    t('page-next-btn').disabled = t('page-last-btn').disabled = state.page === pages;

    // numbered buttons around the current page
    var nums = [];
    for (var p = Math.max(1, state.page - 2); p <= Math.min(pages, state.page + 2); p++) nums.push(p);
    t('page-buttons').innerHTML = nums.map(function (p) {
      return '<button type="button" class="btn ' + (p === state.page ? '' : 'secondary') + '" data-page="' + p + '"' + (p === state.page ? ' aria-current="page"' : '') + ' data-testid="page-btn-' + p + '">' + p + '</button>';
    }).join('');

    // header sort state
    Array.prototype.forEach.call(document.querySelectorAll('th[data-col]'), function (th) {
      th.setAttribute('aria-sort', state.sort === th.getAttribute('data-col') ? (state.dir === 'asc' ? 'ascending' : 'descending') : 'none');
    });

    var allChecked = pageRows.length > 0 && pageRows.every(function (r) { return selected[r.id]; });
    var some = pageRows.some(function (r) { return selected[r.id]; });
    var selAll = t('select-all-checkbox');
    selAll.checked = allChecked;
    selAll.indeterminate = some && !allChecked;
    var n = Object.keys(selected).length;
    t('selected-count').textContent = n + ' selected';
  }

  /* ---- Sorting ---- */
  document.querySelector('thead').addEventListener('click', function (e) {
    var th = e.target.closest('th[data-col]');
    if (!th) return;
    var col = th.getAttribute('data-col');
    if (state.sort === col) state.dir = state.dir === 'asc' ? 'desc' : 'asc'; else { state.sort = col; state.dir = 'asc'; }
    state.page = 1;
    render();
  });

  /* ---- Filtering and page size ---- */
  t('table-filter-input').addEventListener('input', function (e) { state.filter = e.target.value; state.page = 1; render(); });
  t('table-dept-filter').addEventListener('change', function (e) { state.dept = e.target.value; state.page = 1; render(); });
  t('page-size-select').addEventListener('change', function (e) { state.size = Number(e.target.value); state.page = 1; render(); });

  /* ---- Pagination ---- */
  function lastPage() { return Math.max(1, Math.ceil(visibleRows().length / state.size)); }
  t('page-first-btn').addEventListener('click', function () { state.page = 1; render(); });
  t('page-prev-btn').addEventListener('click', function () { state.page = Math.max(1, state.page - 1); render(); });
  t('page-next-btn').addEventListener('click', function () { state.page = Math.min(lastPage(), state.page + 1); render(); });
  t('page-last-btn').addEventListener('click', function () { state.page = lastPage(); render(); });
  t('page-buttons').addEventListener('click', function (e) {
    var b = e.target.closest('[data-page]');
    if (b) { state.page = Number(b.getAttribute('data-page')); render(); }
  });

  /* ---- Selection ---- */
  t('table-body').addEventListener('change', function (e) {
    var cb = e.target.closest('input[type="checkbox"][data-id]');
    if (!cb) return;
    if (cb.checked) selected[cb.getAttribute('data-id')] = true; else delete selected[cb.getAttribute('data-id')];
    render();
  });
  t('select-all-checkbox').addEventListener('change', function (e) {
    var rows = visibleRows();
    var start = (state.page - 1) * state.size;
    rows.slice(start, start + state.size).forEach(function (r) {
      if (e.target.checked) selected[r.id] = true; else delete selected[r.id];
    });
    render();
  });
  t('clear-selection-btn').addEventListener('click', function () { selected = {}; render(); });

  /* ---- Expandable rows ---- */
  t('table-body').addEventListener('click', function (e) {
    var b = e.target.closest('[data-expand]');
    if (!b) return;
    var id = b.getAttribute('data-expand');
    if (expanded[id]) delete expanded[id]; else expanded[id] = true;
    render();
  });

  /* ---- Inline editing (double-click a name or salary cell) ---- */
  t('table-body').addEventListener('dblclick', function (e) {
    var cell = e.target.closest('td.editable');
    if (!cell || cell.querySelector('input')) return;
    var id = Number(cell.getAttribute('data-id'));
    var field = cell.getAttribute('data-field');
    var row = all.filter(function (r) { return r.id === id; })[0];
    var original = row[field];
    cell.innerHTML = '<input type="' + (field === 'salary' ? 'number' : 'text') + '" class="cell-input" aria-label="Edit ' + field + '" data-testid="cell-input" value="' + esc(original) + '">';
    var input = cell.querySelector('input');
    input.focus();
    input.select();
    var done = false;
    function finish(save) {
      if (done) return;
      done = true;
      if (save) {
        var v = input.value.trim();
        if (field === 'salary') v = Number(v);
        var bad = field === 'salary' ? !(v >= 0) || isNaN(v) : v.length < 2;
        if (bad) {
          t('edit-status').textContent = 'Invalid ' + field + ', change discarded';
          t('edit-status').className = 'result err';
        } else {
          row[field] = v;
          t('edit-status').textContent = 'Saved ' + field + ' for row ' + id;
          t('edit-status').className = 'result ok';
        }
      }
      render();
    }
    input.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') finish(true);
      else if (ev.key === 'Escape') finish(false);
    });
    input.addEventListener('blur', function () { finish(true); });
  });

  qa.api('/api/table-data').then(function (res) {
    if (!res.ok) { t('page-info').textContent = 'Failed to load data (HTTP ' + res.status + ')'; return; }
    all = res.data;
    render();
  });
})();

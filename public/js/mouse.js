(function () {
  var t = qa.testid;
  function setText(id, text, cls) {
    var el = t(id);
    el.textContent = text;
    el.className = 'result' + (cls ? ' ' + cls : '');
  }

  /* ---- Hover menu (also opens on keyboard focus) ---- */
  var wrap = t('hover-menu-wrap');
  var menu = t('hover-menu');
  function showMenu() { menu.hidden = false; }
  function hideMenu() { menu.hidden = true; }
  wrap.addEventListener('mouseenter', showMenu);
  wrap.addEventListener('mouseleave', hideMenu);
  wrap.addEventListener('focusin', showMenu);
  wrap.addEventListener('focusout', function (e) { if (!wrap.contains(e.relatedTarget)) hideMenu(); });
  menu.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    setText('hover-result', 'You chose: ' + b.textContent, 'ok');
    hideMenu();
  });

  /* ---- Tooltip ---- */
  var tipTrigger = t('tooltip-trigger');
  var tip = t('tooltip');
  tipTrigger.addEventListener('mouseenter', function () { tip.hidden = false; });
  tipTrigger.addEventListener('mouseleave', function () { tip.hidden = true; });
  tipTrigger.addEventListener('focus', function () { tip.hidden = false; });
  tipTrigger.addEventListener('blur', function () { tip.hidden = true; });

  /* ---- Context menu (right-click) ---- */
  var ctxArea = t('context-area');
  var ctx = t('context-menu');
  ctxArea.addEventListener('contextmenu', function (e) {
    e.preventDefault();
    ctx.hidden = false;
    ctx.style.left = Math.min(e.clientX, window.innerWidth - 160) + 'px';
    ctx.style.top = Math.min(e.clientY, window.innerHeight - 140) + 'px';
    ctx.querySelector('button').focus();
  });
  ctx.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    setText('context-result', 'Context action: ' + b.getAttribute('data-action'), 'ok');
    ctx.hidden = true;
  });
  document.addEventListener('click', function (e) { if (!ctx.hidden && !ctx.contains(e.target)) ctx.hidden = true; });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') ctx.hidden = true; });

  /* ---- Double-click ---- */
  var clicks = 0;
  t('double-click-btn').addEventListener('click', function () { clicks++; t('click-count').textContent = clicks; });
  t('double-click-btn').addEventListener('dblclick', function () { setText('double-click-result', 'Double-click detected!', 'ok'); });

  /* ---- Drag and drop (mouse events, so it works the same in every automation tool) ---- */
  var src = t('drag-source');
  var target = t('drop-target');
  var drag = null;
  function overlaps(a, b) {
    var x = a.getBoundingClientRect(), y = b.getBoundingClientRect();
    var cx = x.left + x.width / 2, cy = x.top + x.height / 2;
    return cx >= y.left && cx <= y.right && cy >= y.top && cy <= y.bottom;
  }
  src.addEventListener('mousedown', function (e) {
    if (e.button !== 0) return;
    e.preventDefault();
    drag = { x: e.clientX, y: e.clientY, dx: 0, dy: 0 };
    src.classList.add('dragging');
    setText('drag-result', 'Dragging...');
  });
  document.addEventListener('mousemove', function (e) {
    if (!drag) return;
    drag.dx = e.clientX - drag.x;
    drag.dy = e.clientY - drag.y;
    src.style.transform = 'translate(' + drag.dx + 'px,' + drag.dy + 'px)';
    target.classList.toggle('hot', overlaps(src, target));
  });
  document.addEventListener('mouseup', function () {
    if (!drag) return;
    var hit = overlaps(src, target);
    src.classList.remove('dragging');
    target.classList.remove('hot');
    if (hit) {
      src.style.transform = '';
      target.textContent = 'Dropped!';
      target.appendChild(src);
      setText('drag-result', 'Dropped on target', 'ok');
    } else {
      src.style.transform = '';
      setText('drag-result', 'Dropped outside the target', 'err');
    }
    drag = null;
  });
  t('drag-reset-btn').addEventListener('click', function () {
    var area = t('drag-area');
    src.style.transform = '';
    target.textContent = 'Drop here';
    area.insertBefore(src, target);
    setText('drag-result', 'Not dropped yet');
  });

  /* ---- Sortable list (drag to reorder, or Alt+Arrow) ---- */
  var list = t('sortable-list');
  var dragging = null;
  function reportOrder() {
    t('sortable-order').textContent = Array.prototype.map.call(list.children, function (li) { return li.getAttribute('data-id'); }).join(', ');
  }
  list.addEventListener('mousedown', function (e) {
    var li = e.target.closest('li');
    if (!li || e.button !== 0) return;
    e.preventDefault();
    dragging = li;
    li.classList.add('dragging');
  });
  document.addEventListener('mousemove', function (e) {
    if (!dragging) return;
    var items = Array.prototype.filter.call(list.children, function (li) { return li !== dragging; });
    var next = items.filter(function (li) {
      var r = li.getBoundingClientRect();
      return e.clientY < r.top + r.height / 2;
    })[0];
    if (next) { if (dragging.nextSibling !== next) list.insertBefore(dragging, next); }
    else if (list.lastChild !== dragging) list.appendChild(dragging);
  });
  document.addEventListener('mouseup', function () {
    if (!dragging) return;
    dragging.classList.remove('dragging');
    dragging = null;
    reportOrder();
  });
  list.addEventListener('keydown', function (e) {
    var li = e.target.closest('li');
    if (!li || !e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
    e.preventDefault();
    if (e.key === 'ArrowUp' && li.previousElementSibling) list.insertBefore(li, li.previousElementSibling);
    if (e.key === 'ArrowDown' && li.nextElementSibling) list.insertBefore(li.nextElementSibling, li);
    li.focus();
    reportOrder();
  });

  /* ---- Keyboard shortcuts and key display ---- */
  var keyInput = t('key-input');
  keyInput.addEventListener('keydown', function (e) {
    var mods = [];
    if (e.ctrlKey) mods.push('Ctrl');
    if (e.altKey) mods.push('Alt');
    if (e.shiftKey) mods.push('Shift');
    if (e.metaKey) mods.push('Meta');
    t('key-display').textContent = e.key === ' ' ? 'Space' : e.key;
    t('key-code').textContent = e.code;
    t('key-modifiers').textContent = mods.length ? mods.join('+') : 'none';

    var k = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && k === 's') { e.preventDefault(); setText('shortcut-result', 'Shortcut: Save (Ctrl+S)', 'ok'); }
    else if ((e.ctrlKey || e.metaKey) && e.shiftKey && k === 'k') { e.preventDefault(); keyInput.value = ''; setText('shortcut-result', 'Shortcut: Clear (Ctrl+Shift+K)', 'ok'); }
    else if (e.altKey && k === 'h') { e.preventDefault(); setText('shortcut-result', 'Shortcut: Help (Alt+H)', 'ok'); }
    else if (e.key === 'Escape') { setText('shortcut-result', 'Shortcut: Reset (Escape)', 'ok'); }
  });

  /* ---- Scroll into view ---- */
  var scrollTarget = t('scroll-target');
  t('scroll-to-target-btn').addEventListener('click', function () {
    scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      var vis = entries.some(function (e) { return e.isIntersecting; });
      setText('scroll-status', vis ? 'Target is visible' : 'Target is not visible', vis ? 'ok' : '');
    }, { threshold: 0.6 }).observe(scrollTarget);
  }
  t('scroll-target-btn').addEventListener('click', function () { setText('scroll-target-result', 'Clicked the bottom button', 'ok'); });
})();

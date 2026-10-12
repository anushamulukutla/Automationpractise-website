(function () {
  var t = qa.testid;

  function selectedLabels(select) {
    return Array.prototype.filter.call(select.options, function (o) { return o.selected; }).map(function (o) { return o.text; });
  }

  /* ---- Native selects ---- */
  t('native-single-select').addEventListener('change', function (e) {
    var o = e.target.selectedOptions[0];
    t('native-select-result').textContent = e.target.value ? 'Selected: ' + o.text : 'Nothing selected';
  });
  t('native-multi-select').addEventListener('change', function (e) {
    var labels = selectedLabels(e.target);
    t('multi-select-result').textContent = labels.length ? 'Selected: ' + labels.join(', ') : 'Nothing selected';
  });
  t('grouped-select').addEventListener('change', function (e) {
    var o = e.target.selectedOptions[0];
    var group = o.parentElement.tagName === 'OPTGROUP' ? ' (' + o.parentElement.label + ')' : '';
    t('grouped-select-result').textContent = e.target.value ? 'Selected: ' + o.text + group : 'Nothing selected';
  });

  /* ---- Custom (div-based) dropdowns, with an optional search box ---- */
  function initDropdown(prefix, options, opts) {
    opts = opts || {};
    var trigger = t(prefix + '-trigger');
    var menu = t(prefix + '-menu');
    var list = t(prefix + '-list');
    var search = opts.searchable ? t(prefix + '-search') : null;
    var empty = opts.searchable ? t(prefix + '-empty') : null;
    var selectedOut = t(prefix + '-selected');
    var placeholder = trigger.textContent;
    var chosen = null;
    var active = -1;

    function visibleOptions() {
      return Array.prototype.slice.call(list.querySelectorAll('.dd-option')).filter(function (el) { return !el.hidden; });
    }
    function setActive(i) {
      var items = visibleOptions();
      items.forEach(function (el) { el.classList.remove('active'); });
      if (!items.length) { active = -1; return; }
      active = Math.max(0, Math.min(i, items.length - 1));
      items[active].classList.add('active');
      items[active].scrollIntoView({ block: 'nearest' });
    }
    function open() {
      menu.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
      if (search) { search.value = ''; filter(''); search.focus(); }
      setActive(0);
    }
    function close(returnFocus) {
      menu.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
      if (returnFocus) trigger.focus();
    }
    function choose(opt) {
      chosen = opt;
      trigger.textContent = opt.label;
      selectedOut.textContent = opt.label;
      selectedOut.className = 'result ok';
      Array.prototype.forEach.call(list.querySelectorAll('.dd-option'), function (el) {
        el.setAttribute('aria-selected', String(el.getAttribute('data-value') === opt.value));
      });
      close(true);
    }
    function filter(q) {
      q = q.trim().toLowerCase();
      var shown = 0;
      Array.prototype.forEach.call(list.querySelectorAll('.dd-option'), function (el) {
        var match = el.textContent.toLowerCase().indexOf(q) >= 0;
        el.hidden = !match;
        if (match) shown++;
      });
      if (empty) empty.hidden = shown > 0;
      setActive(0);
    }

    list.innerHTML = options.map(function (o) {
      return '<li class="dd-option" role="option" tabindex="-1" aria-selected="false" data-value="' + o.value +
        '" data-testid="' + prefix + '-option-' + o.value + '">' + o.label + '</li>';
    }).join('');

    Array.prototype.forEach.call(list.querySelectorAll('.dd-option'), function (el, i) {
      el.addEventListener('click', function () {
        choose(options.filter(function (o) { return o.value === el.getAttribute('data-value'); })[0]);
      });
    });
    trigger.addEventListener('click', function () { menu.hidden ? open() : close(false); });
    // One keyboard handler for the whole widget, so it works whether focus is on the trigger or the search box.
    trigger.parentElement.addEventListener('keydown', function (e) {
      if (menu.hidden) {
        if (e.target === trigger && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          open();
        }
        return;
      }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        var items = visibleOptions();
        if (items[active]) items[active].click();
      } else if (e.key === 'Escape') { e.preventDefault(); close(true); }
    });
    if (search) search.addEventListener('input', function () { filter(search.value); });
    document.addEventListener('click', function (e) {
      if (!menu.hidden && !trigger.parentElement.contains(e.target)) close(false);
    });
    trigger.textContent = placeholder;
    return { get value() { return chosen; } };
  }

  initDropdown('custom-dropdown', [
    { value: 'red', label: 'Red' }, { value: 'green', label: 'Green' }, { value: 'blue', label: 'Blue' },
    { value: 'orange', label: 'Orange' }, { value: 'purple', label: 'Purple' },
  ]);
  initDropdown('searchable-dropdown', [
    { value: 'javascript', label: 'JavaScript' }, { value: 'typescript', label: 'TypeScript' },
    { value: 'python', label: 'Python' }, { value: 'java', label: 'Java' }, { value: 'csharp', label: 'C#' },
    { value: 'go', label: 'Go' }, { value: 'ruby', label: 'Ruby' }, { value: 'kotlin', label: 'Kotlin' },
    { value: 'swift', label: 'Swift' }, { value: 'rust', label: 'Rust' },
  ], { searchable: true });

  /* ---- Dependent dropdowns: Country -> State -> City (API) ---- */
  var country = t('country-select');
  var state = t('state-select');
  var city = t('city-select');
  var depResult = t('dependent-result');

  function fill(select, items, placeholder, valueKey, labelKey) {
    select.innerHTML = '<option value="">' + placeholder + '</option>' +
      items.map(function (i) { return '<option value="' + i[valueKey] + '">' + i[labelKey] + '</option>'; }).join('');
  }
  function resetSelect(select, placeholder) {
    select.innerHTML = '<option value="">' + placeholder + '</option>';
    select.disabled = true;
  }
  function describeSelection() {
    if (!country.value) { depResult.textContent = 'No location selected'; return; }
    var parts = [];
    if (city.value) parts.push(city.selectedOptions[0].text);
    if (state.value) parts.push(state.selectedOptions[0].text);
    parts.push(country.selectedOptions[0].text);
    depResult.textContent = 'Selected: ' + parts.join(', ');
  }
  async function load(select, path, placeholder, valueKey, labelKey) {
    select.disabled = true;
    select.setAttribute('aria-busy', 'true');
    select.innerHTML = '<option value="">Loading...</option>';
    var res = await qa.api(path);
    select.removeAttribute('aria-busy');
    if (!res.ok) {
      select.innerHTML = '<option value="">Failed to load (HTTP ' + res.status + ')</option>';
      depResult.textContent = 'Error loading options: HTTP ' + res.status;
      depResult.className = 'result err';
      return false;
    }
    depResult.className = 'result';
    fill(select, res.data, placeholder, valueKey, labelKey);
    select.disabled = false;
    return true;
  }

  load(country, '/api/countries', 'Select a country', 'code', 'name');
  country.addEventListener('change', async function () {
    resetSelect(state, 'Select a country first');
    resetSelect(city, 'Select a state first');
    describeSelection();
    if (country.value) {
      await load(state, '/api/countries/' + country.value + '/states', 'Select a state', 'code', 'name');
      resetSelect(city, 'Select a state first');
    }
  });
  state.addEventListener('change', async function () {
    resetSelect(city, 'Select a state first');
    describeSelection();
    if (state.value) {
      await load(city, '/api/countries/' + country.value + '/states/' + state.value + '/cities', 'Select a city', 'name', 'name');
    }
  });
  city.addEventListener('change', describeSelection);

  /* ---- Autocomplete / typeahead ---- */
  var acInput = t('autocomplete-input');
  var acList = t('autocomplete-list');
  var acLoading = t('autocomplete-loading');
  var acResult = t('autocomplete-result');
  var acTimer = null;
  var acRequest = 0;

  function hideSuggestions() {
    acList.hidden = true;
    acInput.setAttribute('aria-expanded', 'false');
  }
  acInput.addEventListener('input', function () {
    clearTimeout(acTimer);
    var q = acInput.value.trim();
    if (!q) { hideSuggestions(); acLoading.hidden = true; return; }
    acTimer = setTimeout(async function () {
      var mine = ++acRequest;
      acLoading.hidden = false;
      var res = await qa.api('/api/autocomplete?q=' + encodeURIComponent(q));
      if (mine !== acRequest) return; // a newer search is in flight
      acLoading.hidden = true;
      var names = res.ok ? res.data : [];
      acList.innerHTML = names.length
        ? names.map(function (n) {
            return '<li class="dd-option" role="option" tabindex="-1" data-testid="autocomplete-suggestion">' + n + '</li>';
          }).join('')
        : '<li class="dd-empty" data-testid="autocomplete-no-results">No matches</li>';
      acList.hidden = false;
      acInput.setAttribute('aria-expanded', 'true');
    }, 250);
  });
  acList.addEventListener('click', function (e) {
    var li = e.target.closest('.dd-option');
    if (!li) return;
    acInput.value = li.textContent;
    acResult.textContent = li.textContent;
    acResult.className = 'result ok';
    hideSuggestions();
  });
  acInput.addEventListener('keydown', function (e) { if (e.key === 'Escape') hideSuggestions(); });
  document.addEventListener('click', function (e) {
    if (!acInput.parentElement.contains(e.target)) hideSuggestions();
  });

  /* ---- Dropdown whose options load after a delay ---- */
  var delayed = t('delayed-select');
  var delayedStatus = t('delayed-select-status');
  var loadBtn = t('load-delayed-options-btn');
  loadBtn.addEventListener('click', async function () {
    loadBtn.disabled = true;
    delayed.disabled = true;
    delayed.innerHTML = '<option value="">Loading...</option>';
    delayedStatus.textContent = 'Loading options...';
    delayedStatus.className = 'result';
    var res = await qa.api('/api/delayed-options?ms=3000');
    if (!res.ok) {
      delayedStatus.textContent = 'Failed to load options (HTTP ' + res.status + ')';
      delayedStatus.className = 'result err';
      delayed.innerHTML = '<option value="">No options yet</option>';
      loadBtn.disabled = false;
      return;
    }
    fill(delayed, res.data, 'Choose an option', 'value', 'label');
    delayed.disabled = false;
    delayedStatus.textContent = 'Loaded ' + res.data.length + ' options';
    delayedStatus.className = 'result ok';
    loadBtn.disabled = false;
  });
  delayed.addEventListener('change', function () {
    t('delayed-select-result').textContent = delayed.value ? 'Selected: ' + delayed.selectedOptions[0].text : 'Nothing selected';
  });
})();

(function () {
  var t = qa.testid;
  var EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  var PHONE = /^\+?[0-9\-\s()]{7,15}$/;
  var PASSWORD_OK = function (v) { return v.length >= 8 && /[A-Z]/.test(v) && /[0-9]/.test(v); };

  function setError(prefix, msg, inputTid) {
    var el = t(prefix + '-error');
    el.textContent = msg || '';
    var input = inputTid ? t(inputTid) : t(prefix + '-input');
    if (input) {
      if (msg) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
    }
  }

  /* ---------------- Registration form ---------------- */
  var form = t('registration-form');
  var f = function (name) { return form.elements[name]; };

  // Each rule returns an error string, or '' when the field is valid.
  var rules = {
    fullName: { error: 'reg-fullname', run: function () { return f('fullName').value.trim().length < 2 ? 'Full name must be at least 2 characters' : ''; } },
    email: { error: 'reg-email', run: function () {
      var v = f('email').value.trim();
      return !v ? 'Email is required' : !EMAIL.test(v) ? 'Enter a valid email address' : '';
    } },
    password: { error: 'reg-password', run: function () {
      var v = f('password').value;
      return !v ? 'Password is required' : !PASSWORD_OK(v) ? 'Password needs 8+ characters, an uppercase letter and a number' : '';
    } },
    confirm: { error: 'reg-confirm', run: function () {
      return f('confirm').value !== f('password').value ? 'Passwords do not match' : (!f('confirm').value ? 'Please confirm your password' : '');
    } },
    phone: { error: 'reg-phone', run: function () {
      var v = f('phone').value.trim();
      return v && !PHONE.test(v) ? 'Enter a valid phone number' : '';
    } },
    dob: { error: 'reg-dob', run: function () {
      var v = f('dob').value;
      if (!v) return 'Date of birth is required';
      var age = (Date.now() - new Date(v).getTime()) / (365.25 * 24 * 3600 * 1000);
      return age < 18 ? 'You must be at least 18 years old' : '';
    } },
    gender: { error: 'reg-gender', input: 'reg-gender-female', run: function () { return form.querySelector('input[name="gender"]:checked') ? '' : 'Please choose an option'; } },
    bio: { error: 'reg-bio', input: 'reg-bio-textarea', run: function () { return f('bio').value.length > 200 ? 'Bio must be 200 characters or fewer' : ''; } },
    terms: { error: 'reg-terms', input: 'reg-terms-checkbox', run: function () { return f('terms').checked ? '' : 'You must accept the terms' ; } },
    human: { error: 'human', input: 'human-checkbox', run: function () { return f('human').checked ? '' : 'Please confirm you are human'; } },
  };

  function validateField(name) {
    var r = rules[name];
    var msg = r.run();
    setError(r.error, msg, r.input);
    return msg;
  }

  // Inline validation: when leaving a field, and live once a field has shown an error.
  Object.keys(rules).forEach(function (name) {
    var els = form.querySelectorAll('[name="' + name + '"]');
    Array.prototype.forEach.call(els, function (el) {
      el.addEventListener('blur', function () { validateField(name); });
      el.addEventListener('input', function () {
        if (t(rules[name].error + '-error').textContent) validateField(name);
        if (name === 'password' && f('confirm').value) validateField('confirm');
      });
      el.addEventListener('change', function () { if (el.type === 'checkbox' || el.type === 'radio') validateField(name); });
    });
  });

  var slider = t('reg-experience-slider');
  slider.addEventListener('input', function () { t('reg-experience-value').textContent = slider.value; });
  var bio = t('reg-bio-textarea');
  bio.addEventListener('input', function () { t('reg-bio-count').textContent = bio.value.length; });

  var summary = t('form-error-summary');
  var success = t('registration-success');

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    success.hidden = true;
    var problems = [];
    Object.keys(rules).forEach(function (name) {
      var msg = validateField(name);
      if (msg) problems.push(msg);
    });
    if (problems.length) {
      summary.innerHTML = '<strong>Please fix ' + problems.length + ' error' + (problems.length > 1 ? 's' : '') + ':</strong><ul>' +
        problems.map(function (p) { return '<li data-testid="form-error-item">' + p + '</li>'; }).join('') + '</ul>';
      summary.hidden = false;
      summary.focus();
      return;
    }
    summary.hidden = true;
    var interests = Array.prototype.map.call(form.querySelectorAll('input[name="interests"]:checked'), function (c) { return c.value; });
    var res = await qa.api('/api/register', {
      method: 'POST',
      body: { fullName: f('fullName').value.trim(), email: f('email').value.trim(), password: f('password').value, phone: f('phone').value.trim(), interests: interests },
    });
    if (res.ok) {
      success.textContent = 'Registration successful! Welcome, ' + f('fullName').value.trim() + '.';
      success.hidden = false;
      form.reset();
      t('reg-experience-value').textContent = '3';
      t('reg-bio-count').textContent = '0';
    } else {
      var errs = (res.data && res.data.errors) || {};
      if (errs.email) setError('reg-email', errs.email);
      if (errs.password) setError('reg-password', errs.password);
      if (errs.fullName) setError('reg-fullname', errs.fullName);
      if (errs.phone) setError('reg-phone', errs.phone);
      summary.innerHTML = '<strong>Registration failed:</strong> ' + ((res.data && res.data.error) || 'HTTP ' + res.status);
      summary.hidden = false;
      summary.focus();
    }
  });

  t('reg-reset-btn').addEventListener('click', function () {
    form.reset();
    Object.keys(rules).forEach(function (name) { setError(rules[name].error, '', rules[name].input); });
    summary.hidden = true;
    success.hidden = true;
    t('reg-experience-value').textContent = '3';
    t('reg-bio-count').textContent = '0';
  });

  /* ---------------- Multi-step wizard ---------------- */
  var wiz = t('wizard-form');
  var step = 1;
  var checks = {
    1: function () {
      var ok = true;
      var email = t('wizard-email-input').value.trim();
      var pw = t('wizard-password-input').value;
      setError('wizard-email', !EMAIL.test(email) ? 'Enter a valid email address' : '');
      setError('wizard-password', !PASSWORD_OK(pw) ? 'Password needs 8+ characters, an uppercase letter and a number' : '');
      return EMAIL.test(email) && PASSWORD_OK(pw);
    },
    2: function () {
      var name = t('wizard-name-input').value.trim();
      var country = t('wizard-country-select').value;
      setError('wizard-name', name.length < 2 ? 'Full name must be at least 2 characters' : '');
      setError('wizard-country', !country ? 'Please choose a country' : '', 'wizard-country-select');
      return name.length >= 2 && !!country;
    },
  };

  function showStep(n) {
    step = n;
    [1, 2, 3].forEach(function (i) {
      t('wizard-step-' + i).hidden = i !== n;
      var label = t('wizard-step-label-' + i);
      if (i === n) label.setAttribute('aria-current', 'step'); else label.removeAttribute('aria-current');
      label.classList.toggle('done', i < n);
    });
    t('wizard-step-indicator').textContent = 'Step ' + n + ' of 3';
    t('wizard-back-btn').hidden = n === 1;
    t('wizard-next-btn').hidden = n === 3;
    t('wizard-submit-btn').hidden = n !== 3;
    if (n === 3) {
      var country = t('wizard-country-select');
      t('wizard-summary').innerHTML =
        '<dt>Email</dt><dd data-testid="summary-email"></dd><dt>Name</dt><dd data-testid="summary-name"></dd><dt>Country</dt><dd data-testid="summary-country"></dd>';
      t('summary-email').textContent = t('wizard-email-input').value.trim();
      t('summary-name').textContent = t('wizard-name-input').value.trim();
      t('summary-country').textContent = country.selectedOptions[0].text;
    }
  }
  t('wizard-next-btn').addEventListener('click', function () { if (checks[step]()) showStep(step + 1); });
  t('wizard-back-btn').addEventListener('click', function () { showStep(step - 1); });
  wiz.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT' && step < 3) { e.preventDefault(); t('wizard-next-btn').click(); }
  });
  wiz.addEventListener('submit', function (e) {
    e.preventDefault();
    var box = t('wizard-success');
    box.textContent = 'Wizard complete! Account created for ' + t('wizard-email-input').value.trim() + '.';
    box.hidden = false;
    wiz.hidden = true;
  });
  showStep(1);
})();

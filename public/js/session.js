/* Tiny client-side session helper shared by the Auth page and the protected page (window.qa.session). */
(function () {
  var KEY = 'qa_session';
  function read(store) {
    try { return JSON.parse(store.getItem(KEY)); } catch (e) { return null; }
  }
  var session = {
    /** Active session { token, user, expiresAt, remember } or null. An expired session is removed. */
    get: function () {
      var s = read(sessionStorage) || read(localStorage);
      if (!s) return null;
      if (s.expiresAt <= Date.now()) { session.clear(); return null; }
      return s;
    },
    set: function (s) {
      session.clear();
      (s.remember ? localStorage : sessionStorage).setItem(KEY, JSON.stringify(s));
    },
    clear: function () {
      try { sessionStorage.removeItem(KEY); localStorage.removeItem(KEY); } catch (e) { /* storage unavailable */ }
    },
    cookie: function (name) {
      var m = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
      return m ? decodeURIComponent(m[1]) : null;
    },
    setCookie: function (name, value, days) {
      document.cookie = name + '=' + encodeURIComponent(value) + '; path=/; max-age=' + days * 86400 + '; SameSite=Lax';
    },
    deleteCookie: function (name) {
      document.cookie = name + '=; path=/; max-age=0; SameSite=Lax';
    },
  };
  window.qa = window.qa || {};
  window.qa.session = session;
})();

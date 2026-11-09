/* /admin sign-in form. Posts to the existing admin login API, then reloads /admin. */
(function () {
  var form = document.getElementById('adm-login-form');
  if (!form) return;
  var msg = document.getElementById('adm-login-msg');
  var btn = document.getElementById('adm-login-submit');
  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var email = (document.getElementById('adm-login-email') || {}).value || '';
    var password = (document.getElementById('adm-login-password') || {}).value || '';
    if (!email || !password) { msg.textContent = 'Enter your email and password.'; return; }
    btn.disabled = true;
    msg.textContent = '';
    fetch('/api/auth/admin/login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: password })
    }).then(function (res) {
      if (res.ok) { window.location.replace('/admin'); return; }
      msg.textContent = res.status === 401 ? 'Invalid email or password.' : 'Sign-in failed. Try again.';
      btn.disabled = false;
    }).catch(function () {
      msg.textContent = 'Network error. Try again.';
      btn.disabled = false;
    });
  });
})();

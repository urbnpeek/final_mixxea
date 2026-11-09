/**
 * adminLogin.js: the only HTML /admin sends before a staff login is verified.
 * It holds no panel markup, staff data or addresses. The form posts to the existing
 * /api/auth/admin/login endpoint (public/js/admin-login.js) and reloads /admin, which
 * then serves the panel because the signed mixxea_auth cookie is present.
 */
const ADMIN_TITLE = 'Admin · MIXXEA';
const ADMIN_LOGIN_TITLE = 'Admin Login · MIXXEA';

function renderAdminLogin() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${ADMIN_LOGIN_TITLE}</title>
<meta name="robots" content="noindex, nofollow">
<link rel="icon" href="/favicon.ico">
<style>
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0b0b0d;color:#f2f2f2;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
main{width:100%;max-width:380px;padding:32px;border:1px solid #2a2a30;border-radius:12px;background:#121216}
h1{font-size:22px;margin:0 0 8px}p{color:#a0a0aa;font-size:14px;margin:0 0 20px}
label{display:block;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#a0a0aa;margin:14px 0 6px}
input{width:100%;box-sizing:border-box;padding:10px 12px;border-radius:8px;border:1px solid #2a2a30;background:#0b0b0d;color:#f2f2f2;font-size:15px}
button{margin-top:20px;width:100%;padding:12px;border:0;border-radius:8px;background:#f2f2f2;color:#0b0b0d;font-weight:600;font-size:15px;cursor:pointer}
button[disabled]{opacity:.6;cursor:wait}#adm-login-msg{min-height:20px;margin-top:12px;font-size:13px;color:#ff8a8a}
</style>
</head>
<body>
<main>
<h1>Admin Login</h1>
<p>Staff sign-in for the MIXXEA control panel.</p>
<form id="adm-login-form" method="post" action="/api/auth/admin/login" novalidate>
<label for="adm-login-email">Email</label>
<input type="email" id="adm-login-email" name="email" autocomplete="username" required>
<label for="adm-login-password">Password</label>
<input type="password" id="adm-login-password" name="password" autocomplete="current-password" required>
<button type="submit" id="adm-login-submit">Sign in</button>
<div id="adm-login-msg" role="status" aria-live="polite"></div>
</form>
</main>
<script src="/js/admin-login.js" defer></script>
</body>
</html>`;
}

module.exports = { renderAdminLogin, ADMIN_TITLE, ADMIN_LOGIN_TITLE };

/**
 * adminEnv.js - Admin identity settings read from the environment.
 *
 * The admin login username and the admin notification recipient used to share
 * ADMIN_EMAIL. They are now separate:
 *   ADMIN_LOGIN_EMAIL  - username for POST /api/auth/admin/login
 *   ADMIN_NOTIFY_EMAIL - where admin notifications are sent (comma-separated allowed)
 * Each one falls back to ADMIN_EMAIL so nothing changes until the new vars are set.
 * There is deliberately no hard-coded default address.
 */

function readEnv(name) {
  const value = process.env[name];
  return typeof value === 'string' ? value.trim() : '';
}

function getAdminLoginEmail() {
  return readEnv('ADMIN_LOGIN_EMAIL') || readEnv('ADMIN_EMAIL');
}

function getAdminNotifyEmail() {
  return readEnv('ADMIN_NOTIFY_EMAIL') || readEnv('ADMIN_EMAIL');
}

module.exports = { getAdminLoginEmail, getAdminNotifyEmail };

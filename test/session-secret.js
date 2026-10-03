/**
 * Production must not sign cookies with the hard-coded development secret.
 */
const { spawnSync } = require('child_process');
const path = require('path');

const script = `
const { sessionSecret } = require('./src/lib/sessionSecret');
delete process.env.SESSION_SECRET;
delete process.env.VERCEL_ENV;
process.env.NODE_ENV = 'test';
if (sessionSecret() !== 'mixxea-dev-secret') process.exit(2);
process.env.NODE_ENV = 'production';
const a = sessionSecret();
const b = sessionSecret();
if (!a || a === 'mixxea-dev-secret' || a === 'dev-secret') process.exit(3);
if (a !== b || a.length < 32) process.exit(4);
process.env.SESSION_SECRET = 'from-env';
if (sessionSecret() !== 'from-env') process.exit(5);
console.log('ok');
`;

const result = spawnSync(process.execPath, ['-e', script], {
  cwd: path.join(__dirname, '..'),
  env: Object.assign({}, process.env, { NODE_ENV: 'test', VERCEL_ENV: '' }),
  encoding: 'utf8',
});

if (result.status !== 0) {
  console.error(result.stdout);
  console.error(result.stderr);
  process.exit(result.status || 1);
}
console.log('ok  session secret');

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSession,
  hashPassword,
  verifyPassword,
  verifySession,
  b64urlEncode,
  b64urlDecodeToString,
  generatePassword
} from '../lib/auth.js';

const SECRET = 'test-secret-that-is-long-enough';

test('hashPassword + verifyPassword round-trip', async () => {
  const hash = await hashPassword('correct horse battery staple', { iterations: 20000 });
  assert.match(hash, /^pbkdf2\$sha256\$20000\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/);
  assert.equal(await verifyPassword('correct horse battery staple', hash), true);
  assert.equal(await verifyPassword('wrong password', hash), false);
});

test('verifyPassword supports plain env passwords', async () => {
  assert.equal(await verifyPassword('plain-password', 'plain-password'), true);
  assert.equal(await verifyPassword('nope', 'plain-password'), false);
  assert.equal(await verifyPassword('', 'plain-password'), false);
});

test('hashPassword rejects short passwords', async () => {
  await assert.rejects(() => hashPassword('short'), /at least 8/);
});

test('session tokens verify and expose claims', async () => {
  const { token, expiresAt } = await createSession(SECRET, {
    subject: 'admin',
    ttlSeconds: 3600,
    claims: { u: 'arunpanthi' }
  });
  assert.ok(expiresAt > Date.now());
  const claims = await verifySession(SECRET, token);
  assert.ok(claims);
  assert.equal(claims.sub, 'admin');
  assert.equal(claims.u, 'arunpanthi');
  assert.equal(claims.iss, 'arunpanthi-admin');
});

test('session tokens reject tampering, wrong secret and expiry', async () => {
  const { token } = await createSession(SECRET, { ttlSeconds: 3600 });
  const parts = token.split('.');
  const tampered = parts[0] + '.' + b64urlEncode(JSON.stringify({ iss: 'arunpanthi-admin', sub: 'admin', exp: 9999999999 })) + '.' + parts[2];
  assert.equal(await verifySession(SECRET, tampered), null);
  assert.equal(await verifySession('another-secret-that-is-long', token), null);

  const { token: expired } = await createSession(SECRET, { ttlSeconds: 60, now: Date.now() - 120000 });
  assert.equal(await verifySession(SECRET, expired), null);
  assert.equal(await verifySession(SECRET, 'not-a-token'), null);
  assert.equal(await verifySession(SECRET, ''), null);
});

test('base64url helpers round-trip unicode', () => {
  const text = 'नेपाल — weekly test #1';
  assert.equal(b64urlDecodeToString(b64urlEncode(text)), text);
  assert.ok(!b64urlEncode(text).includes('='));
  assert.ok(!b64urlEncode(text).includes('+'));
});

test('generatePassword produces distinct strong passwords', () => {
  const a = generatePassword(18);
  const b = generatePassword(18);
  assert.equal(a.length, 18);
  assert.notEqual(a, b);
});

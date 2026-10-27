/* Password hashing + stateless session tokens (HS256 JWT).
 * Uses WebCrypto only so the same code runs on Node and Cloudflare Workers. */

const enc = new TextEncoder();
const dec = new TextDecoder();

const PBKDF2_ITERATIONS = 210000;
const KEY_BITS = 256;
const DEFAULT_TTL_SECONDS = 12 * 60 * 60;
const ISSUER = 'arunpanthi-admin';

function subtle() {
  const c = globalThis.crypto;
  if (!c || !c.subtle) throw new Error('WebCrypto is not available in this runtime');
  return c.subtle;
}

function randomBytes(length) {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}

export function bytesToBase64(bytes) {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (typeof globalThis.Buffer !== 'undefined') {
    return globalThis.Buffer.from(view).toString('base64');
  }
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < view.length; i += chunk) {
    binary += String.fromCharCode.apply(null, view.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function base64ToBytes(base64) {
  const clean = String(base64 || '').replace(/\s+/g, '');
  if (typeof globalThis.Buffer !== 'undefined') {
    return new Uint8Array(globalThis.Buffer.from(clean, 'base64'));
  }
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function b64urlEncode(input) {
  const bytes = typeof input === 'string' ? enc.encode(input) : new Uint8Array(input);
  return bytesToBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function b64urlDecodeToString(input) {
  const padded = String(input).replace(/-/g, '+').replace(/_/g, '/');
  const withPadding = padded + '='.repeat((4 - (padded.length % 4)) % 4);
  return dec.decode(base64ToBytes(withPadding));
}

function timingSafeEqual(a, b) {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) diff |= (a[i] || 0) ^ (b[i] || 0);
  return diff === 0;
}

async function pbkdf2(password, salt, iterations) {
  const key = await subtle().importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await subtle().deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    key,
    KEY_BITS
  );
  return new Uint8Array(bits);
}

/** Returns `pbkdf2$sha256$<iterations>$<saltB64>$<hashB64>`. */
export async function hashPassword(password, { iterations = PBKDF2_ITERATIONS } = {}) {
  if (typeof password !== 'string' || password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }
  const salt = randomBytes(16);
  const hash = await pbkdf2(password, salt, iterations);
  return ['pbkdf2', 'sha256', iterations, bytesToBase64(salt), bytesToBase64(hash)].join('$');
}

/**
 * Verifies a password against either a pbkdf2 hash or (for quick setups) a
 * plain-text password from the environment.
 */
export async function verifyPassword(password, stored) {
  if (typeof password !== 'string' || !password || typeof stored !== 'string' || !stored) {
    return false;
  }
  if (stored.startsWith('pbkdf2$')) {
    const parts = stored.split('$');
    if (parts.length !== 5) return false;
    const iterations = Number(parts[2]);
    if (!Number.isFinite(iterations) || iterations < 10000 || iterations > 2000000) return false;
    const salt = base64ToBytes(parts[3]);
    const expected = base64ToBytes(parts[4]);
    const actual = await pbkdf2(password, salt, iterations);
    return timingSafeEqual(actual, expected);
  }
  const a = enc.encode(password);
  const b = enc.encode(stored);
  return timingSafeEqual(a, b);
}

export function sessionTtlSeconds(env) {
  const hours = Number(env?.SESSION_TTL_HOURS);
  if (Number.isFinite(hours) && hours > 0 && hours <= 24 * 30) return Math.round(hours * 3600);
  return DEFAULT_TTL_SECONDS;
}

async function hmacKey(secret) {
  if (!secret || String(secret).length < 16) {
    throw new Error('SESSION_SECRET must be at least 16 characters');
  }
  return subtle().importKey('raw', enc.encode(String(secret)), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify'
  ]);
}

/** Creates a compact JWT (HS256) session token. */
export async function createSession(secret, { subject = 'admin', ttlSeconds = DEFAULT_TTL_SECONDS, now = Date.now(), claims = {} } = {}) {
  const header = b64urlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const issuedAt = Math.floor(now / 1000);
  const payload = b64urlEncode(
    JSON.stringify({
      iss: ISSUER,
      sub: subject,
      iat: issuedAt,
      exp: issuedAt + Math.max(60, Math.floor(ttlSeconds)),
      ...claims
    })
  );
  const data = header + '.' + payload;
  const key = await hmacKey(secret);
  const signature = await subtle().sign('HMAC', key, enc.encode(data));
  return {
    token: data + '.' + b64urlEncode(new Uint8Array(signature)),
    expiresAt: (issuedAt + Math.max(60, Math.floor(ttlSeconds))) * 1000
  };
}

/** Returns the token payload when valid, otherwise null. Never throws on bad input. */
export async function verifySession(secret, token, { now = Date.now() } = {}) {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts;
  try {
    const headerJson = JSON.parse(b64urlDecodeToString(header));
    if (headerJson.alg !== 'HS256') return null;
    const key = await hmacKey(secret);
    const expected = await subtle().sign('HMAC', key, enc.encode(header + '.' + payload));
    const provided = base64ToBytes(
      signature.replace(/-/g, '+').replace(/_/g, '/') +
        '='.repeat((4 - (signature.length % 4)) % 4)
    );
    if (!timingSafeEqual(new Uint8Array(expected), provided)) return null;
    const claims = JSON.parse(b64urlDecodeToString(payload));
    if (claims.iss !== ISSUER) return null;
    if (!claims.exp || claims.exp * 1000 <= now) return null;
    return claims;
  } catch {
    return null;
  }
}

export function bearerFromHeaders(headers = {}) {
  const raw = headers.authorization || headers.Authorization || '';
  const match = /^Bearer\s+(.+)$/i.exec(String(raw).trim());
  return match ? match[1].trim() : '';
}

export function generateSecret() {
  return bytesToBase64(randomBytes(48)).replace(/[^A-Za-z0-9]/g, '').slice(0, 64);
}

export function generatePassword(length = 20) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#%^&*-_=+';
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

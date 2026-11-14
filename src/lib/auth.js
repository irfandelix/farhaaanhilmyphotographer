export const ADMIN_COOKIE_NAME = 'admin_token';
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

const encoder = new TextEncoder();

function getSecretMaterial() {
  const raw = process.env.AUTH_SECRET || process.env.ADMIN_PASSWORD;
  if (!raw) return null;
  return `photo-selector-session:${raw}`;
}

async function getHmacKey(usage) {
  const secret = getSecretMaterial();
  if (!secret) return null;

  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    [usage]
  );
}

function toBase64Url(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(str) {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function createAdminToken() {
  const key = await getHmacKey('sign');
  if (!key) return null;

  const payload = {
    role: 'admin',
    exp: Date.now() + ADMIN_COOKIE_MAX_AGE * 1000,
  };
  const payloadB64 = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const sigBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadB64));
  const sigB64 = toBase64Url(new Uint8Array(sigBuffer));

  return `${payloadB64}.${sigB64}`;
}

export async function verifyAdminToken(token) {
  if (!token || typeof token !== 'string') return false;

  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [payloadB64, sigB64] = parts;
  if (!payloadB64 || !sigB64) return false;

  try {
    const key = await getHmacKey('verify');
    if (!key) return false;

    const sigBytes = fromBase64Url(sigB64);
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes,
      encoder.encode(payloadB64)
    );
    if (!valid) return false;

    const payloadJson = new TextDecoder().decode(fromBase64Url(payloadB64));
    const payload = JSON.parse(payloadJson);

    return payload?.role === 'admin' && typeof payload?.exp === 'number' && payload.exp > Date.now();
  } catch {
    return false;
  }
}

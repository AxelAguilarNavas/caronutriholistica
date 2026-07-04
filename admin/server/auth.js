import crypto from 'node:crypto';

const SECRET = process.env.SESSION_SECRET || 'dev-secret-cambiar';
const TTL_MS = 1000 * 60 * 60 * 12; // 12 horas

const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export function isValidEmail(value) {
  const email = String(value || '').trim();
  if (email.length > 254) return false;
  if (!EMAIL_RE.test(email)) return false;
  if (email.includes('..')) return false;
  const [local, domain] = email.split('@');
  if (local.length > 64) return false;
  const tld = domain.split('.').pop();
  if (tld.length < 2) return false;
  return true;
}

function sign(payload) {
  return crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
}

export function createToken(email) {
  const payload = Buffer.from(JSON.stringify({ email, exp: Date.now() + TTL_MS })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = sign(payload);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (!data.exp || data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

export function requireAuth(req, res, next) {
  const session = verifyToken(req.cookies?.session);
  if (!session) return res.status(401).json({ error: 'No autenticado' });
  req.user = session;
  next();
}

export function checkCredentials(email, password) {
  const expectedEmail = (process.env.NUTRI_EMAIL || '').trim().toLowerCase();
  const expectedPassword = process.env.NUTRI_PASSWORD || '';
  if (!expectedEmail || !expectedPassword) return false;
  const a = Buffer.from(String(email).trim().toLowerCase());
  const b = Buffer.from(expectedEmail);
  const p = Buffer.from(String(password));
  const q = Buffer.from(expectedPassword);
  const emailOk = a.length === b.length && crypto.timingSafeEqual(a, b);
  const passOk = p.length === q.length && crypto.timingSafeEqual(p, q);
  return emailOk && passOk;
}

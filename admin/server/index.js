import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

dotenv.config();

const { api } = await import('./routes.js');
const { migrate } = await import('./migrate.js');
const { createToken, verifyToken, checkCredentials, isValidEmail } = await import('./auth.js');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

// ── Auth ──
app.post('/api/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Ingresa un correo electrónico real y válido (ej. nombre@dominio.com).' });
  }
  if (!password || String(password).trim().length < 4) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 4 caracteres.' });
  }
  if (!checkCredentials(email, password)) {
    return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
  }
  res.cookie('session', createToken(String(email).trim().toLowerCase()), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 12,
  });
  res.json({ ok: true, email: String(email).trim().toLowerCase() });
});

app.post('/api/logout', (_req, res) => {
  res.clearCookie('session');
  res.json({ ok: true });
});

app.get('/api/me', (req, res) => {
  const session = verifyToken(req.cookies?.session);
  if (!session) return res.status(401).json({ error: 'No autenticado' });
  res.json({ email: session.email });
});

// ── API protegida ──
app.use('/api', api);

// ── Frontend build (producción) ──
const dist = path.join(__dirname, '..', 'dist');
app.use(express.static(dist));
app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));

// ── Errores ──
app.use((err, _req, res, _next) => {
  console.error('[api]', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const PORT = Number(process.env.PORT || 3001);

migrate()
  .catch((err) => console.error('[migrate] fallo (el servidor arranca igual):', err.message))
  .finally(() => {
    app.listen(PORT, () => console.log(`Panel admin escuchando en http://localhost:${PORT}`));
  });

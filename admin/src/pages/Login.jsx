import { useState } from 'react';
import { useApp } from '../store.jsx';
import { isValidEmail } from '../utils.js';

export default function Login() {
  const { login } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const emailInvalid = email.trim() !== '' && !isValidEmail(email);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!isValidEmail(email)) {
      setError('Ingresa un correo electrónico real y válido (ej. nombre@dominio.com).');
      return;
    }
    if (password.trim().length < 4) {
      setError('La contraseña debe tener al menos 4 caracteres.');
      return;
    }
    setBusy(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'No se pudo iniciar sesión.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={onSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, marginBottom: 32 }}>
          <div className="login-logo">
            <span style={{ color: '#fff', fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px' }}>NC</span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.3px' }}>Panel de Nutrición</div>
            <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>Ingresa a tu cuenta de nutricionista</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="field-label" style={{ marginBottom: 6 }}>Correo electrónico</label>
            <input
              type="email"
              className={`login-input${emailInvalid ? ' invalid' : ''}`}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                const v = e.target.value;
                setError(v.trim() === '' || isValidEmail(v) ? '' : 'Formato de correo inválido.');
              }}
              placeholder="tú@ejemplo.com"
              autoComplete="username"
            />
          </div>
          <div>
            <label className="field-label" style={{ marginBottom: 6 }}>Contraseña</label>
            <input
              type="password"
              className="login-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          {error && <div className="login-error">{error}</div>}

          <button type="submit" className="login-submit" disabled={busy}>
            {busy ? 'Iniciando…' : 'Iniciar sesión'}
          </button>
        </div>
      </form>
    </div>
  );
}

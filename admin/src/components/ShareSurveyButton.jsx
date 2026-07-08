import { useEffect, useRef, useState } from 'react';
import { useApp } from '../store.jsx';
import { surveyShareLink } from '../utils.js';

function ShareIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.6" y1="10.5" x2="15.4" y2="6.5" />
      <line x1="8.6" y1="13.5" x2="15.4" y2="17.5" />
    </svg>
  );
}

// Botón "Compartir encuesta" para el perfil de un cliente: arma el link
// con el user_id/source_platform del cliente ya prellenados. Con varias
// encuestas activas despliega un menú para elegir cuál.
export default function ShareSurveyButton({ client }) {
  const { surveys, showToast, handleError } = useApp();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const activeSurveys = surveys.filter((sv) => sv.is_active);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  const copyLink = async (survey) => {
    setOpen(false);
    try {
      await navigator.clipboard.writeText(surveyShareLink(survey, client));
      showToast(client?.user_id
        ? `Enlace de «${survey.name}» copiado`
        : `Enlace de «${survey.name}» copiado — este cliente no tiene usuario de WhatsApp, completa el userId antes de enviarlo`);
    } catch (err) {
      handleError(err);
    }
  };

  const onClick = () => {
    if (!activeSurveys.length) { showToast('No hay encuestas activas para compartir'); return; }
    if (activeSurveys.length === 1) { copyLink(activeSurveys[0]); return; }
    setOpen((o) => !o);
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button className="btn-soft-blue" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={onClick}>
        <ShareIcon />
        Compartir encuesta
      </button>
      {open && (
        <div
          style={{
            position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 30,
            background: '#fff', border: '1px solid var(--border-input)', borderRadius: 10,
            boxShadow: 'var(--shadow-modal)', minWidth: 220, overflow: 'hidden',
          }}
        >
          {activeSurveys.map((sv) => (
            <button
              key={sv.id}
              onClick={() => copyLink(sv)}
              style={{
                display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px',
                border: 'none', background: 'none', cursor: 'pointer', fontSize: 13,
                borderBottom: '1px solid var(--border-sep)',
              }}
            >
              {sv.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

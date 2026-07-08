import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../store.jsx';
import { questionTypeLabel, surveyQuestionsFlat, surveyShareLink } from '../utils.js';

export default function SurveyDetail() {
  const { id } = useParams();
  const surveyId = Number(id);
  const {
    surveys, submissions, clients, toggleSurveyActive, deleteSurvey,
    setConfirmModal, showToast, handleError,
  } = useApp();
  const navigate = useNavigate();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const pickerRef = useRef(null);

  const survey = surveys.find((sv) => sv.id === surveyId);
  if (!survey) return <div className="empty-state">Encuesta no encontrada.</div>;

  const responsesCount = submissions.filter((s) => s.survey_id === surveyId).length;
  const locked = responsesCount > 0;
  const allQuestions = surveyQuestionsFlat(survey);
  const questionText = (qid) => allQuestions.find((q) => q.id === qid)?.question_text || '';

  useEffect(() => {
    if (!pickerOpen) return;
    const onClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) setPickerOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [pickerOpen]);

  const onToggleActive = async () => {
    try {
      await toggleSurveyActive(surveyId);
    } catch (err) {
      handleError(err);
    }
  };

  const onPickClient = async (client) => {
    setPickerOpen(false);
    setClientSearch('');
    try {
      await navigator.clipboard.writeText(surveyShareLink(survey, client));
      showToast(client.user_id
        ? `Enlace copiado para ${client.name || 'este cliente'}`
        : 'Enlace copiado — este cliente no tiene usuario de WhatsApp/ManyChat, la encuesta no cargará hasta completar el userId');
    } catch (err) {
      handleError(err);
    }
  };

  const term = clientSearch.trim().toLowerCase();
  const filteredClients = clients.filter(
    (c) =>
      !term ||
      (c.name || '').toLowerCase().includes(term) ||
      (c.email || '').toLowerCase().includes(term) ||
      (c.phone || '').toLowerCase().includes(term)
  );

  const requestDelete = () => {
    setConfirmModal({
      title: 'Eliminar encuesta',
      message: '¿Seguro que quieres eliminar esta encuesta? Esta acción no se puede deshacer.',
      onConfirm: async () => {
        try {
          await deleteSurvey(surveyId);
          showToast('Encuesta eliminada');
          navigate('/encuestas');
        } catch (err) {
          handleError(err);
        }
      },
    });
  };

  return (
    <div className="page-narrow">
      <div className="card" style={{ padding: '22px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-0.3px' }}>{survey.name}</span>
              <span className={`badge ${survey.is_active ? 'badge-active' : 'badge-inactive'}`}>
                {survey.is_active ? 'Activa' : 'Inactiva'}
              </span>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 4 }}>
              {[survey.slug, survey.version].filter(Boolean).join(' · ')}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div ref={pickerRef} style={{ position: 'relative' }}>
              <button className="btn-outline-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setPickerOpen((o) => !o)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.6" y1="10.5" x2="15.4" y2="6.5" />
                  <line x1="8.6" y1="13.5" x2="15.4" y2="17.5" />
                </svg>
                Compartir
              </button>
              {pickerOpen && (
                <div
                  style={{
                    position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 30,
                    background: '#fff', border: '1px solid var(--border-input)', borderRadius: 10,
                    boxShadow: 'var(--shadow-modal)', width: 260, padding: 10,
                  }}
                >
                  <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginBottom: 8, lineHeight: 1.5 }}>
                    Elige a qué cliente le vas a compartir esta encuesta — el link necesita su usuario de WhatsApp/ManyChat para poder cargar y guardar la respuesta.
                  </div>
                  <input
                    className="input"
                    style={{ marginBottom: 8 }}
                    autoFocus
                    placeholder="Buscar cliente…"
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                  />
                  <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                    {filteredClients.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => onPickClient(c)}
                        style={{
                          display: 'block', width: '100%', textAlign: 'left', padding: '8px 6px',
                          border: 'none', background: 'none', cursor: 'pointer', fontSize: 13,
                          borderBottom: '1px solid var(--border-sep)',
                        }}
                      >
                        <div style={{ fontWeight: 600 }}>{c.name || '(sin nombre)'}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
                          {[c.phone, c.email].filter(Boolean).join(' · ') || '—'}
                          {!c.user_id && ' · sin WhatsApp'}
                        </div>
                      </button>
                    ))}
                    {filteredClients.length === 0 && (
                      <div style={{ fontSize: 12.5, color: 'var(--text-3)', textAlign: 'center', padding: 10 }}>
                        Sin clientes que coincidan.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <button className="btn-outline-sm" onClick={onToggleActive}>
              {survey.is_active ? 'Desactivar' : 'Activar'}
            </button>
            {!locked && (
              <>
                <button className="btn-soft-blue md" onClick={() => navigate(`/encuestas/${surveyId}/editar`)}>
                  Editar estructura
                </button>
                <button className="btn-soft-red md" onClick={requestDelete}>Eliminar</button>
              </>
            )}
          </div>
        </div>
        {locked && (
          <div className="locked-notice">
            Esta encuesta ya tiene respuestas registradas — su estructura no puede editarse ni eliminarse.
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {survey.sections.map((sec, si) => (
          <div key={sec.id ?? si} className="card" style={{ padding: '18px 22px' }}>
            <div className="section-title">{sec.name}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sec.questions.map((q) => (
                <div key={q.id} className="question-row">
                  <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{q.question_text}</span>
                    {q.is_required && (
                      <span style={{ fontSize: 10.5, color: 'var(--danger)', fontWeight: 600 }}>obligatoria</span>
                    )}
                    <span style={{ fontSize: 10.5, color: 'var(--text-3)' }}>· {questionTypeLabel(q.question_type)}</span>
                  </div>
                  {q.is_conditional && (
                    <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>
                      Condicional: se muestra si "{questionText(q.conditional_on)}" = {q.conditional_value}
                    </div>
                  )}
                  {(q.options || []).length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                      {q.options.map((opt) => (
                        <span key={opt.id} className="option-chip">{opt.option_text}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button className="view-responses-btn" onClick={() => navigate(`/encuestas/${surveyId}/respuestas`)}>
        Ver respuestas ({responsesCount})
      </button>
    </div>
  );
}

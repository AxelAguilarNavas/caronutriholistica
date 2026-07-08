import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiGet, apiPost } from '../api.js';
import { CHOICE_TYPES, surveyQuestionsFlat } from '../utils.js';

const MULTI_TYPES = ['multiple_choice', 'checkbox'];

// Página pública (sin login): renderiza cualquier encuesta del constructor
// y guarda la respuesta directo en Postgres vía /api/public. El quiz
// NutriBalance NO usa esta página — tiene su propio flujo (evaluacion.html).
export default function PublicSurveyViewer() {
  const [params] = useSearchParams();
  const slug = (params.get('slug') || '').trim();
  const userId = (params.get('userId') || '').trim();
  const sourcePlatform = (params.get('sourcePlatform') || '').trim();
  const channel = (params.get('channel') || '').trim();
  const linkValid = !!(slug && userId && sourcePlatform);

  const [survey, setSurvey] = useState(null);
  const [status, setStatus] = useState(linkValid ? 'loading' : 'invalid'); // invalid | loading | notfound | ready | sending | done
  const [answers, setAnswers] = useState({}); // question_id -> { optionIds: [], text: '' }
  const [missing, setMissing] = useState([]);

  useEffect(() => {
    if (!linkValid) return;
    apiGet(`/api/public/surveys/${encodeURIComponent(slug)}`)
      .then((sv) => { setSurvey(sv); setStatus('ready'); })
      .catch(() => setStatus('notfound'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, linkValid]);

  const allQuestions = useMemo(() => (survey ? surveyQuestionsFlat(survey) : []), [survey]);

  // Textos respondidos por pregunta — se usan tanto para evaluar las
  // condicionales como para validar obligatorias.
  const answeredTexts = useMemo(() => {
    const map = new Map();
    for (const q of allQuestions) {
      const a = answers[q.id];
      if (!a) continue;
      if (CHOICE_TYPES.includes(q.question_type)) {
        const texts = (a.optionIds || [])
          .map((oid) => q.options.find((o) => o.id === oid)?.option_text)
          .filter(Boolean);
        if (texts.length) map.set(q.id, texts);
      } else if ((a.text || '').trim()) {
        map.set(q.id, [a.text.trim()]);
      }
    }
    return map;
  }, [answers, allQuestions]);

  const isVisible = (q) => {
    if (!q.is_conditional || q.conditional_on == null) return true;
    const ref = answeredTexts.get(q.conditional_on) || [];
    return ref.includes(String(q.conditional_value ?? ''));
  };

  const toggleOption = (q, optionId) => {
    setAnswers((prev) => {
      const current = prev[q.id]?.optionIds || [];
      let optionIds;
      if (MULTI_TYPES.includes(q.question_type)) {
        optionIds = current.includes(optionId)
          ? current.filter((id) => id !== optionId)
          : [...current, optionId];
      } else {
        optionIds = current.includes(optionId) ? [] : [optionId];
      }
      return { ...prev, [q.id]: { optionIds } };
    });
  };

  const setText = (q, text) => {
    setAnswers((prev) => ({ ...prev, [q.id]: { text } }));
  };

  const onSubmit = async () => {
    const visibles = allQuestions.filter(isVisible);
    const missingLocal = visibles
      .filter((q) => q.is_required && !(answeredTexts.get(q.id) || []).length)
      .map((q) => q.question_text);
    setMissing(missingLocal);
    if (missingLocal.length) return;

    const payload = visibles
      .filter((q) => answeredTexts.has(q.id))
      .map((q) => (CHOICE_TYPES.includes(q.question_type)
        ? { question_id: q.id, option_ids: answers[q.id].optionIds }
        : { question_id: q.id, text: answers[q.id].text.trim() }));

    setStatus('sending');
    try {
      await apiPost(`/api/public/surveys/${encodeURIComponent(slug)}/submit`, {
        userId, sourcePlatform, channel: channel || null, answers: payload,
      });
      setStatus('done');
    } catch (err) {
      setStatus('ready');
      setMissing(err.data?.missing || [err.message || 'No se pudo guardar tu respuesta. Intenta de nuevo.']);
    }
  };

  const centered = (children) => (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="card" style={{ maxWidth: 420, width: '100%', textAlign: 'center', padding: '40px 28px' }}>
        {children}
      </div>
    </div>
  );

  if (status === 'invalid') {
    return centered(
      <>
        <div style={{ fontSize: 34 }}>🔗</div>
        <div style={{ fontSize: 18, fontWeight: 700, marginTop: 12 }}>Este enlace no es válido</div>
        <div style={{ fontSize: 13.5, color: 'var(--text-3)', marginTop: 8, lineHeight: 1.6 }}>
          Faltan datos requeridos en el enlace. Pide uno nuevo a quien te lo compartió.
        </div>
      </>
    );
  }
  if (status === 'loading') {
    return centered(<div style={{ fontSize: 14, color: 'var(--text-3)' }}>Cargando encuesta…</div>);
  }
  if (status === 'notfound') {
    return centered(
      <>
        <div style={{ fontSize: 34 }}>📋</div>
        <div style={{ fontSize: 18, fontWeight: 700, marginTop: 12 }}>Encuesta no disponible</div>
        <div style={{ fontSize: 13.5, color: 'var(--text-3)', marginTop: 8, lineHeight: 1.6 }}>
          Esta encuesta no existe o ya no está activa.
        </div>
      </>
    );
  }
  if (status === 'done') {
    return centered(
      <>
        <div style={{ fontSize: 34 }}>🌿</div>
        <div style={{ fontSize: 18, fontWeight: 700, marginTop: 12 }}>¡Gracias por tu respuesta!</div>
        <div style={{ fontSize: 13.5, color: 'var(--text-3)', marginTop: 8, lineHeight: 1.6 }}>
          Tu información fue guardada correctamente. Ya puedes cerrar esta página.
        </div>
      </>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '28px 16px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="card" style={{ padding: '22px 24px' }}>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.3px' }}>{survey.name}</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 4 }}>
            Las preguntas marcadas con <span style={{ color: 'var(--danger)' }}>*</span> son obligatorias.
          </div>
        </div>

        {survey.sections.map((sec, si) => {
          const visibles = sec.questions.filter(isVisible);
          if (!visibles.length) return null;
          return (
            <div key={sec.id ?? si} className="card" style={{ padding: '18px 22px' }}>
              {sec.name && <div className="section-title">{sec.name}</div>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {visibles.map((q) => (
                  <div key={q.id}>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                      {q.question_text}
                      {q.is_required && <span style={{ color: 'var(--danger)' }}> *</span>}
                    </div>
                    {CHOICE_TYPES.includes(q.question_type) ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {q.options.map((opt) => {
                          const selected = (answers[q.id]?.optionIds || []).includes(opt.id);
                          return (
                            <span
                              key={opt.id}
                              className={`answer-chip${selected ? ' selected' : ''}`}
                              style={{ cursor: 'pointer', userSelect: 'none' }}
                              onClick={() => toggleOption(q, opt.id)}
                            >
                              {opt.option_text}
                            </span>
                          );
                        })}
                      </div>
                    ) : q.question_type === 'long_text' ? (
                      <textarea
                        className="input"
                        style={{ minHeight: 80 }}
                        value={answers[q.id]?.text || ''}
                        onChange={(e) => setText(q, e.target.value)}
                        placeholder="Escribe tu respuesta…"
                      />
                    ) : (
                      <input
                        className="input"
                        value={answers[q.id]?.text || ''}
                        onChange={(e) => setText(q, e.target.value)}
                        placeholder="Escribe tu respuesta…"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {missing.length > 0 && (
          <div className="card" style={{ padding: '14px 20px', border: '1px solid var(--danger)', background: 'var(--danger-bg)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--danger)' }}>
              Faltan preguntas obligatorias por responder:
            </div>
            <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 12.5, color: 'var(--danger)' }}>
              {missing.map((m, i) => <li key={i}>{m}</li>)}
            </ul>
          </div>
        )}

        <button
          className="btn-primary-lg"
          style={{ alignSelf: 'stretch' }}
          disabled={status === 'sending'}
          onClick={onSubmit}
        >
          {status === 'sending' ? 'Enviando…' : 'Enviar respuestas'}
        </button>
      </div>
    </div>
  );
}

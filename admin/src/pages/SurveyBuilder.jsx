import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../store.jsx';
import { CHOICE_TYPES, QUESTION_TYPES, questionTypeLabel, slugify } from '../utils.js';

const blankQuestion = () => ({
  question_text: '',
  question_type: 'short_text',
  is_required: true,
  is_conditional: false,
  conditional_on: '',
  conditional_value: '',
  options: [],
});
const blankSection = () => ({ name: '', questions: [blankQuestion()] });

// Convierte la encuesta guardada (ids reales) al formato del builder
// (conditional_on como índice plano de la pregunta).
function surveyToDraft(survey) {
  const flatIds = [];
  survey.sections.forEach((sec) => sec.questions.forEach((q) => flatIds.push(q.id)));
  return {
    name: survey.name,
    slug: survey.slug,
    version: survey.version || 'v1',
    sections: survey.sections.map((sec) => ({
      name: sec.name,
      questions: sec.questions.map((q) => ({
        question_text: q.question_text,
        question_type: q.question_type,
        is_required: !!q.is_required,
        is_conditional: !!q.is_conditional,
        conditional_on: q.conditional_on != null ? String(flatIds.indexOf(q.conditional_on)) : '',
        conditional_value: q.conditional_value || '',
        options: (q.options || []).map((o) => ({ option_text: o.option_text })),
      })),
    })),
  };
}

export default function SurveyBuilder({ mode }) {
  const { id } = useParams();
  const surveyId = mode === 'edit' ? Number(id) : null;
  const { surveys, submissions, createSurvey, updateSurvey, showToast, handleError } = useApp();
  const navigate = useNavigate();

  const existing = mode === 'edit' ? surveys.find((sv) => sv.id === surveyId) : null;
  const locked = mode === 'edit' && submissions.some((s) => s.survey_id === surveyId);

  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (mode === 'create') {
      setDraft({ name: '', slug: '', version: 'v1', sections: [blankSection()] });
    } else if (existing) {
      setDraft(surveyToDraft(existing));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, surveyId, !!existing]);

  if (mode === 'edit' && !existing) return <div className="empty-state">Encuesta no encontrada.</div>;
  if (locked) {
    return (
      <div className="page-narrow">
        <div className="card">
          <div className="locked-notice" style={{ marginTop: 0 }}>
            Esta encuesta ya tiene respuestas registradas — su estructura no puede editarse.
          </div>
        </div>
      </div>
    );
  }
  if (!draft) return null;

  const setSections = (fn) => setDraft((d) => ({ ...d, sections: fn(d.sections) }));
  const updateSection = (si, fields) =>
    setSections((secs) => secs.map((sec, i) => (i === si ? { ...sec, ...fields } : sec)));
  const updateQuestion = (si, qi, fields) =>
    setSections((secs) =>
      secs.map((sec, i) =>
        i === si
          ? { ...sec, questions: sec.questions.map((q, j) => (j === qi ? { ...q, ...fields } : q)) }
          : sec
      )
    );

  const onChangeType = (si, qi, value) => {
    const q = draft.sections[si].questions[qi];
    const needsOptions = CHOICE_TYPES.includes(value);
    updateQuestion(si, qi, {
      question_type: value,
      options: needsOptions && q.options.length === 0 ? [{ option_text: '' }, { option_text: '' }] : q.options,
    });
  };

  // Preguntas anteriores (índice plano) para el select "Depende de…"
  const priorQuestionsFor = (si, qi) => {
    const prior = [];
    let flat = 0;
    for (let i = 0; i < draft.sections.length; i++) {
      for (let j = 0; j < draft.sections[i].questions.length; j++) {
        if (i === si && j === qi) return prior;
        prior.push({ key: String(flat), text: draft.sections[i].questions[j].question_text || '(sin texto)' });
        flat += 1;
      }
    }
    return prior;
  };

  const onSave = async () => {
    if (!draft.name.trim()) { showToast('El nombre de la encuesta es obligatorio'); return; }
    const totalQuestions = draft.sections.reduce((n, sec) => n + sec.questions.length, 0);
    if (totalQuestions === 0) {
      showToast('Agrega al menos una pregunta');
      return;
    }
    if (draft.sections.some((sec) => sec.questions.some((q) => !q.question_text.trim()))) {
      showToast('Completa el texto de todas las preguntas');
      return;
    }
    const payload = {
      name: draft.name,
      slug: draft.slug || slugify(draft.name),
      version: draft.version || 'v1',
      sections: draft.sections.map((sec) => ({
        name: sec.name,
        questions: sec.questions.map((q) => ({
          ...q,
          conditional_on: q.is_conditional && q.conditional_on !== '' ? Number(q.conditional_on) : null,
          options: q.options.filter((o) => o.option_text.trim()),
        })),
      })).filter((sec) => sec.questions.length > 0 || sec.name.trim()),
    };
    setSaving(true);
    try {
      if (mode === 'create') {
        await createSurvey(payload);
        showToast('Encuesta creada');
        navigate('/encuestas');
      } else {
        await updateSurvey(surveyId, payload);
        showToast('Encuesta actualizada');
        navigate(`/encuestas/${surveyId}`);
      }
    } catch (err) {
      handleError(err);
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => navigate(mode === 'edit' ? `/encuestas/${surveyId}` : '/encuestas');

  return (
    <div className="page-narrow" style={{ paddingBottom: 100 }}>
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>
          {mode === 'create' ? 'Nueva encuesta' : 'Editar estructura de encuesta'}
        </div>
        <div>
          <label className="field-label">Nombre</label>
          <input
            className="input field"
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            placeholder="Ej. Evaluación Inicial"
          />
        </div>
        <div>
          <label className="field-label">Versión</label>
          <input className="input field" style={{ maxWidth: 160 }} value={draft.version} onChange={(e) => setDraft((d) => ({ ...d, version: e.target.value }))} />
        </div>
      </div>

      {draft.sections.map((sec, si) => (
        <div key={si} className="card" style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              className="input"
              style={{ flex: 1, padding: '9px 12px', borderRadius: 8, fontSize: 13.5, fontWeight: 600 }}
              value={sec.name}
              onChange={(e) => updateSection(si, { name: e.target.value })}
              placeholder="Nombre de la sección"
            />
            <button
              className="btn-soft-red md"
              onClick={() => setSections((secs) => secs.filter((_, i) => i !== si))}
            >
              Quitar
            </button>
          </div>

          {sec.questions.map((q, qi) => {
            const hasOptions = CHOICE_TYPES.includes(q.question_type);
            const isLegacyType = !QUESTION_TYPES.some((t) => t.value === q.question_type);
            return (
              <div key={qi} className="builder-question">
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="input"
                    style={{ flex: 1, padding: '9px 12px', borderRadius: 8, fontSize: 13.5 }}
                    value={q.question_text}
                    onChange={(e) => updateQuestion(si, qi, { question_text: e.target.value })}
                    placeholder="Texto de la pregunta"
                  />
                  <button
                    className="btn-soft-red"
                    style={{ fontSize: 11.5, padding: '8px 10px' }}
                    onClick={() =>
                      updateSection(si, { questions: sec.questions.filter((_, j) => j !== qi) })
                    }
                  >
                    ✕
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <select
                    className="input"
                    style={{ width: 'auto', padding: '8px 10px', borderRadius: 8, fontSize: 12.5 }}
                    value={q.question_type}
                    onChange={(e) => onChangeType(si, qi, e.target.value)}
                  >
                    {isLegacyType && (
                      <option value={q.question_type}>{questionTypeLabel(q.question_type)} (tipo original)</option>
                    )}
                    {QUESTION_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={q.is_required}
                      onChange={() => updateQuestion(si, qi, { is_required: !q.is_required })}
                    />
                    Obligatoria
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={q.is_conditional}
                      onChange={() => updateQuestion(si, qi, { is_conditional: !q.is_conditional })}
                    />
                    Condicional
                  </label>
                </div>

                {q.is_conditional && (
                  <div className="builder-conditional">
                    <select
                      className="input"
                      style={{ flex: 1, minWidth: 160, width: 'auto', padding: '8px 10px', borderRadius: 8, fontSize: 12.5 }}
                      value={q.conditional_on}
                      onChange={(e) => updateQuestion(si, qi, { conditional_on: e.target.value })}
                    >
                      <option value="">Depende de…</option>
                      {priorQuestionsFor(si, qi).map((pq) => (
                        <option key={pq.key} value={pq.key}>{pq.text}</option>
                      ))}
                    </select>
                    <input
                      className="input"
                      style={{ width: 140, padding: '8px 10px', borderRadius: 8, fontSize: 12.5 }}
                      value={q.conditional_value}
                      onChange={(e) => updateQuestion(si, qi, { conditional_value: e.target.value })}
                      placeholder="Valor (ej. Sí)"
                    />
                  </div>
                )}

                {hasOptions && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {q.options.map((opt, oi) => (
                      <div key={oi} style={{ display: 'flex', gap: 8 }}>
                        <input
                          className="input"
                          style={{ flex: 1, padding: '7px 10px', borderRadius: 8, fontSize: 12.5 }}
                          value={opt.option_text}
                          onChange={(e) =>
                            updateQuestion(si, qi, {
                              options: q.options.map((o, k) => (k === oi ? { ...o, option_text: e.target.value } : o)),
                            })
                          }
                          placeholder="Opción"
                        />
                        <button
                          style={{ border: 'none', background: '#f0f0f2', color: 'var(--text-2)', fontSize: 11, padding: '7px 10px', borderRadius: 8, cursor: 'pointer' }}
                          onClick={() =>
                            updateQuestion(si, qi, { options: q.options.filter((_, k) => k !== oi) })
                          }
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <button
                      className="btn-soft-blue"
                      style={{ alignSelf: 'flex-start' }}
                      onClick={() => updateQuestion(si, qi, { options: [...q.options, { option_text: '' }] })}
                    >
                      + Opción
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          <button
            className="btn-soft-blue"
            style={{ alignSelf: 'flex-start', fontSize: 12.5, padding: '8px 14px' }}
            onClick={() => updateSection(si, { questions: [...sec.questions, blankQuestion()] })}
          >
            + Pregunta
          </button>
        </div>
      ))}

      <button className="add-section-btn" onClick={() => setSections((secs) => [...secs, blankSection()])}>
        + Agregar sección
      </button>

      <div className="builder-actionbar">
        <button className="btn-outline" onClick={cancel}>Cancelar</button>
        <button className="btn-primary-lg" onClick={onSave} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar encuesta'}
        </button>
      </div>
    </div>
  );
}

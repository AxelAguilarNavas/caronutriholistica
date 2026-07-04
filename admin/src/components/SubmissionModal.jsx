import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../store.jsx';
import { CHOICE_TYPES, fmtDate, surveyQuestionsFlat } from '../utils.js';

// Modal (desktop) / bottom sheet (mobile) para ver y editar una
// quiz_submission. Se abre vía store.setActiveSubmission({ id, editing }).
export default function SubmissionModal() {
  const {
    activeSubmission, setActiveSubmission,
    submissions, surveys, clients,
    saveSubmissionAnswers, deleteSubmission,
    setConfirmModal, showToast, handleError,
  } = useApp();

  const submission = activeSubmission
    ? submissions.find((s) => s.id === activeSubmission.id)
    : null;

  const [editing, setEditing] = useState(false);
  const [draftAnswers, setDraftAnswers] = useState([]);

  useEffect(() => {
    if (activeSubmission && submission) {
      setEditing(!!activeSubmission.editing);
      setDraftAnswers(submission.answers.map((a) => ({ ...a })));
    }
  }, [activeSubmission?.id, activeSubmission?.editing, submission]);

  const survey = submission ? surveys.find((sv) => sv.id === submission.survey_id) : null;
  const client = submission ? clients.find((c) => c.id === submission.client_id) : null;
  const questions = useMemo(() => (survey ? surveyQuestionsFlat(survey) : []), [survey]);

  if (!activeSubmission || !submission) return null;

  const close = () => setActiveSubmission(null);

  const answerFor = (qid) => draftAnswers.find((a) => a.question_id === qid);

  const updateText = (qid, value) => {
    setDraftAnswers((as) => {
      const exists = as.some((a) => a.question_id === qid);
      return exists
        ? as.map((a) => (a.question_id === qid ? { ...a, option_id: null, answer_text: value } : a))
        : [...as, { question_id: qid, option_id: null, answer_text: value }];
    });
  };

  const selectOption = (qid, opt) => {
    setDraftAnswers((as) => {
      const exists = as.some((a) => a.question_id === qid);
      return exists
        ? as.map((a) => (a.question_id === qid ? { ...a, option_id: opt.id, answer_text: opt.option_text } : a))
        : [...as, { question_id: qid, option_id: opt.id, answer_text: opt.option_text }];
    });
  };

  const save = async () => {
    try {
      await saveSubmissionAnswers(submission.id, draftAnswers);
      setEditing(false);
      showToast('Respuesta actualizada');
    } catch (err) {
      handleError(err);
    }
  };

  const requestDelete = () => {
    setConfirmModal({
      title: 'Eliminar respuesta',
      message: '¿Seguro que quieres eliminar esta respuesta de encuesta? Esta acción no se puede deshacer.',
      onConfirm: async () => {
        try {
          await deleteSubmission(submission.id);
          close();
          showToast('Respuesta eliminada');
        } catch (err) {
          handleError(err);
        }
      },
    });
  };

  return (
    <>
      <div className="modal-backdrop" onClick={close} />
      <div className="submission-modal">
        <div className="modal-head">
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{survey?.name || '—'}</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 1 }}>
              {client?.name || '—'} · {fmtDate(submission.submitted_at)}
            </div>
          </div>
          <button className="modal-close" onClick={close}>✕</button>
        </div>

        <div className="modal-body">
          {questions.map((q) => {
            const answer = answerFor(q.id);
            const isChoice = CHOICE_TYPES.includes(q.question_type) && (q.options || []).length > 0;
            return (
              <div key={q.id}>
                <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 6 }}>{q.question_text}</div>
                {editing && !isChoice && (
                  <textarea
                    className="input"
                    style={{ minHeight: 60, fontSize: 13 }}
                    value={answer?.answer_text || ''}
                    onChange={(e) => updateText(q.id, e.target.value)}
                  />
                )}
                {editing && isChoice && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {q.options.map((opt) => {
                      const selected = answer && answer.option_id === opt.id;
                      return (
                        <span
                          key={opt.id}
                          className={`answer-chip${selected ? ' selected' : ''}`}
                          onClick={() => selectOption(q.id, opt)}
                        >
                          {opt.option_text}
                        </span>
                      );
                    })}
                  </div>
                )}
                {!editing && (
                  <div className="answer-readonly">{answer?.answer_text || '—'}</div>
                )}
              </div>
            );
          })}
        </div>

        <div className="modal-foot">
          {editing ? (
            <>
              <button
                className="btn-outline"
                style={{ padding: '10px 18px', fontSize: 13.5, borderRadius: 9 }}
                onClick={() => {
                  setEditing(false);
                  setDraftAnswers(submission.answers.map((a) => ({ ...a })));
                }}
              >
                Cancelar
              </button>
              <button className="btn-primary" style={{ padding: '10px 20px', fontSize: 13.5, borderRadius: 9 }} onClick={save}>
                Guardar cambios
              </button>
            </>
          ) : (
            <>
              <button className="btn-soft-red" style={{ padding: '10px 18px', fontSize: 13.5, borderRadius: 9 }} onClick={requestDelete}>
                Eliminar
              </button>
              <button className="btn-primary" style={{ padding: '10px 20px', fontSize: 13.5, borderRadius: 9 }} onClick={() => setEditing(true)}>
                Editar
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

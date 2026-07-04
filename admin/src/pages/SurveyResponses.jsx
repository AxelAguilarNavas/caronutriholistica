import { useParams } from 'react-router-dom';
import { useApp } from '../store.jsx';
import { fmtDate } from '../utils.js';

export default function SurveyResponses() {
  const { id } = useParams();
  const surveyId = Number(id);
  const {
    surveys, submissions, clients,
    setActiveSubmission, setConfirmModal, deleteSubmission, showToast, handleError,
  } = useApp();

  const survey = surveys.find((sv) => sv.id === surveyId);
  if (!survey) return <div className="empty-state">Encuesta no encontrada.</div>;

  const subs = submissions
    .filter((s) => s.survey_id === surveyId)
    .slice()
    .sort((a, b) => String(b.submitted_at).localeCompare(String(a.submitted_at)));

  const clientName = (cid) => clients.find((c) => c.id === cid)?.name || '—';

  const requestDelete = (subId) => {
    setConfirmModal({
      title: 'Eliminar respuesta',
      message: '¿Seguro que quieres eliminar esta respuesta de encuesta? Esta acción no se puede deshacer.',
      onConfirm: async () => {
        try {
          await deleteSubmission(subId);
          showToast('Respuesta eliminada');
        } catch (err) {
          handleError(err);
        }
      },
    });
  };

  return (
    <div className="page-narrow" style={{ gap: 10 }}>
      <div style={{ fontSize: 13, color: 'var(--text-3)' }}>{survey.name}</div>
      {subs.map((sub) => (
        <div key={sub.id} className="submission-card">
          <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => setActiveSubmission({ id: sub.id, editing: false })}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{clientName(sub.client_id)}</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 1 }}>
              {fmtDate(sub.submitted_at)} · {sub.is_complete ? 'Completa' : 'Incompleta'}
            </div>
          </div>
          <button className="btn-soft-blue" onClick={() => setActiveSubmission({ id: sub.id, editing: true })}>Editar</button>
          <button className="btn-soft-red" onClick={() => requestDelete(sub.id)}>Eliminar</button>
        </div>
      ))}
      {subs.length === 0 && (
        <div className="empty-state" style={{ padding: 40, fontSize: 13.5 }}>
          Aún no hay respuestas para esta encuesta.
        </div>
      )}
    </div>
  );
}

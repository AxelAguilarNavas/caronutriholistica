import { useNavigate } from 'react-router-dom';
import { useApp } from '../store.jsx';

export default function SurveysList() {
  const { surveys, submissions } = useApp();
  const navigate = useNavigate();

  const responsesCount = (sid) => submissions.filter((s) => s.survey_id === sid).length;

  return (
    <div className="page-mid">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
        <button className="btn-primary-lg" style={{ fontSize: 13.5, padding: '10px 18px' }} onClick={() => navigate('/encuestas/nueva')}>
          + Crear encuesta
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {surveys.map((sv) => {
          const n = responsesCount(sv.id);
          const questionsCount = sv.sections.reduce((acc, sec) => acc + sec.questions.length, 0);
          return (
            <div key={sv.id} className="survey-card" onClick={() => navigate(`/encuestas/${sv.id}`)}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>{sv.name}</span>
                  <span className={`badge ${sv.is_active ? 'badge-active' : 'badge-inactive'}`}>
                    {sv.is_active ? 'Activa' : 'Inactiva'}
                  </span>
                  {n > 0 && <span className="badge badge-locked">🔒 con respuestas</span>}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 4 }}>
                  {[sv.version, `${sv.sections.length} secciones`, `${questionsCount} preguntas`, `${n} respuestas`]
                    .filter(Boolean).join(' · ')}
                </div>
              </div>
              <div className="chevron-right">›</div>
            </div>
          );
        })}
        {surveys.length === 0 && <div className="empty-state">Aún no hay encuestas.</div>}
      </div>
    </div>
  );
}

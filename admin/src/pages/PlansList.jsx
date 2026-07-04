import { useNavigate } from 'react-router-dom';
import { useApp } from '../store.jsx';

export default function PlansList() {
  const { plans, clients } = useApp();
  const navigate = useNavigate();

  const activeClientsCount = (planId) =>
    clients.filter((c) => c.plan_id === planId && c.plan_status === 'enrolled').length;

  return (
    <div className="page-mid">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
        <button className="btn-primary-lg" style={{ fontSize: 13.5, padding: '10px 18px' }} onClick={() => navigate('/planes/nuevo')}>
          + Crear plan
        </button>
      </div>
      <div className="plans-grid">
        {plans.map((p) => (
          <div key={p.id} className="plan-card" onClick={() => navigate(`/planes/${p.id}`)}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 16, fontWeight: 700 }}>{p.name}</span>
              <span className={`badge ${p.is_active ? 'badge-active' : 'badge-inactive'}`}>
                {p.is_active ? 'Activo' : 'Inactivo'}
              </span>
            </div>
            <div className="plan-price">${Number(p.price_usd) || 0} / mes</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-3)', lineHeight: 1.4, minHeight: 32 }}>
              {p.description}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-4)', marginTop: 4 }}>
              {activeClientsCount(p.id)} clientes activos
            </div>
          </div>
        ))}
        {plans.length === 0 && <div className="empty-state">Aún no hay planes.</div>}
      </div>
    </div>
  );
}

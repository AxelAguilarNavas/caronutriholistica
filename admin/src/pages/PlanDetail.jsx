import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../store.jsx';

export default function PlanDetail() {
  const { id } = useParams();
  const planId = Number(id);
  const { plans, clients, updatePlan, deletePlan, setConfirmModal, showToast, handleError } = useApp();
  const navigate = useNavigate();

  const plan = plans.find((p) => p.id === planId);
  if (!plan) return <div className="empty-state">Plan no encontrado.</div>;

  const activeClients = clients.filter((c) => c.plan_id === planId && c.plan_status === 'enrolled').length;

  const onToggleActive = async () => {
    try {
      await updatePlan(planId, { is_active: !plan.is_active });
    } catch (err) {
      handleError(err);
    }
  };

  const requestDelete = () => {
    setConfirmModal({
      title: 'Eliminar plan',
      message: '¿Seguro que quieres eliminar este plan? Los clientes que lo tengan asignado conservarán la referencia histórica.',
      onConfirm: async () => {
        try {
          await deletePlan(planId);
          showToast('Plan eliminado');
          navigate('/planes');
        } catch (err) {
          handleError(err);
        }
      },
    });
  };

  return (
    <div className="page-form">
      <div className="card" style={{ padding: '22px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-0.3px' }}>{plan.name}</span>
              <span className={`badge ${plan.is_active ? 'badge-active' : 'badge-inactive'}`}>
                {plan.is_active ? 'Activo' : 'Inactivo'}
              </span>
            </div>
            <div className="plan-price" style={{ fontSize: 24, marginTop: 8 }}>
              ${Number(plan.price_usd) || 0} / mes
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-outline-sm" onClick={onToggleActive}>
              {plan.is_active ? 'Desactivar' : 'Activar'}
            </button>
            <button className="btn-soft-blue md" onClick={() => navigate(`/planes/${planId}/editar`)}>Editar</button>
            <button className="btn-soft-red md" onClick={requestDelete}>Eliminar</button>
          </div>
        </div>
        {plan.description && (
          <div style={{ fontSize: 13.5, color: '#48484a', lineHeight: 1.5, marginTop: 14 }}>{plan.description}</div>
        )}
        <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 14 }}>
          {activeClients} clientes activos en este plan
        </div>
      </div>
    </div>
  );
}

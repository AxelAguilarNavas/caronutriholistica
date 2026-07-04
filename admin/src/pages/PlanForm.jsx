import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../store.jsx';

export default function PlanForm({ mode }) {
  const { id } = useParams();
  const planId = mode === 'edit' ? Number(id) : null;
  const { plans, createPlan, updatePlan, showToast, handleError } = useApp();
  const navigate = useNavigate();

  const existing = mode === 'edit' ? plans.find((p) => p.id === planId) : null;
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (mode === 'create') {
      setDraft({ name: '', description: '', price_usd: 0, is_active: true });
    } else if (existing) {
      setDraft({
        name: existing.name || '',
        description: existing.description || '',
        price_usd: Number(existing.price_usd) || 0,
        is_active: !!existing.is_active,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, planId, !!existing]);

  if (mode === 'edit' && !existing) return <div className="empty-state">Plan no encontrado.</div>;
  if (!draft) return null;

  const onSave = async () => {
    if (!draft.name.trim()) { showToast('El nombre del plan es obligatorio'); return; }
    setSaving(true);
    try {
      if (mode === 'create') {
        await createPlan(draft);
        showToast('Plan creado');
        navigate('/planes');
      } else {
        await updatePlan(planId, draft);
        showToast('Plan actualizado');
        navigate(`/planes/${planId}`);
      }
    } catch (err) {
      handleError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-form">
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{mode === 'create' ? 'Nuevo plan' : 'Editar plan'}</div>
        <div>
          <label className="field-label">Nombre</label>
          <input
            className="input field"
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            placeholder="Ej. Plus"
          />
        </div>
        <div>
          <label className="field-label">Descripción</label>
          <textarea
            className="input field"
            style={{ minHeight: 80, fontSize: 14 }}
            value={draft.description}
            onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
            placeholder="Describe qué incluye este plan…"
          />
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label className="field-label">Precio (USD)</label>
            <input
              type="number"
              className="input field"
              value={draft.price_usd}
              onChange={(e) => setDraft((d) => ({ ...d, price_usd: Number(e.target.value) }))}
            />
          </div>
          <label className="checkbox-label" style={{ fontSize: 13, paddingBottom: 11 }}>
            <input
              type="checkbox"
              checked={draft.is_active}
              onChange={() => setDraft((d) => ({ ...d, is_active: !d.is_active }))}
            />
            Activo
          </label>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button className="btn-outline" onClick={() => navigate(mode === 'edit' ? `/planes/${planId}` : '/planes')}>
          Cancelar
        </button>
        <button className="btn-primary-lg" onClick={onSave} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar plan'}
        </button>
      </div>
    </div>
  );
}

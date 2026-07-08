import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useApp } from '../store.jsx';
import Switch from '../components/Switch.jsx';
import ShareSurveyButton from '../components/ShareSurveyButton.jsx';
import {
  avatarColor, fmtDate, initialsOf, isValidEmail,
  planStatusLabel, PLAN_STATUS_OPTIONS,
} from '../utils.js';

export default function ClientDetail() {
  const { id } = useParams();
  const clientId = Number(id);
  const {
    clients, plans, submissions, surveys,
    updateClient, setClientVip, setClientBotStatus, syncClientBotStatus, saveNutritionPlan,
    setActiveSubmission, setConfirmModal, deleteSubmission,
    showToast, handleError,
  } = useApp();

  const client = clients.find((c) => c.id === clientId);

  const [draft, setDraft] = useState(null);
  const [vipReasonDraft, setVipReasonDraft] = useState('');
  const [showVipReasonInput, setShowVipReasonInput] = useState(false);
  const [nutritionDraft, setNutritionDraft] = useState('');

  useEffect(() => {
    if (client) {
      setDraft({
        name: client.name || '',
        email: client.email || '',
        phone: client.phone || '',
        channel: client.channel || '',
        source_platform: client.source_platform || '',
        plan_id: client.plan_id || '',
        plan_status: client.plan_status || 'enrolled',
        notes: client.notes || '',
      });
      setVipReasonDraft(client.vip_reason || '');
      setNutritionDraft(client.nutrition_plan_text || '');
      setShowVipReasonInput(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, !!client]);

  useEffect(() => {
    if (clientId) syncClientBotStatus(clientId).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  if (!client || !draft) return <div className="empty-state">Cliente no encontrado.</div>;

  const planName = plans.find((p) => p.id === client.plan_id)?.name || '—';

  const clientSubs = submissions
    .filter((s) => s.client_id === clientId)
    .slice()
    .sort((a, b) => String(b.submitted_at).localeCompare(String(a.submitted_at)));

  const surveyName = (sid) => surveys.find((sv) => sv.id === sid)?.name || '—';

  const setField = (field, value) => setDraft((d) => ({ ...d, [field]: value }));

  const onToggleVip = async () => {
    const turningOn = !client.is_vip;
    try {
      await setClientVip(clientId, turningOn, turningOn ? client.vip_reason || '' : null);
      setShowVipReasonInput(turningOn);
      setVipReasonDraft(turningOn ? client.vip_reason || '' : '');
      showToast(turningOn ? 'Cliente marcado como VIP' : 'Cliente ya no es VIP');
    } catch (err) {
      handleError(err);
    }
  };

  const onToggleBot = async () => {
    const turningOn = !client.bot_enabled;
    try {
      const res = await setClientBotStatus(clientId, turningOn);
      showToast(
        (turningOn ? 'Bot reactivado' : 'Bot pausado') +
        (res.syncError ? ` (no se sincronizó con ManyChat: ${res.syncError})` : '')
      );
    } catch (err) {
      handleError(err);
    }
  };

  const onSaveVipReason = async () => {
    try {
      await setClientVip(clientId, true, vipReasonDraft);
      setShowVipReasonInput(false);
      showToast('Motivo guardado');
    } catch (err) {
      handleError(err);
    }
  };

  const onSaveInfo = async () => {
    if (!draft.name.trim()) { showToast('El nombre es obligatorio'); return; }
    if (!isValidEmail(draft.email)) { showToast('El correo del cliente no es válido'); return; }
    try {
      await updateClient(clientId, { ...draft, plan_id: draft.plan_id || null });
      showToast('Información del cliente actualizada');
    } catch (err) {
      handleError(err);
    }
  };

  const onSaveNutrition = async () => {
    try {
      await saveNutritionPlan(clientId, nutritionDraft);
      showToast('Plan de nutrición guardado');
    } catch (err) {
      handleError(err);
    }
  };

  const requestDeleteSub = (subId) => {
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

  const vipMeta = client.is_vip
    ? `Marcado VIP ${client.vip_set_by === 'automatic' ? 'automáticamente' : 'manualmente'}${client.vip_set_at ? ` el ${fmtDate(client.vip_set_at)}` : ''}${client.vip_reason ? ` — ${client.vip_reason}` : ''}`
    : null;

  return (
    <div className="page-narrow">
      {/* 1. Header */}
      <div className="card" style={{ padding: 24, display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="avatar" style={{ width: 64, height: 64, fontSize: 22, background: avatarColor(client.id) }}>
          {initialsOf(client.name)}
        </div>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.3px' }}>{client.name || '(sin nombre)'}</span>
            {client.is_vip && <span className="badge-vip" style={{ fontSize: 10.5, padding: '2px 9px' }}>★ VIP</span>}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>
            {[client.email, client.phone].filter(Boolean).join(' · ') || '—'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-4)', marginTop: 2 }}>
            {[client.channel, `Plan ${planName}`, planStatusLabel(client.plan_status)].filter(Boolean).join(' · ')}
          </div>
        </div>
        <ShareSurveyButton client={client} />
      </div>

      {/* 2. Cliente VIP */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="card-title">Cliente VIP</div>
          <Switch on={!!client.is_vip} onToggle={onToggleVip} />
        </div>
        {showVipReasonInput && (
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8, animation: 'fadeIn 0.2s ease' }}>
            <label className="field-label">Motivo (opcional)</label>
            <textarea
              className="input"
              style={{ minHeight: 56 }}
              value={vipReasonDraft}
              onChange={(e) => setVipReasonDraft(e.target.value)}
              placeholder="Ej. Cliente de más de 2 años, referidos frecuentes…"
            />
            <button className="btn-primary" style={{ alignSelf: 'flex-end', padding: '8px 16px' }} onClick={onSaveVipReason}>
              Guardar
            </button>
          </div>
        )}
        {vipMeta && <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-3)' }}>{vipMeta}</div>}
      </div>

      {/* 2.5 Bot de WhatsApp */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="card-title">Bot de WhatsApp</div>
          <Switch on={!!client.bot_enabled} onToggle={onToggleBot} blue />
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-3)' }}>
          {client.bot_enabled
            ? 'El bot responde automáticamente a este cliente.'
            : 'El bot está pausado para este cliente — tú respondes manualmente.'}
        </div>
      </div>

      {/* 3. Información del cliente */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="card-title">Información del cliente</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label className="field-label">Nombre</label>
            <input className="input field" value={draft.name} onChange={(e) => setField('name', e.target.value)} />
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label className="field-label">Correo electrónico</label>
            <input type="email" className="input field" value={draft.email} onChange={(e) => setField('email', e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label className="field-label">Teléfono</label>
            <input className="input field" value={draft.phone} onChange={(e) => setField('phone', e.target.value)} />
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label className="field-label">Canal</label>
            <input className="input field" value={draft.channel} onChange={(e) => setField('channel', e.target.value)} placeholder="Ej. Instagram, WhatsApp" />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label className="field-label">Plataforma de origen</label>
            <input className="input field" value={draft.source_platform} onChange={(e) => setField('source_platform', e.target.value)} placeholder="Ej. IG Ads, Landing, Referido" />
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label className="field-label">Plan</label>
            <select className="input field" value={draft.plan_id || ''} onChange={(e) => setField('plan_id', e.target.value ? Number(e.target.value) : '')}>
              <option value="">— Sin plan —</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label className="field-label">Estado del plan</label>
            <select className="input field" value={draft.plan_status || ''} onChange={(e) => setField('plan_status', e.target.value)}>
              {PLAN_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="field-label">Notas</label>
          <textarea className="input field" style={{ minHeight: 70 }} value={draft.notes} onChange={(e) => setField('notes', e.target.value)} placeholder="Notas internas sobre este cliente…" />
        </div>
        <button className="btn-primary" style={{ alignSelf: 'flex-start' }} onClick={onSaveInfo}>
          Guardar cambios
        </button>
      </div>

      {/* 4. Plan de nutrición */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div className="card-title">Plan de nutrición</div>
          {client.nutrition_plan_updated_at && (
            <div style={{ fontSize: 11.5, color: 'var(--text-4)' }}>
              Actualizado {fmtDate(client.nutrition_plan_updated_at)}
            </div>
          )}
        </div>
        <textarea
          className="input"
          style={{ minHeight: 110, borderRadius: 10, padding: '12px 14px' }}
          value={nutritionDraft}
          onChange={(e) => setNutritionDraft(e.target.value)}
          placeholder="Describe el plan de nutrición entregado a este cliente…"
        />
        <button className="btn-primary" style={{ marginTop: 10 }} onClick={onSaveNutrition}>
          Guardar plan
        </button>
      </div>

      {/* 5. Respuestas a encuestas */}
      <div className="card">
        <div className="card-title" style={{ marginBottom: 12 }}>Respuestas a encuestas ({clientSubs.length})</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {clientSubs.map((sub) => (
            <div key={sub.id} className="submission-row">
              <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => setActiveSubmission({ id: sub.id, editing: false })}>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{surveyName(sub.survey_id)}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 1 }}>
                  {fmtDate(sub.submitted_at)} · {sub.is_complete ? 'Completa' : 'Incompleta'}
                </div>
              </div>
              <button className="btn-soft-blue" onClick={() => setActiveSubmission({ id: sub.id, editing: true })}>Editar</button>
              <button className="btn-soft-red" onClick={() => requestDeleteSub(sub.id)}>Eliminar</button>
            </div>
          ))}
          {clientSubs.length === 0 && (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-3)', fontSize: 13 }}>
              Este cliente no ha respondido encuestas todavía.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

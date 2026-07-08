import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../store.jsx';
import Switch from '../components/Switch.jsx';
import { avatarColor, fmtDate, fmtTime, initialsOf, planStatusLabel } from '../utils.js';

function ProfileField({ label, value }) {
  return (
    <div style={{ minWidth: 160 }}>
      <div className="field-label">{label}</div>
      <div style={{ marginTop: 3, fontSize: 13.5 }}>{value || '—'}</div>
    </div>
  );
}

export default function Mensajeria() {
  const { id } = useParams();
  const clientId = id ? Number(id) : null;
  const navigate = useNavigate();
  const {
    clients, plans, submissions, surveys,
    isDesktop, setClientVip, setClientBotStatus, syncClientBotStatus, showToast, handleError,
    messagePreviews, messagesByClient, loadMessagePreviews, loadClientMessages,
    setActiveSubmission,
  } = useApp();

  const [search, setSearch] = useState('');
  const [vipReasonDraft, setVipReasonDraft] = useState('');
  const [showVipReasonInput, setShowVipReasonInput] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    loadMessagePreviews().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (clientId) {
      setShowVipReasonInput(false);
      setProfileOpen(false);
      loadClientMessages(clientId).catch((err) => handleError(err));
      syncClientBotStatus(clientId).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const client = clientId ? clients.find((c) => c.id === clientId) : null;
  const messages = clientId ? messagesByClient[clientId] || [] : [];
  const planName = client ? plans.find((p) => p.id === client.plan_id)?.name || '—' : '—';

  const previewFor = (c) => messagePreviews.find((p) => p.client_id === c.id);

  const term = search.trim().toLowerCase();
  const list = clients
    .filter(
      (c) =>
        !term ||
        (c.name || '').toLowerCase().includes(term) ||
        (c.email || '').toLowerCase().includes(term) ||
        (c.phone || '').toLowerCase().includes(term)
    )
    .slice()
    .sort((a, b) => {
      const pa = previewFor(a);
      const pb = previewFor(b);
      if (pa && pb) return String(pb.sent_at).localeCompare(String(pa.sent_at));
      if (pa) return -1;
      if (pb) return 1;
      return (a.name || '').localeCompare(b.name || '', 'es');
    });

  const onToggleVip = async () => {
    const turningOn = !client.is_vip;
    try {
      await setClientVip(client.id, turningOn, turningOn ? client.vip_reason || '' : null);
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
      const res = await setClientBotStatus(client.id, turningOn);
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
      await setClientVip(client.id, true, vipReasonDraft);
      setShowVipReasonInput(false);
      showToast('Motivo guardado');
    } catch (err) {
      handleError(err);
    }
  };

  const clientSubs = client
    ? submissions
        .filter((s) => s.client_id === client.id)
        .slice()
        .sort((a, b) => String(b.submitted_at).localeCompare(String(a.submitted_at)))
    : [];
  const surveyName = (sid) => surveys.find((sv) => sv.id === sid)?.name || '—';

  const showList = !clientId || isDesktop;
  const showConversation = isDesktop || !!clientId;

  const conversationList = (
    <div className="messaging-list">
      <input
        className="input messaging-search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar cliente…"
      />
      <div className="messaging-list-scroll">
        {list.map((c) => {
          const preview = previewFor(c);
          return (
            <div
              key={c.id}
              className={`conversation-item${c.id === clientId ? ' active' : ''}`}
              onClick={() => navigate(`/mensajeria/${c.id}`)}
            >
              <div className="avatar" style={{ width: 40, height: 40, fontSize: 13.5, background: avatarColor(c.id) }}>
                {initialsOf(c.name)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600 }}>{c.name || '(sin nombre)'}</span>
                  {c.is_vip && <span className="badge-vip">★</span>}
                </div>
                <div className="conversation-preview">
                  {preview ? preview.message_text : 'Sin mensajes todavía'}
                </div>
              </div>
              {preview && <div className="conversation-time">{fmtTime(preview.sent_at)}</div>}
            </div>
          );
        })}
        {list.length === 0 && (
          <div className="empty-state" style={{ padding: '32px 10px' }}>No se encontraron clientes.</div>
        )}
      </div>
    </div>
  );

  const conversationPane = !client ? (
    <div className="messaging-main">
      <div className="card empty-state">Selecciona una conversación para verla aquí.</div>
    </div>
  ) : (
    <div className="messaging-main">
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div
          onClick={() => setProfileOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 160, cursor: 'pointer' }}
        >
          <div className="avatar" style={{ width: 48, height: 48, fontSize: 16, background: avatarColor(client.id) }}>
            {initialsOf(client.name)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 16, fontWeight: 700 }}>{client.name || '(sin nombre)'}</span>
              {client.is_vip && <span className="badge-vip">★ VIP</span>}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 2 }}>
              {[client.phone, client.channel].filter(Boolean).join(' · ') || '—'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <span style={{ fontSize: 11.5, color: 'var(--text-3)', fontWeight: 600 }}>Cliente VIP</span>
            <Switch on={!!client.is_vip} onToggle={onToggleVip} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <span style={{ fontSize: 11.5, color: 'var(--text-3)', fontWeight: 600 }}>Bot activo</span>
            <Switch on={!!client.bot_enabled} onToggle={onToggleBot} blue />
          </div>
        </div>
        {showVipReasonInput && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8, animation: 'fadeIn 0.2s ease' }}>
            <label className="field-label">Motivo (opcional)</label>
            <textarea
              className="input"
              style={{ minHeight: 50 }}
              value={vipReasonDraft}
              onChange={(e) => setVipReasonDraft(e.target.value)}
              placeholder="Ej. Cliente de más de 2 años, referidos frecuentes…"
            />
            <button className="btn-primary" style={{ alignSelf: 'flex-end', padding: '8px 16px' }} onClick={onSaveVipReason}>
              Guardar
            </button>
          </div>
        )}
      </div>

      <div className="card" style={{ padding: '16px 16px 14px' }}>
        <div className="card-title" style={{ marginBottom: 10 }}>Conversación</div>
        <div className="chat-window">
          {messages.length === 0 && (
            <div className="empty-state" style={{ padding: '40px 10px' }}>No hay mensajes con este cliente todavía.</div>
          )}
          {messages.map((m) => {
            const outgoing = m.orientation === 'Outgoing';
            return (
              <div key={m.id} className={`chat-row ${outgoing ? 'outgoing' : 'incoming'}`}>
                <div className={`chat-bubble ${outgoing ? 'outgoing' : 'incoming'}`}>
                  <div>{m.message_text}</div>
                  <div className="chat-bubble-time">{fmtTime(m.sent_at)}</div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="chat-input-bar">
          <textarea className="chat-input-disabled" rows={1} placeholder="Escribir un mensaje…" disabled />
          <button className="chat-send-btn-disabled" disabled>Enviar</button>
        </div>
        <div className="wip-note">El envío de mensajes desde el panel está en construcción.</div>
      </div>
    </div>
  );

  const profileDrawer = profileOpen && client && (
    <>
      <div className="profile-drawer-backdrop" onClick={() => setProfileOpen(false)} />
      <div className="profile-drawer">
        <div className="profile-drawer-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="avatar" style={{ width: 40, height: 40, fontSize: 13.5, background: avatarColor(client.id) }}>
              {initialsOf(client.name)}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{client.name || '(sin nombre)'}</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Perfil del cliente</div>
            </div>
          </div>
          <button className="modal-close" onClick={() => setProfileOpen(false)}>✕</button>
        </div>

        <div className="profile-drawer-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="card-title">Información del cliente</div>
              <button className="btn-soft-blue" onClick={() => navigate(`/clientes/${client.id}`)}>Editar perfil completo</button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 20px' }}>
              <ProfileField label="Correo electrónico" value={client.email} />
              <ProfileField label="Teléfono" value={client.phone} />
              <ProfileField label="Canal" value={client.channel} />
              <ProfileField label="Plataforma de origen" value={client.source_platform} />
              <ProfileField label="Plan" value={planName} />
              <ProfileField label="Estado del plan" value={planStatusLabel(client.plan_status)} />
            </div>
            {client.notes && (
              <div>
                <div className="field-label">Notas</div>
                <div style={{ marginTop: 3, fontSize: 13.5, color: 'var(--text-2)' }}>{client.notes}</div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="card-title">Respuestas a encuestas ({clientSubs.length})</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {clientSubs.map((sub) => (
                <div
                  key={sub.id}
                  className="submission-row"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setActiveSubmission({ id: sub.id, editing: false })}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>{surveyName(sub.survey_id)}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 1 }}>
                      {fmtDate(sub.submitted_at)} · {sub.is_complete ? 'Completa' : 'Incompleta'}
                    </div>
                  </div>
                  <div className="chevron-right">›</div>
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
      </div>
    </>
  );

  return (
    <div className="messaging-page">
      <div className="messaging-layout">
        {showList && conversationList}
        {showConversation && conversationPane}
      </div>
      {profileDrawer}
    </div>
  );
}

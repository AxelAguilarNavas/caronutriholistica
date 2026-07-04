import { useNavigate } from 'react-router-dom';
import { useApp } from '../store.jsx';
import Switch from '../components/Switch.jsx';
import { avatarColor, initialsOf } from '../utils.js';

export default function ClientsList() {
  const { clients, plans, vipFilterOn, setVipFilterOn, clientSearch } = useApp();
  const navigate = useNavigate();

  const search = clientSearch.trim().toLowerCase();
  const filtered = clients
    .filter(
      (c) =>
        (!vipFilterOn || c.is_vip) &&
        (!search ||
          (c.name || '').toLowerCase().includes(search) ||
          (c.email || '').toLowerCase().includes(search))
    )
    .sort(
      (a, b) =>
        Number(b.is_vip) - Number(a.is_vip) ||
        (a.name || '').localeCompare(b.name || '', 'es')
    );

  const planName = (id) => plans.find((p) => p.id === id)?.name || '—';

  return (
    <div className="page-wide">
      <div className="vip-filter-card">
        <div>
          <div style={{ fontSize: 14.5, fontWeight: 600 }}>Solo clientes VIP</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 1 }}>
            Filtra el listado para mostrar únicamente clientes marcados como VIP
          </div>
        </div>
        <Switch on={vipFilterOn} onToggle={() => setVipFilterOn(!vipFilterOn)} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map((c) => (
          <div key={c.id} className="client-card" onClick={() => navigate(`/clientes/${c.id}`)}>
            <div className="avatar" style={{ width: 44, height: 44, fontSize: 15, background: avatarColor(c.id) }}>
              {initialsOf(c.name)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 600 }}>{c.name || '(sin nombre)'}</span>
                {c.is_vip && <span className="badge-vip">★ VIP</span>}
              </div>
              <div className="client-sub">
                {[c.email, c.phone, planName(c.plan_id)].filter(Boolean).join(' · ')}
              </div>
            </div>
            <div className="chevron-right">›</div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="empty-state">No se encontraron clientes con estos filtros.</div>
        )}
      </div>
    </div>
  );
}

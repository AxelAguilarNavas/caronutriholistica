import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../store.jsx';
import { initialsOf } from '../utils.js';

function NavIcon({ type, active }) {
  const color = active ? '#0071e3' : '#8e8e93';
  if (type === 'messages') {
    return (
      <div style={{ width: 26, height: 26, flex: 'none', position: 'relative' }}>
        <div style={{ width: 24, height: 17, borderRadius: 6, border: `2px solid ${color}`, position: 'absolute', top: 0, left: 0 }} />
        <div style={{
          position: 'absolute', top: 14, left: 5, width: 0, height: 0,
          borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: `5px solid ${color}`,
        }}
        />
      </div>
    );
  }
  if (type === 'clients') {
    return (
      <div style={{ width: 26, height: 26, flex: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
        <div style={{ width: 14, height: 14, borderRadius: '50%', background: color }} />
        <div style={{ width: 20, height: 9, borderRadius: '9px 9px 0 0', background: color, marginTop: 1 }} />
      </div>
    );
  }
  if (type === 'surveys') {
    return (
      <div style={{ width: 26, height: 26, flex: 'none', borderRadius: 6, border: `2px solid ${color}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
        <div style={{ width: 12, height: 2, background: color, borderRadius: 2 }} />
        <div style={{ width: 12, height: 2, background: color, borderRadius: 2 }} />
      </div>
    );
  }
  return (
    <div style={{ width: 26, height: 26, flex: 'none', borderRadius: 6, border: `2px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 11, height: 11, borderRadius: '50%', border: `2px solid ${color}` }} />
    </div>
  );
}

const NAV_ITEMS = [
  { key: 'messages', label: 'Mensajería', path: '/mensajeria' },
  { key: 'clients', label: 'Clientes', path: '/clientes' },
  { key: 'surveys', label: 'Encuestas', path: '/encuestas' },
  { key: 'plans', label: 'Planes', path: '/planes' },
];

export default function AppSidebar() {
  const {
    isDesktop, sidebarCollapsed, setSidebarCollapsed,
    mobileSidebarOpen, setMobileSidebarOpen, logout, user,
  } = useApp();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const activeModule = pathname.startsWith('/mensajeria')
    ? 'messages'
    : pathname.startsWith('/encuestas')
    ? 'surveys'
    : pathname.startsWith('/planes')
    ? 'plans'
    : 'clients';
  const expanded = isDesktop ? !sidebarCollapsed : true;

  const go = (path) => {
    navigate(path);
    setMobileSidebarOpen(false);
  };

  const cls = isDesktop
    ? `sidebar desktop${sidebarCollapsed ? ' collapsed' : ''}`
    : `sidebar mobile${mobileSidebarOpen ? ' open' : ''}`;

  return (
    <>
      {!isDesktop && mobileSidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setMobileSidebarOpen(false)} />
      )}
      <nav className={cls}>
        <div className="sidebar-logo-row">
          <div className="sidebar-logo">
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>NC</span>
          </div>
          {expanded && <span style={{ fontSize: 14.5, fontWeight: 600, whiteSpace: 'nowrap' }}>Panel Nutrición</span>}
        </div>

        <div className="sidebar-nav">
          {NAV_ITEMS.map((item) => {
            const active = activeModule === item.key;
            return (
              <div key={item.key} className={`nav-item${active ? ' active' : ''}`} onClick={() => go(item.path)}>
                <NavIcon type={item.key} active={active} />
                {expanded && <span className="nav-label">{item.label}</span>}
              </div>
            );
          })}
        </div>

        <div className="sidebar-foot">
          {isDesktop && (
            <div className="sidebar-foot-item" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
              <div className={`collapse-chevron${sidebarCollapsed ? ' rotated' : ''}`}>‹</div>
              {expanded && <span style={{ whiteSpace: 'nowrap' }}>Colapsar</span>}
            </div>
          )}
          <div className="sidebar-foot-item" onClick={logout}>
            <div className="sidebar-avatar">{initialsOf(user?.email?.split('@')[0]?.replace(/[._-]/g, ' ') || 'N')}</div>
            {expanded && <span style={{ whiteSpace: 'nowrap' }}>Cerrar sesión</span>}
          </div>
        </div>
      </nav>
    </>
  );
}

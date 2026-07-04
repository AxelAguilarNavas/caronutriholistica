import { matchPath, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../store.jsx';

export default function TopBar() {
  const {
    isDesktop, setMobileSidebarOpen, clients, surveys, plans,
    clientSearch, setClientSearch,
  } = useApp();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const m = (pattern) => matchPath(pattern, pathname);

  let pageTitle = 'Clientes';
  let backTo = null;

  let match;
  if ((match = m('/clientes/:id'))) {
    const client = clients.find((c) => String(c.id) === match.params.id);
    pageTitle = client?.name || 'Cliente';
    backTo = '/clientes';
  } else if (m('/encuestas/nueva')) {
    pageTitle = 'Nueva encuesta';
    backTo = '/encuestas';
  } else if ((match = m('/encuestas/:id/editar'))) {
    pageTitle = 'Editar encuesta';
    backTo = `/encuestas/${match.params.id}`;
  } else if ((match = m('/encuestas/:id/respuestas'))) {
    pageTitle = 'Respuestas';
    backTo = `/encuestas/${match.params.id}`;
  } else if ((match = m('/encuestas/:id'))) {
    const survey = surveys.find((s) => String(s.id) === match.params.id);
    pageTitle = survey?.name || 'Encuesta';
    backTo = '/encuestas';
  } else if (m('/encuestas')) {
    pageTitle = 'Encuestas';
  } else if (m('/planes/nuevo')) {
    pageTitle = 'Nuevo plan';
    backTo = '/planes';
  } else if ((match = m('/planes/:id/editar'))) {
    pageTitle = 'Editar plan';
    backTo = `/planes/${match.params.id}`;
  } else if ((match = m('/planes/:id'))) {
    const plan = plans.find((p) => String(p.id) === match.params.id);
    pageTitle = plan?.name || 'Plan';
    backTo = '/planes';
  } else if (m('/planes')) {
    pageTitle = 'Planes';
  }

  const isClientsList = !!m('/clientes');

  return (
    <header className="topbar">
      <button className="hamburger" onClick={() => setMobileSidebarOpen(true)} aria-label="Abrir menú">
        <div /><div /><div />
      </button>
      {!isDesktop && backTo && (
        <button className="back-btn" onClick={() => navigate(backTo)}>
          <span className="chev">‹</span><span>Atrás</span>
        </button>
      )}
      <div className="topbar-title">{pageTitle}</div>
      <div style={{ flex: 1 }} />
      {isClientsList && (
        <input
          className="topbar-search"
          value={clientSearch}
          onChange={(e) => setClientSearch(e.target.value)}
          placeholder="Buscar cliente…"
        />
      )}
    </header>
  );
}

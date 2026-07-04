import { Outlet } from 'react-router-dom';
import { useApp } from '../store.jsx';
import AppSidebar from './AppSidebar.jsx';
import TopBar from './TopBar.jsx';
import SubmissionModal from './SubmissionModal.jsx';
import ConfirmModal from './ConfirmModal.jsx';
import Toast from './Toast.jsx';

export default function AppLayout() {
  const { dataLoaded } = useApp();

  return (
    <div className="app-shell">
      <AppSidebar />
      <div className="main-col">
        <TopBar />
        <main className="content">
          {dataLoaded ? <Outlet /> : (
            <div className="empty-state">Cargando…</div>
          )}
        </main>
      </div>
      <SubmissionModal />
      <ConfirmModal />
      <Toast />
    </div>
  );
}

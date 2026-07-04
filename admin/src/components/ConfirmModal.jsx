import { useApp } from '../store.jsx';

export default function ConfirmModal() {
  const { confirmModal, setConfirmModal } = useApp();
  if (!confirmModal) return null;

  const { title, message, onConfirm } = confirmModal;

  return (
    <div className="confirm-overlay">
      <div className="confirm-box">
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.5, marginBottom: 20 }}>{message}</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            className="btn-outline"
            style={{ padding: '9px 16px', fontSize: 13.5, borderRadius: 9 }}
            onClick={() => setConfirmModal(null)}
          >
            Cancelar
          </button>
          <button
            className="btn-danger"
            onClick={async () => {
              setConfirmModal(null);
              await onConfirm();
            }}
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

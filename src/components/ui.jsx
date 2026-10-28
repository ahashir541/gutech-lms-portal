import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import Icon from './Icon';

export const Spinner = ({ size = 20 }) => <span className="spinner" style={{ width: size, height: size }} />;

export const PageLoader = ({ label = 'Loading…' }) => (
  <div className="page-loader">
    <Spinner size={32} />
    <p>{label}</p>
  </div>
);

export function EmptyState({ icon = 'book', title, children, action }) {
  return (
    <div className="empty">
      <div className="empty-icon"><Icon name={icon} size={28} /></div>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export const ErrorState = ({ message, onRetry }) => (
  <div className="empty error-state">
    <h3>Could not load this page</h3>
    <p>{message}</p>
    {onRetry && <button className="btn btn-secondary" onClick={onRetry}>Try again</button>}
  </div>
);

export const Badge = ({ tone = 'neutral', children }) => <span className={`badge badge-${tone}`}>{children}</span>;

export function StatCard({ icon, label, value, tone = 'navy' }) {
  return (
    <div className={`stat stat-${tone}`}>
      <div className="stat-icon"><Icon name={icon} size={22} /></div>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

export function Modal({ title, onClose, children, footer, wide }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

// ---- Toasts + confirm dialog, available app-wide ----
const FeedbackContext = createContext(null);

export function FeedbackProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);

  const toast = useCallback((message, tone = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  const confirm = useCallback(
    (message, { title = 'Are you sure?', confirmLabel = 'Delete', tone = 'danger' } = {}) =>
      new Promise((resolve) => setConfirmState({ message, title, confirmLabel, tone, resolve })),
    [],
  );

  const close = (result) => {
    confirmState?.resolve(result);
    setConfirmState(null);
  };

  return (
    <FeedbackContext.Provider value={{ toast, confirm }}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.tone}`}>
            <Icon name={t.tone === 'error' ? 'x' : 'check'} size={18} />
            <span>{t.message}</span>
          </div>
        ))}
      </div>
      {confirmState && (
        <Modal
          title={confirmState.title}
          onClose={() => close(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => close(false)}>Cancel</button>
              <button className={`btn btn-${confirmState.tone}`} onClick={() => close(true)}>{confirmState.confirmLabel}</button>
            </>
          }
        >
          <p>{confirmState.message}</p>
        </Modal>
      )}
    </FeedbackContext.Provider>
  );
}

export const useFeedback = () => useContext(FeedbackContext);

// Load data from the API with loading / error / reload handling.
export function useLoader(loader, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      setState({ data: await loader(), loading: false, error: null });
    } catch (err) {
      setState({ data: null, loading: false, error: err.message });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => {
    load();
  }, [load]);
  return { ...state, reload: load };
}

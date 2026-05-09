import { Check, X, Warning, Info } from './Icon';

const ICONS = {
  success: Check,
  error: Warning,
  info: Info,
};

export default function Toast({ toast, onDismiss }) {
  const Ico = ICONS[toast?.kind] || Check;
  return (
    <div className={`toast ${toast ? 'show' : ''}`} role="status" aria-live="polite">
      {toast && (
        <>
          <span className="ico"><Ico /></span>
          <span>{toast.msg}</span>
          {toast.undo && (
            <button className="undo" onClick={() => { toast.undo(); onDismiss(); }}>
              Undo
            </button>
          )}
          <button
            className="undo"
            style={{ color: '#9aa19e' }}
            onClick={onDismiss}
            aria-label="Dismiss"
          >
            <X style={{ width: 14, height: 14 }} />
          </button>
        </>
      )}
    </div>
  );
}

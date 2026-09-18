import React, { useEffect } from 'react';

export default function Toast({ toast, toasts, onClose, removeToast }) {
  // Normalize single toast prop or array of toasts
  const toastList = toasts && Array.isArray(toasts)
    ? toasts
    : toast
    ? [toast]
    : [];

  const handleDismiss = (idOrIndex) => {
    if (removeToast) removeToast(idOrIndex);
    if (onClose) onClose();
  };

  useEffect(() => {
    if (toastList.length > 0) {
      const timer = setTimeout(() => {
        if (onClose) onClose();
        if (removeToast && toastList[0]?.id) removeToast(toastList[0].id);
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [toast, toasts]);

  if (toastList.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      zIndex: 3000
    }}>
      {toastList.map((t, idx) => {
        const isSuccess = t.type === 'success';
        const isWarningOrError = t.type === 'warning' || t.type === 'error';
        const toastClass = isSuccess
          ? 'toast-noticeable-success'
          : isWarningOrError
          ? 'toast-noticeable-warning'
          : 'toast-noticeable-info';

        return (
          <div
            key={t.id || idx}
            className={toastClass}
            style={{
              borderRadius: '8px',
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              minWidth: '320px',
              maxWidth: '460px',
              fontSize: '13px',
              color: '#0f172a',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
              animation: 'slideInToast 0.25s ease-out'
            }}
          >
            <div style={{
              fontSize: '10px',
              fontWeight: '800',
              fontFamily: 'var(--font-mono)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2px 6px',
              borderRadius: '0px',
              flexShrink: 0,
              backgroundColor: isSuccess ? '#dcfce7' : isWarningOrError ? '#fee2e2' : '#dbeafe',
              color: isSuccess ? '#16a34a' : isWarningOrError ? '#dc2626' : '#2563eb',
              border: `1px solid ${isSuccess ? '#16a34a' : isWarningOrError ? '#dc2626' : '#2563eb'}`
            }}>
              {isSuccess ? 'OK' : isWarningOrError ? 'WARN' : 'INFO'}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '700', fontSize: '13px', color: '#0f172a' }}>
                {t.title || (isSuccess ? 'Success' : isWarningOrError ? 'Notice' : 'Information')}
              </div>
              <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px', lineHeight: 1.4 }}>
                {t.message || t.text}
              </div>
            </div>

            <button
              onClick={() => handleDismiss(t.id || idx)}
              style={{
                background: 'none',
                border: '1px solid #cbd5e1',
                color: '#64748b',
                cursor: 'pointer',
                fontSize: '10px',
                fontWeight: '700',
                padding: '2px 6px'
              }}
              aria-label="Close notification"
            >
              Dismiss
            </button>
          </div>
        );
      })}
    </div>
  );
}

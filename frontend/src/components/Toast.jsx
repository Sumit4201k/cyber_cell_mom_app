import React from 'react';

export default function Toast({ toasts, removeToast }) {
  if (!toasts || toasts.length === 0) return null;

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
      {toasts.map((toast) => {
        const toastClass = toast.type === 'success'
          ? 'toast-noticeable-success'
          : toast.type === 'warning'
          ? 'toast-noticeable-warning'
          : 'toast-noticeable-info';

        return (
          <div
            key={toast.id}
            className={toastClass}
            style={{
              borderRadius: '8px',
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              minWidth: '320px',
              maxWidth: '440px',
              fontSize: '13px',
              color: '#0f172a',
              transition: 'all 0.2s ease-in-out'
            }}
          >
            <div style={{
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: toast.type === 'success' ? '#dcfce7' : toast.type === 'warning' ? '#fee2e2' : '#dbeafe',
              color: toast.type === 'success' ? '#16a34a' : toast.type === 'warning' ? '#dc2626' : '#2563eb'
            }}>
              {toast.type === 'success' ? '✓' : toast.type === 'warning' ? '!' : 'i'}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '700', fontSize: '13px', color: '#0f172a' }}>{toast.title || 'System Notification'}</div>
              <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>{toast.message}</div>
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}

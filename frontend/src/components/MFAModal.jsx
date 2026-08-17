import React, { useState } from 'react';
import { fetchApi } from '../api/client';

export default function MFAModal({ isOpen, onClose, activeRole }) {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState(null);

  if (!isOpen) return null;

  const handleVerify = async () => {
    try {
      const data = await fetchApi('/auth/verify-mfa', {
        method: 'POST',
        body: JSON.stringify({ code: code || '123456' })
      }, activeRole);
      setStatus({ success: true, message: data.message });
    } catch (err) {
      setStatus({ success: false, message: err.message });
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div className="cyber-card" style={{ width: '400px', backgroundColor: 'var(--surface-1)' }}>
        <div className="cyber-card-header">
          <div className="cyber-card-title">
            🔑 2FA TOTP Officer Verification
          </div>
          <button onClick={onClose} style={{ background: 'none', color: 'var(--text-muted)', fontSize: '18px' }}>✕</button>
        </div>

        <div style={{ padding: '10px 0', textAlign: 'center' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Enter 6-digit Google Authenticator code for security clearance verification:
          </p>

          <input
            type="text"
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="cyber-input"
            style={{ textAlign: 'center', fontSize: '16px', letterSpacing: '4px', marginBottom: '16px' }}
          />

          <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Demo Hint: Enter demo code <strong>123456</strong>
          </p>

          {status && (
            <div style={{
              marginTop: '14px',
              padding: '8px',
              borderRadius: '4px',
              fontSize: '12px',
              backgroundColor: status.success ? 'var(--state-green-bg)' : 'var(--state-amber-bg)',
              color: status.success ? 'var(--state-green)' : 'var(--state-amber)',
              border: '1px solid var(--border-color)'
            }}>
              {status.message}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
          <button onClick={onClose} className="btn-outline">Close</button>
          <button onClick={handleVerify} className="btn-outline btn-outline-active">Verify 2FA</button>
        </div>
      </div>
    </div>
  );
}

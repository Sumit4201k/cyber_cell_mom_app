import React, { useState } from 'react';
import { fetchApi } from '../api/client';

export default function MFAModal({ isOpen, onClose, activeRole }) {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState(null);

  if (!isOpen) return null;

  const handleVerify = async () => {
    if (!code || !code.trim()) {
      setStatus({ success: false, message: 'Please enter the 6-digit TOTP code from your Authenticator app.' });
      return;
    }
    try {
      const data = await fetchApi('/auth/verify-mfa', {
        method: 'POST',
        body: JSON.stringify({ code: code.trim() })
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
            [AUTH] 2FA TOTP Officer Verification
          </div>
          <button onClick={onClose} className="btn-outline" style={{ padding: '2px 8px', fontSize: '11px' }}>Close</button>
        </div>

        <div style={{ padding: '10px 0', textAlign: 'center' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Enter 6-digit Time-Based One-Time Password (TOTP) from your authenticator device:
          </p>

          <input
            type="text"
            placeholder="000000"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="cyber-input"
            style={{ textAlign: 'center', fontSize: '18px', fontWeight: '800', letterSpacing: '6px', marginBottom: '12px', fontFamily: 'var(--font-mono)' }}
          />

          <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            [RFC 6238 COMPLIANCE] Live 30-Second Rolling Code
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

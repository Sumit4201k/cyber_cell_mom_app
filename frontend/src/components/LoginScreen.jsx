import React, { useState } from 'react';
import { fetchApi } from '../api/client';

export default function LoginScreen({ onLoginSuccess }) {
  const [step, setStep] = useState('credentials'); // 'credentials' | '2fa'
  const [username, setUsername] = useState('admin@cybercell.gov.in');
  const [password, setPassword] = useState('CyberCell@2026');
  const [mfaCode, setMfaCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionToken, setSessionToken] = useState(null);
  const [userData, setUserData] = useState(null);

  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password.trim()) {
      setError('Please enter both Officer ID/Email and Security Passphrase.');
      return;
    }

    setLoading(true);
    try {
      const data = await fetchApi('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim()
        })
      });

      setSessionToken(data.token);
      setUserData(data.user);
      setLoading(false);
      setStep('2fa');
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Authentication failed. Verify credentials.');
    }
  };

  const handle2FASubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!mfaCode.trim()) {
      setError('Please enter the 6-digit TOTP verification code.');
      return;
    }

    setLoading(true);
    try {
      await fetchApi('/auth/verify-mfa', {
        method: 'POST',
        body: JSON.stringify({
          token: sessionToken,
          code: mfaCode.trim()
        })
      }, userData?.role || 'ADMIN');

      localStorage.setItem('cyber_token', sessionToken);
      localStorage.setItem('cyber_user', JSON.stringify(userData));

      setLoading(false);
      if (onLoginSuccess) {
        onLoginSuccess(userData, userData.role);
      }
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Invalid 2FA verification code.');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0f172a',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px',
      color: '#f8fafc',
      fontFamily: 'var(--font-sans)'
    }}>
      {/* Top Police System Banner */}
      <div style={{
        maxWidth: '520px',
        width: '100%',
        marginBottom: '16px',
        textAlign: 'center'
      }}>
        <div style={{
          display: 'inline-block',
          backgroundColor: '#991b1b',
          color: '#ffffff',
          fontFamily: 'var(--font-mono)',
          fontSize: '10.5px',
          fontWeight: '800',
          letterSpacing: '0.12em',
          padding: '4px 10px',
          marginBottom: '10px'
        }}>
          RESTRICTED POLICE NETWORK — AUTHORIZED ACCESS ONLY
        </div>
        <h1 style={{ fontSize: '20px', fontWeight: '800', letterSpacing: '-0.02em', margin: '4px 0' }}>
          State Cyber Cell Management Suite
        </h1>
        <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
          Audio Briefing Ingestion, PII Redaction & SHA-256 Cryptographic MoM Ledger
        </p>
      </div>

      {/* Main Login Card */}
      <div style={{
        maxWidth: '520px',
        width: '100%',
        backgroundColor: 'var(--surface-1)',
        color: 'var(--text-main)',
        border: '2px solid #334155',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
        padding: '28px 32px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          borderBottom: '1.5px solid var(--border-dark)',
          paddingBottom: '14px',
          marginBottom: '20px'
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            backgroundColor: '#0f172a',
            color: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            fontWeight: '800',
            fontFamily: 'var(--font-mono)',
            border: '1px solid #334155'
          }}>
            [SEC]
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
              {step === 'credentials' ? 'Step 1: Officer Clearance Login' : 'Step 2: 2FA TOTP Security Gate'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {step === 'credentials' ? 'Provide badge credentials and role' : 'Enter 6-digit Google Authenticator code'}
            </div>
          </div>
        </div>

        {error && (
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #f87171',
            color: '#991b1b',
            padding: '10px 12px',
            fontSize: '11.5px',
            marginBottom: '16px',
            fontWeight: '600'
          }}>
            [AUTH ERROR] {error}
          </div>
        )}

        {step === 'credentials' ? (
          <form onSubmit={handleCredentialsSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#0f172a', marginBottom: '6px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                Official Email / Username *
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="cyber-input"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#0f172a',
                  border: '1.5px solid #0f172a'
                }}
                placeholder="e.g. admin@cybercell.gov.in"
                required
                autoFocus
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#0f172a', marginBottom: '6px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                Security Passphrase *
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="cyber-input"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '13px',
                  border: '1.5px solid #0f172a'
                }}
                placeholder="••••••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-outline btn-outline-active"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '12px',
                fontWeight: '800',
                justifyContent: 'center',
                backgroundColor: '#0f172a',
                color: '#ffffff',
                border: '1.5px solid #0f172a'
              }}
            >
              {loading ? 'AUTHENTICATING...' : 'PROCEED TO 2FA SECURITY GATE →'}
            </button>
          </form>
        ) : (
          <form onSubmit={handle2FASubmit}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: '800', fontFamily: 'var(--font-mono)', color: '#38bdf8', marginBottom: '8px' }}>
                [2FA SECURE GATEWAY]
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                Enter the 6-digit Time-Based One-Time Password (TOTP) from your authenticator device:
              </p>

              <input
                type="text"
                maxLength={6}
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                className="cyber-input"
                style={{
                  fontSize: '24px',
                  fontWeight: '800',
                  letterSpacing: '8px',
                  textAlign: 'center',
                  fontFamily: 'var(--font-mono)',
                  padding: '8px',
                  width: '200px',
                  margin: '0 auto 10px auto',
                  display: 'block'
                }}
                placeholder="000000"
                autoFocus
              />

              <div style={{
                fontSize: '11px',
                color: '#475569',
                backgroundColor: 'var(--surface-2)',
                padding: '6px 10px',
                border: '1px solid var(--border-color)',
                fontFamily: 'var(--font-mono)'
              }}>
                [2FA POLICY] Strictly verified via RFC 6238 TOTP rolling code.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => { setStep('credentials'); setError(''); }}
                className="btn-outline"
                style={{ flex: 1, padding: '10px', fontSize: '11px', justifyContent: 'center' }}
              >
                Back
              </button>

              <button
                type="submit"
                disabled={loading}
                className="btn-outline btn-outline-active"
                style={{
                  flex: 2,
                  padding: '10px',
                  fontSize: '12px',
                  fontWeight: '800',
                  justifyContent: 'center',
                  backgroundColor: '#15803d',
                  color: '#ffffff',
                  border: '1.5px solid #15803d'
                }}
              >
                {loading ? 'VERIFYING...' : 'VERIFY & ENTER SYSTEM'}
              </button>
            </div>
          </form>
        )}

        <div style={{
          marginTop: '20px',
          paddingTop: '12px',
          borderTop: '1px solid var(--border-color)',
          fontSize: '10px',
          color: 'var(--text-muted)',
          display: 'flex',
          justifyContent: 'space-between',
          fontFamily: 'var(--font-mono)'
        }}>
          <span>OFFICIAL POLICE TERMINAL</span>
          <span>SHA-256 AUDIT LOGGED</span>
        </div>
      </div>
    </div>
  );
}

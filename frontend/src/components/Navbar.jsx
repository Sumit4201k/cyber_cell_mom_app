import React from 'react';

export default function Navbar({ activeRole, setActiveRole, activeTab, setActiveTab, openMfaModal }) {
  return (
    <header>
      <div className="classification-header">
        <div>
          <span className="classification-tag">CONFIDENTIAL — STATE POLICE PROPERTY</span> | TECHNICAL DIVISION
        </div>
        <div style={{ color: 'var(--text-muted)' }}>
          SYSTEM MODE: <strong>AIR-GAPPED LOCALHOST</strong>
        </div>
      </div>

      <nav className="main-navbar">
        <div className="navbar-brand">
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '0px',
            backgroundColor: 'var(--surface-3)',
            border: '1.5px solid var(--border-dark)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            flexShrink: 0
          }}>
            🛡️
          </div>
          <div>
            <h1 className="navbar-title" style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>
              State Cyber Cell — MoM & Action Item Tool
            </h1>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
              Official Police Incident & Meeting Management Suite
            </p>
          </div>
        </div>

        <div className="navbar-controls">
          {/* Tab Navigation */}
          <div className="navbar-tabs">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`btn-outline ${activeTab === 'dashboard' ? 'btn-outline-active' : ''}`}
            >
              📋 Meetings & MoMs
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`btn-outline ${activeTab === 'audit' ? 'btn-outline-active' : ''}`}
            >
              📜 SHA-256 Audit Ledger
            </button>
          </div>

          {/* Demo Role Switcher Dropdown */}
          <div className="navbar-role-section">
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', fontWeight: '700', letterSpacing: '0.05em' }}>
                ROLE SWITCHER
              </span>
              <select
                value={activeRole}
                onChange={(e) => setActiveRole(e.target.value)}
                className="role-select-box"
              >
                <option value="ADMIN">ADMIN (Full Access)</option>
                <option value="INVESTIGATOR">INVESTIGATOR (Full MoM & Audio)</option>
                <option value="ANALYST">ANALYST (Draft Edits)</option>
                <option value="AUDITOR">AUDITOR (Redacted Only)</option>
              </select>
            </div>

            <button
              onClick={openMfaModal}
              className="btn-outline"
              title="2FA Security Verification"
              style={{ whiteSpace: 'nowrap' }}
            >
              🔑 2FA Security
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
}

import React from 'react';

export default function Navbar({ activeRole, setActiveRole, activeTab, setActiveTab, openMfaModal, currentUser, onLogout }) {
  return (
    <header>
      <div className="classification-header">
        <div>
          <span className="classification-tag">CONFIDENTIAL — STATE POLICE PROPERTY</span> | TECHNICAL DIVISION
        </div>
        <div style={{ color: 'var(--text-muted)' }}>
          SYSTEM MODE: <strong>AIR-GAPPED LOCALHOST (2FA SECURED)</strong>
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
            fontSize: '11px',
            fontWeight: '800',
            fontFamily: 'var(--font-mono)',
            flexShrink: 0
          }}>
            [SEC]
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
              Cases & MoMs
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`btn-outline ${activeTab === 'audit' ? 'btn-outline-active' : ''}`}
            >
              SHA-256 Audit Ledger
            </button>
          </div>

          {/* Role Switcher & User Profile */}
          <div className="navbar-role-section">
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', fontWeight: '700', letterSpacing: '0.05em' }}>
                {currentUser?.username || 'OFFICER'} ({currentUser?.badgeId || 'POL-8842'})
              </span>
              <select
                value={activeRole}
                onChange={(e) => setActiveRole(e.target.value)}
                className="role-select-box"
              >
                <option value="ADMIN">L5: ADMIN (DCP Pawar)</option>
                <option value="INVESTIGATOR">L4: INVESTIGATOR (Insp. Shinde)</option>
                <option value="ANALYST">L3: ANALYST (Patil)</option>
                <option value="FIELD_OFFICER">L2: FIELD OFFICER (SI Rao)</option>
                <option value="TRAINEE">L1: TRAINEE (Kamble)</option>
                <option value="AUDITOR">L0: AUDITOR (Deshmukh)</option>
              </select>
            </div>

            <button
              onClick={openMfaModal}
              className="btn-outline"
              title="2FA Security Verification Status"
              style={{ whiteSpace: 'nowrap' }}
            >
              2FA Active
            </button>

            {onLogout && (
              <button
                onClick={onLogout}
                className="btn-outline"
                style={{ color: '#dc2626', borderColor: '#f87171', whiteSpace: 'nowrap' }}
                title="Log out of system"
              >
                Sign Out
              </button>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}

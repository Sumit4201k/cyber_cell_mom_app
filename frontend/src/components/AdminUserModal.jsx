import React, { useState, useEffect } from 'react';
import { fetchApi } from '../api/client';

export default function AdminUserModal({ isOpen, onClose, activeRole, showToast, isPage = false }) {
  const [activeSubTab, setActiveSubTab] = useState('list'); // 'list' | 'create'
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createdResult, setCreatedResult] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    badgeId: '',
    role: 'INVESTIGATOR',
    department: 'Cyber Crime Investigation Cell'
  });

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await fetchApi('/auth/clearance-matrix', {}, activeRole);
      if (data.users) {
        setUsersList(data.users);
      }
    } catch (err) {
      if (showToast) showToast('warning', 'Officer List Fetch Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen || isPage) {
      loadUsers();
      setCreatedResult(null);
      setActiveSubTab('list');
    }
  }, [isOpen, isPage]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'name' && !prev.username) {
        const slug = value.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 15);
        if (slug) {
          updated.username = slug;
          updated.email = `${slug}@cybercell.gov.in`;
        }
      }
      return updated;
    });
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$*';
    let pass = 'Gov@';
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, password: pass }));
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.username || !formData.email || !formData.password || !formData.badgeId) {
      if (showToast) showToast('warning', 'Validation Error', 'All mandatory fields must be completed.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetchApi('/auth/users/create', {
        method: 'POST',
        body: JSON.stringify(formData)
      }, activeRole);

      setCreatedResult(res.officer || res.user);
      if (showToast) showToast('success', 'Officer Account Provisioned', `Account created for ${formData.name} with unique 2FA key.`);
      loadUsers();
      setFormData({
        name: '',
        email: '',
        username: '',
        password: '',
        badgeId: '',
        role: 'INVESTIGATOR',
        department: 'Cyber Crime Investigation Cell'
      });
    } catch (err) {
      if (showToast) showToast('warning', 'Account Creation Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    if (showToast) showToast('info', 'Copied to Clipboard', `${label} copied to clipboard.`);
  };

  if (!isPage && !isOpen) return null;

  const content = (
    <div className={isPage ? "cyber-card" : "modal-box"} style={isPage ? { width: '100%', padding: '0', overflow: 'hidden' } : { maxWidth: '820px', width: '95%' }}>
      {/* Header */}
      <div className={isPage ? "cyber-card-header" : "modal-header"} style={isPage ? { padding: '16px 20px', borderBottom: '2px solid var(--border-dark)', backgroundColor: 'var(--surface-1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } : {}}>
        <div>
          <div className="status-badge" style={{ display: 'inline-block', marginBottom: '4px', backgroundColor: '#0f172a', color: '#38bdf8', border: '1px solid #334155' }}>
            [SECURITY CLEARANCE L5: ADMIN PROVISIONING]
          </div>
          <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.01em' }}>
            Police Personnel Directory & Officer Provisioning
          </h2>
          <p style={{ margin: '2px 0 0 0', fontSize: '11.5px', color: 'var(--text-muted)' }}>
            Configure official credentials, access control clearance levels, and RFC 6238 2FA security keys.
          </p>
        </div>
        {onClose && (
          <button onClick={onClose} className="btn-outline" style={{ padding: '6px 12px', fontSize: '11px', fontWeight: '700' }}>
            {isPage ? '← Return to Incident Files' : '[X] Close'}
          </button>
        )}
      </div>

      {/* Sub tabs */}
      <div style={{ display: 'flex', gap: '8px', padding: '12px 20px', borderBottom: '1.5px solid var(--border-dark)', background: 'var(--surface-2)' }}>
          <button
            onClick={() => { setActiveSubTab('list'); setCreatedResult(null); }}
            className={`btn-outline ${activeSubTab === 'list' && !createdResult ? 'btn-outline-active' : ''}`}
            style={{ fontSize: '11px' }}
          >
            [OFFICER DIRECTORY ({usersList.length})]
          </button>
          <button
            onClick={() => { setActiveSubTab('create'); setCreatedResult(null); }}
            className={`btn-outline ${activeSubTab === 'create' ? 'btn-outline-active' : ''}`}
            style={{ fontSize: '11px' }}
          >
            [+ PROVISION NEW OFFICER]
          </button>
          {createdResult && (
            <button
              onClick={() => setActiveSubTab('result')}
              className={`btn-outline ${activeSubTab === 'result' ? 'btn-outline-active' : ''}`}
              style={{ fontSize: '11px', color: '#16a34a', borderColor: '#16a34a' }}
            >
              [LATEST CREDENTIAL SHEET]
            </button>
          )}
        </div>

        <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto', padding: '16px' }}>
          {/* VIEW: CREATED CREDENTIAL SHEET */}
          {createdResult && activeSubTab !== 'list' && (
            <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', padding: '16px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontWeight: '800', color: '#166534', fontSize: '13px' }}>
                  [OFFICIAL CREDENTIAL SHEET CREATED]
                </span>
                <span className="status-badge" style={{ background: '#dcfce7', color: '#15803d', borderColor: '#86efac' }}>
                  CLEARANCE L{createdResult.clearanceLevel}: {createdResult.role}
                </span>
              </div>
              <p style={{ fontSize: '11px', color: '#14532d', margin: '0 0 12px 0' }}>
                Deliver this official credential slip securely to the officer. The 2FA Secret Key must be imported into an air-gapped TOTP authenticator app.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                <div style={{ background: '#ffffff', padding: '8px', border: '1px solid #bbf7d0' }}>
                  <div style={{ color: '#4b5563', fontSize: '10px' }}>OFFICER NAME:</div>
                  <strong style={{ color: '#111827' }}>{createdResult.name}</strong>
                </div>
                <div style={{ background: '#ffffff', padding: '8px', border: '1px solid #bbf7d0' }}>
                  <div style={{ color: '#4b5563', fontSize: '10px' }}>BADGE ID / UNIT:</div>
                  <strong style={{ color: '#111827' }}>{createdResult.badgeId}</strong>
                </div>
                <div style={{ background: '#ffffff', padding: '8px', border: '1px solid #bbf7d0' }}>
                  <div style={{ color: '#4b5563', fontSize: '10px' }}>OFFICIAL EMAIL:</div>
                  <strong style={{ color: '#111827' }}>{createdResult.email}</strong>
                </div>
                <div style={{ background: '#ffffff', padding: '8px', border: '1px solid #bbf7d0' }}>
                  <div style={{ color: '#4b5563', fontSize: '10px' }}>LOGIN USERNAME:</div>
                  <strong style={{ color: '#111827' }}>{createdResult.username}</strong>
                </div>
                <div style={{ background: '#ffffff', padding: '8px', border: '1px solid #bbf7d0' }}>
                  <div style={{ color: '#4b5563', fontSize: '10px' }}>ASSIGNED PASSWORD:</div>
                  <strong style={{ color: '#dc2626' }}>{createdResult.password}</strong>
                </div>
                <div style={{ background: '#ffffff', padding: '8px', border: '1px solid #bbf7d0' }}>
                  <div style={{ color: '#4b5563', fontSize: '10px' }}>UNIQUE 2FA TOTP SECRET KEY (BASE32):</div>
                  <strong style={{ color: '#0284c7', wordBreak: 'break-all' }}>{createdResult.mfaSecret}</strong>
                  <div style={{ marginTop: '4px' }}>
                    <button
                      onClick={() => copyToClipboard(createdResult.mfaSecret, '2FA Secret Key')}
                      className="btn-outline"
                      style={{ fontSize: '9px', padding: '1px 6px' }}
                    >
                      Copy 2FA Key
                    </button>
                  </div>
                </div>
              </div>

              {createdResult.otpAuthUrl && (
                <div style={{ marginTop: '10px', fontSize: '10px', background: '#ffffff', padding: '6px', border: '1px solid #bbf7d0', wordBreak: 'break-all', fontFamily: 'var(--font-mono)' }}>
                  <span style={{ color: '#4b5563' }}>OTP AUTH URI: </span>{createdResult.otpAuthUrl}
                </div>
              )}
            </div>
          )}

          {/* VIEW: CREATE NEW OFFICER FORM */}
          {activeSubTab === 'create' && (
            <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', marginBottom: '4px' }}>
                    Officer Full Name & Rank *
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="e.g. Inspector Rajesh Sharma"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="cyber-input"
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', marginBottom: '4px' }}>
                    Police Badge ID *
                  </label>
                  <input
                    type="text"
                    name="badgeId"
                    required
                    placeholder="e.g. POL-5521"
                    value={formData.badgeId}
                    onChange={handleInputChange}
                    className="cyber-input"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', marginBottom: '4px' }}>
                    Official Govt Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="e.g. r.sharma@cybercell.gov.in"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="cyber-input"
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', marginBottom: '4px' }}>
                    Login Username *
                  </label>
                  <input
                    type="text"
                    name="username"
                    required
                    placeholder="e.g. rajesh_sharma"
                    value={formData.username}
                    onChange={handleInputChange}
                    className="cyber-input"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '700' }}>
                      Terminal Password *
                    </label>
                    <button
                      type="button"
                      onClick={generateRandomPassword}
                      className="btn-outline"
                      style={{ fontSize: '9px', padding: '1px 5px' }}
                    >
                      Generate Secure
                    </button>
                  </div>
                  <input
                    type="text"
                    name="password"
                    required
                    placeholder="Enter or generate password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="cyber-input"
                    style={{ width: '100%', fontFamily: 'var(--font-mono)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', marginBottom: '4px' }}>
                    Access Clearance Role *
                  </label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="cyber-input"
                    style={{ width: '100%' }}
                  >
                    <option value="ADMIN">L5: ADMIN (Superintendent / DCP Clearance)</option>
                    <option value="INVESTIGATOR">L4: INVESTIGATOR (Case Officer & MoM Sign-off)</option>
                    <option value="ANALYST">L3: ANALYST (Technical Intelligence & Presidio)</option>
                    <option value="FIELD_OFFICER">L2: FIELD OFFICER (Action Item Execution)</option>
                    <option value="TRAINEE">L1: TRAINEE (Read & Draft Assistance)</option>
                    <option value="AUDITOR">L0: AUDITOR (Cryptographic Audit Ledger Read-Only)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', marginBottom: '4px' }}>
                  Assigned Unit / Department
                </label>
                <input
                  type="text"
                  name="department"
                  placeholder="e.g. State Cyber Police Station, Unit 3"
                  value={formData.department}
                  onChange={handleInputChange}
                  className="cyber-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ background: 'var(--surface-3)', border: '1px solid var(--border-dark)', padding: '10px', fontSize: '11px' }}>
                <span style={{ fontWeight: '700' }}>2-Factor Authentication Provisioning Note:</span>
                <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)' }}>
                  A cryptographically unique 160-bit RFC 6238 Base32 2FA key will be auto-generated for this officer and logged to the SHA-256 system audit chain.
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('list')}
                  className="btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-outline btn-outline-active"
                >
                  {loading ? 'Provisioning Account...' : 'Provision Officer & Generate 2FA'}
                </button>
              </div>
            </form>
          )}

          {/* VIEW: OFFICER DIRECTORY LIST */}
          {activeSubTab === 'list' && (
            <div>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '12px' }}>
                  Loading Officer Directory from Database...
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="cyber-table" style={{ width: '100%', minWidth: '600px' }}>
                    <thead>
                      <tr>
                        <th>Officer Name & Badge</th>
                        <th>Govt Email & Username</th>
                        <th>Clearance Role</th>
                        <th>Department</th>
                        <th>2FA Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersList.map((u) => (
                        <tr key={u.id || u.username}>
                          <td>
                            <div style={{ fontWeight: '700', color: 'var(--text-main)' }}>{u.name || u.username}</div>
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                              {u.badgeId || 'POL-8842'}
                            </span>
                          </td>
                          <td>
                            <div style={{ fontSize: '11px', color: 'var(--text-main)' }}>{u.email || `${u.username}@cybercell.gov.in`}</div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>@{u.username}</div>
                          </td>
                          <td>
                            <span className="status-badge" style={{ fontSize: '10px' }}>
                              L{u.clearanceLevel}: {u.role}
                            </span>
                          </td>
                          <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {u.department || 'Cyber Investigation Cell'}
                          </td>
                          <td>
                            <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: '#16a34a', fontWeight: '700' }}>
                              [ACTIVE RFC-6238]
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className={isPage ? "cyber-card-footer" : "modal-footer"} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderTop: '1px solid var(--border-dark)', backgroundColor: 'var(--surface-2)' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            POLICE ACCESS CONTROL LEDGER: <strong>{usersList.length} REGISTERED OFFICERS</strong>
          </span>
          {onClose && (
            <button onClick={onClose} className="btn-outline" style={{ fontSize: '11px' }}>
              {isPage ? '← Return to Incident Files' : 'Close Directory'}
            </button>
          )}
        </div>
      </div>
  );

  if (isPage) {
    return content;
  }

  return (
    <div className="modal-overlay">
      {content}
    </div>
  );
}
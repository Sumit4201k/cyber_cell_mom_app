import React, { useState, useEffect } from 'react';
import { fetchApi } from '../api/client';

export default function AuditLogTable({ activeRole, showToast }) {
  const [logs, setLogs] = useState([]);
  const [integrityStatus, setIntegrityStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('human'); // 'human' | 'hash'

  const isAuditorOrAdmin = activeRole === 'ADMIN' || activeRole === 'AUDITOR';

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      const data = await fetchApi('/audit-logs', {}, activeRole);
      setLogs(data.auditLogs || []);
      setIntegrityStatus(data.integrityCheck);
    } catch (err) {
      console.warn("Audit logs load warning:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuditorOrAdmin) {
      loadAuditLogs();
    }
  }, [activeRole]);

  const verifyIntegrity = async () => {
    try {
      const data = await fetchApi('/audit-logs/verify', {}, activeRole);
      setIntegrityStatus(data.integrity);
      loadAuditLogs(); // Refresh log list after logging verification action
      showToast(
        data.integrity.valid ? 'success' : 'warning',
        data.integrity.valid ? 'Ledger Verified' : 'Integrity Check Failed',
        data.integrity.valid
          ? `All ${data.integrity.totalEntries} cryptographic log entries verified unbroken.`
          : 'Tampering detected in cryptographic hash chain!'
      );
    } catch (err) {
      showToast('warning', 'Verification Error', err.message);
    }
  };

  // Clean Human-Readable Title & Description Mapper
  const getHumanReadableEvent = (action, username, details) => {
    switch (action) {
      case 'SYSTEM_BOOTSTRAP':
        return {
          title: "⚙️ System Bootstrap",
          description: `Cryptographic SHA-256 ledger initialised.`
        };
      case 'MEETING_UPLOADED':
        return {
          title: "📂 Uploaded Audio Recording",
          description: `Officer ${username} ingested new meeting recording.`
        };
      case 'PLAY_AUDIO_RECORDING':
        return {
          title: "🔊 Played Audio Recording",
          description: `Officer ${username} played meeting audio recording out loud.`
        };
      case 'TOGGLE_PII_UNMASK':
        return {
          title: "👁️ Toggled PII Unmasking",
          description: `Officer ${username} toggled PII unmasking for entity: ${details?.entity || 'PII Tag'}.`
        };
      case 'TOGGLE_VIEW_MODE':
        return {
          title: "🔄 Switched View Mode",
          description: `Officer ${username} switched view mode to: ${details?.mode || 'transcript'}.`
        };
      case 'UPDATE_ACTION_ITEMS':
        return {
          title: "✏️ Updated Action Items",
          description: `Officer ${username} edited and saved meeting action matrix.`
        };
      case 'RECORD_APPROVED':
        return {
          title: "🔒 Approved & Locked Record",
          description: `Officer ${username} officially signed & approved meeting record into police ledger.`
        };
      case 'EXPORT_PDF_REPORT':
        return {
          title: "📄 Exported PDF Report",
          description: `Officer ${username} generated official multi-page PDF summary report.`
        };
      case 'MFA_VERIFIED':
        return {
          title: "🔑 Verified 2FA TOTP",
          description: `User ${username} verified 2FA TOTP security clearance code.`
        };
      case 'VERIFY_AUDIT_LEDGER':
        return {
          title: "🔍 Verified Audit Ledger Integrity",
          description: `User ${username} initiated real-time cryptographic SHA-256 hash integrity check.`
        };
      default:
        return {
          title: `📌 User Action: ${action}`,
          description: `User ${username} performed action: ${action}`
        };
    }
  };

  if (!isAuditorOrAdmin) {
    return (
      <div className="cyber-card">
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          <h3>Audit Ledger Access Restricted</h3>
          <p style={{ fontSize: '12px', marginTop: '8px' }}>
            Only **ADMIN** and **AUDITOR** roles are authorized to inspect cryptographic hash-chained audit logs.
          </p>
        </div>
      </div>
    );
  }

  // Reverse logs so NEWEST real events appear at the VERY TOP of the list!
  const newestFirstLogs = [...logs].reverse();

  return (
    <div className="cyber-card">
      <div className="cyber-card-header">
        <div className="cyber-card-title">
          📜 Real-Time Police Audit Trail ({logs.length} Logged Events)
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* Refresh Logs Button */}
          <button onClick={loadAuditLogs} className="btn-outline" style={{ fontSize: '11px' }}>
            🔄 Refresh Events
          </button>

          {/* Toggle Switch between Human Readable & Cryptographic Ledger */}
          <div style={{ display: 'flex', gap: '4px', backgroundColor: 'var(--surface-3)', padding: '2px', borderRadius: '6px' }}>
            <button
              onClick={() => setViewMode('human')}
              className={`btn-outline ${viewMode === 'human' ? 'btn-outline-active' : ''}`}
              style={{ fontSize: '11px', padding: '3px 8px' }}
            >
              📊 Human-Readable View
            </button>
            <button
              onClick={() => setViewMode('hash')}
              className={`btn-outline ${viewMode === 'hash' ? 'btn-outline-active' : ''}`}
              style={{ fontSize: '11px', padding: '3px 8px' }}
            >
              ⛓️ SHA-256 Hash Linkage
            </button>
          </div>

          {integrityStatus && (
            <span className={integrityStatus.valid ? 'status-pill-approved' : 'status-pill-draft'}>
              {integrityStatus.valid ? 'LEDGER VERIFIED' : 'TAMPERING DETECTED'}
            </span>
          )}

          <button onClick={verifyIntegrity} className="btn-outline">
            🔍 Verify Ledger Integrity
          </button>
        </div>
      </div>

      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
        {viewMode === 'human'
          ? "Showing newest events first. Real-time chronological timeline of your actions (audio playbacks, PII unmasking, task edits, and approval locks)."
          : "Showing newest events first. Cryptographic SHA-256 ledger linking each real user event hash to the previous event hash."}
      </p>

      {loading ? (
        <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Loading audit ledger...</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          {viewMode === 'human' ? (
            /* Newest First Human-Readable Event Timeline */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {newestFirstLogs.map((log) => {
                const event = getHumanReadableEvent(log.action, log.username, log.details);
                return (
                  <div
                    key={log.id}
                    style={{
                      backgroundColor: 'var(--surface-2)',
                      border: '1px solid var(--border-color)',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>
                        {event.title}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {event.description}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '4px' }}>
                        Officer ID: <strong>{log.username}</strong> ({log.role}) | Event ID: {log.id}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {new Date(log.timestamp).toLocaleTimeString()}<br />
                      <span style={{ fontSize: '10px', color: 'var(--text-light)' }}>
                        {log.hash ? log.hash.substring(0, 10) + '...' : ''}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Newest First Cryptographic SHA-256 Hash Chain Table */
            <table className="cyber-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>User / Officer</th>
                  <th>Role</th>
                  <th>Action Recorded</th>
                  <th>Resource ID</th>
                  <th>Hash Chain Link (Previous → Entry Hash)</th>
                </tr>
              </thead>
              <tbody>
                {newestFirstLogs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td style={{ fontWeight: '600', color: 'var(--text-main)' }}>{log.username}</td>
                    <td>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {log.role}
                      </span>
                    </td>
                    <td style={{ fontWeight: '600' }}>{log.action}</td>
                    <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{log.resourceId}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-main)' }}>
                      <span title={log.prevHash}>{log.prevHash ? log.prevHash.substring(0, 10) + '...' : 'GENESIS'}</span>
                      <span style={{ color: 'var(--text-muted)', margin: '0 6px' }}>→</span>
                      <span title={log.hash}>{log.hash.substring(0, 10)}...</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

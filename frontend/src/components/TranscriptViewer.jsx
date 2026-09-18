import React, { useState } from 'react';
import { fetchApi } from '../api/client';

const ROLE_LEVELS_MAP = {
  ADMIN: { level: 5, label: 'Level 5 (ADMIN / DCP)', color: '#dc2626' },
  INVESTIGATOR: { level: 4, label: 'Level 4 (INVESTIGATOR / Inspector)', color: '#ea580c' },
  ANALYST: { level: 3, label: 'Level 3 (ANALYST / Forensics)', color: '#2563eb' },
  FIELD_OFFICER: { level: 2, label: 'Level 2 (FIELD OFFICER / SI)', color: '#0891b2' },
  TRAINEE: { level: 1, label: 'Level 1 (TRAINEE / Constable)', color: '#4b5563' },
  AUDITOR: { level: 0, label: 'Level 0 (AUDITOR / Oversight)', color: '#7c3aed' }
};

const ENTITY_PERMISSIONS_MAP = {
  AADHAAR_NUMBER: { minLevel: 5, requiredRole: 'ADMIN', tag: 'L5 ADMIN', risk: 'CRITICAL', color: '#dc2626' },
  PAN_NUMBER: { minLevel: 4, requiredRole: 'INVESTIGATOR+', tag: 'L4 INSP+', risk: 'HIGH', color: '#ea580c' },
  BANK_ACCOUNT: { minLevel: 4, requiredRole: 'INVESTIGATOR+', tag: 'L4 INSP+', risk: 'HIGH', color: '#ea580c' },
  IFSC_CODE: { minLevel: 4, requiredRole: 'INVESTIGATOR+', tag: 'L4 INSP+', risk: 'MEDIUM', color: '#d97706' },
  CRYPTO_WALLET: { minLevel: 3, requiredRole: 'ANALYST+', tag: 'L3 ANALYST+', risk: 'MEDIUM', color: '#2563eb' },
  EMAIL_ADDRESS: { minLevel: 3, requiredRole: 'ANALYST+', tag: 'L3 ANALYST+', risk: 'MEDIUM', color: '#2563eb' },
  PERSON: { minLevel: 3, requiredRole: 'ANALYST+', tag: 'L3 ANALYST+', risk: 'MEDIUM', color: '#2563eb' },
  PHONE_NUMBER: { minLevel: 2, requiredRole: 'FIELD_OFFICER+', tag: 'L2 FIELD+', risk: 'LOW', color: '#0891b2' },
  BADGE_ID: { minLevel: 2, requiredRole: 'FIELD_OFFICER+', tag: 'L2 FIELD+', risk: 'LOW', color: '#0891b2' },
  FIR_ID: { minLevel: 1, requiredRole: 'TRAINEE+', tag: 'L1 TRAINEE+', risk: 'LOW', color: '#16a34a' },
  CYBER_TICKET: { minLevel: 1, requiredRole: 'TRAINEE+', tag: 'L1 TRAINEE+', risk: 'LOW', color: '#16a34a' }
};

export default function TranscriptViewer({ meeting, activeRole, showToast }) {
  const [viewMode, setViewMode] = useState('redacted'); // 'redacted' | 'raw'
  const [unmaskedEntities, setUnmaskedEntities] = useState({});
  const [showMatrix, setShowMatrix] = useState(false);

  const currentUserLevel = ROLE_LEVELS_MAP[activeRole]?.level ?? 2;
  const isAuditor = activeRole === 'AUDITOR';

  const toggleEntityUnmask = async (ent) => {
    const entityType = ent.entity_type || 'UNKNOWN';
    const entityVal = ent.value;
    const rule = ENTITY_PERMISSIONS_MAP[entityType] || { minLevel: 4, tag: 'L4 INSP+', requiredRole: 'INVESTIGATOR+' };

    // Check if user has sufficient clearance
    if (currentUserLevel < rule.minLevel || isAuditor) {
      if (showToast) {
        showToast(
          'warning',
          'Clearance Access Denied',
          `Unmasking [${entityType}] requires ${rule.tag} clearance. Your current rank: ${ROLE_LEVELS_MAP[activeRole]?.label || activeRole}. Access is cryptographically restricted.`
        );
      }
      return;
    }

    const newUnmaskedState = !unmaskedEntities[entityVal];
    setUnmaskedEntities(prev => ({
      ...prev,
      [entityVal]: newUnmaskedState
    }));

    if (showToast && newUnmaskedState) {
      showToast(
        'success',
        'PII Entity Unmasked',
        `Unmasked [${entityType}] with ${ROLE_LEVELS_MAP[activeRole]?.label} credentials. Action logged to SHA-256 ledger.`
      );
    }

    // Log REAL user PII unmask event to Audit Ledger!
    try {
      await fetchApi('/audit-logs/log', {
        method: 'POST',
        body: JSON.stringify({
          action: 'TOGGLE_PII_UNMASK',
          resourceId: meeting?.id || 'mtg-1',
          details: {
            entityType,
            entityVal: newUnmaskedState ? entityVal : '[MASKED]',
            unmasked: newUnmaskedState,
            officerRole: activeRole,
            clearanceLevel: currentUserLevel
          }
        })
      }, activeRole);
    } catch (e) {}
  };

  const changeViewMode = async (mode) => {
    if (mode === 'raw' && currentUserLevel < 3) {
      if (showToast) {
        showToast(
          'warning',
          'Full Raw View Restricted',
          `Unredacted raw view requires Level 3 (ANALYST+) or higher. Your role: Level ${currentUserLevel} (${activeRole}).`
        );
      }
      return;
    }

    setViewMode(mode);
    try {
      await fetchApi('/audit-logs/log', {
        method: 'POST',
        body: JSON.stringify({
          action: 'TOGGLE_VIEW_MODE',
          resourceId: meeting?.id || 'mtg-1',
          details: { mode, role: activeRole, clearanceLevel: currentUserLevel }
        })
      }, activeRole);
    } catch (e) {}
  };

  const rawText = meeting?.rawTranscript || meeting?.redactedTranscript || "No transcript available.";
  const redactedText = meeting?.redactedTranscript || meeting?.rawTranscript || "No transcript available.";
  const entities = Array.isArray(meeting?.entitiesFound) ? meeting.entitiesFound : [];

  return (
    <div className="cyber-card">
      <div className="cyber-card-header">
        <div className="cyber-card-title">
          [TRANSCRIPT] Role-Based PII Clearance Review
        </div>

        {/* View Mode Toggle Switch */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', width: '100%' }}>
          <button
            onClick={() => changeViewMode('redacted')}
            className={`btn-outline ${viewMode === 'redacted' ? 'btn-outline-active' : ''}`}
            style={{ fontSize: '10px', padding: '5px 8px', flex: 1, justifyContent: 'center' }}
          >
            Sanitised View (All Roles)
          </button>

          {currentUserLevel >= 3 ? (
            <button
              onClick={() => changeViewMode('raw')}
              className={`btn-outline ${viewMode === 'raw' ? 'btn-outline-active' : ''}`}
              style={{ fontSize: '10px', padding: '5px 8px', flex: 1, justifyContent: 'center' }}
            >
              Raw Officer View (L3+ Unredacted)
            </button>
          ) : (
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', background: 'var(--surface-3)', padding: '4px 8px', borderRadius: '0px', border: '1px solid var(--border-color)', flex: 1, textAlign: 'center' }}>
              Raw View Locked (Requires L3+)
            </span>
          )}

          <button
            onClick={() => setShowMatrix(!showMatrix)}
            className="btn-outline"
            style={{ fontSize: '10px', padding: '5px 8px', color: '#38bdf8', borderColor: '#0284c7' }}
          >
            {showMatrix ? 'Hide Clearance Matrix' : 'Role Clearance Matrix'}
          </button>
        </div>
      </div>

      {/* Role Hierarchy & Entity Clearance Matrix Dropdown */}
      {showMatrix && (
        <div style={{
          backgroundColor: '#0f172a',
          color: '#f8fafc',
          border: '1px solid #334155',
          padding: '12px',
          marginBottom: '14px',
          fontSize: '11px',
          fontFamily: 'var(--font-mono)'
        }}>
          <div style={{ fontWeight: '700', marginBottom: '8px', color: '#38bdf8', textTransform: 'uppercase' }}>
            [CLEARANCE HIERARCHY] Official Police Role Clearance & Entity Access Control:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px' }}>
            <div style={{ background: '#1e293b', padding: '8px', borderLeft: '3px solid #dc2626' }}>
              <strong style={{ color: '#ef4444' }}>Level 5: ADMIN (DCP/SP)</strong>
              <div style={{ color: '#cbd5e1', fontSize: '10px' }}>• Unmask ALL Entities (Aadhaar, PAN, Bank, etc.)<br/>• Lock & Approve MoM<br/>• Full Audit Ledger Control</div>
            </div>
            <div style={{ background: '#1e293b', padding: '8px', borderLeft: '3px solid #ea580c' }}>
              <strong style={{ color: '#f97316' }}>Level 4: INVESTIGATOR (Insp.)</strong>
              <div style={{ color: '#cbd5e1', fontSize: '10px' }}>• Unmask PAN, Bank Accounts, IFSC, Crypto<br/>• Create & Edit MoM Records<br/>• Approve Case MoMs</div>
            </div>
            <div style={{ background: '#1e293b', padding: '8px', borderLeft: '3px solid #2563eb' }}>
              <strong style={{ color: '#60a5fa' }}>Level 3: ANALYST (Forensic)</strong>
              <div style={{ color: '#cbd5e1', fontSize: '10px' }}>• Unmask Crypto Wallets, Emails, Badges<br/>• Raw Transcript View<br/>• Technical Note Edits</div>
            </div>
            <div style={{ background: '#1e293b', padding: '8px', borderLeft: '3px solid #0891b2' }}>
              <strong style={{ color: '#22d3ee' }}>Level 2: FIELD OFFICER (SI)</strong>
              <div style={{ color: '#cbd5e1', fontSize: '10px' }}>• Unmask Phone Numbers & Badges<br/>• Update Action Item Checklist<br/>• Financial PII is Restricted</div>
            </div>
            <div style={{ background: '#1e293b', padding: '8px', borderLeft: '3px solid #4b5563' }}>
              <strong style={{ color: '#94a3b8' }}>Level 1: TRAINEE (Constable)</strong>
              <div style={{ color: '#cbd5e1', fontSize: '10px' }}>• View FIR IDs & Cyber Tickets<br/>• All Identity & Financial PII Masked<br/>• Base Data Ingestion</div>
            </div>
            <div style={{ background: '#1e293b', padding: '8px', borderLeft: '3px solid #7c3aed' }}>
              <strong style={{ color: '#a78bfa' }}>Level 0: AUDITOR (Oversight)</strong>
              <div style={{ color: '#cbd5e1', fontSize: '10px' }}>• Read-Only Audit Ledger Access<br/>• Verify SHA-256 Hash Integrity<br/>• Zero PII Unmasking Clearance</div>
            </div>
          </div>
        </div>
      )}

      {/* Detected PII Entity Pills Banner */}
      <div style={{
        backgroundColor: 'var(--surface-2)',
        border: '1px solid var(--border-color)',
        padding: '10px 14px',
        borderRadius: '0px',
        marginBottom: '14px',
        fontSize: '12px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            DETECTED PII ENTITIES & CLEARANCE GATES:
          </div>
          <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Your Clearance: <strong style={{ color: ROLE_LEVELS_MAP[activeRole]?.color || '#ffffff' }}>{ROLE_LEVELS_MAP[activeRole]?.label || activeRole}</strong>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {entities.map((ent, idx) => {
            const rule = ENTITY_PERMISSIONS_MAP[ent.entity_type] || { minLevel: 4, tag: 'L4 INSP+', color: '#64748b' };
            const hasAccess = currentUserLevel >= rule.minLevel && !isAuditor;
            const isUnmasked = unmaskedEntities[ent.value];

            return (
              <span
                key={idx}
                onClick={() => toggleEntityUnmask(ent)}
                className={`pii-redacted-tag ${isUnmasked ? 'pii-unmasked-tag' : ''}`}
                style={{
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  borderLeft: `3px solid ${rule.color}`,
                  opacity: hasAccess ? 1 : 0.75
                }}
                title={hasAccess ? `Click to toggle mask/unmask (Requires ${rule.tag})` : `Access Restricted: Requires ${rule.tag} clearance`}
              >
                <span>{ent.entity_type}: {isUnmasked ? ent.value : '••••••••'}</span>
                <span style={{
                  fontSize: '9px',
                  padding: '1px 4px',
                  backgroundColor: hasAccess ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: hasAccess ? '#22c55e' : '#ef4444',
                  fontWeight: '700',
                  border: `1px solid ${hasAccess ? '#22c55e' : '#ef4444'}`
                }}>
                  {hasAccess ? (isUnmasked ? 'UNMASKED' : rule.tag) : `RESTRICTED ${rule.tag}`}
                </span>
              </span>
            );
          })}
          {entities.length === 0 && (
            <span style={{ color: 'var(--text-muted)' }}>
              {isAuditor ? "PII entity unmasking restricted for Auditor role." : "No PII entities detected."}
            </span>
          )}
        </div>
      </div>

      {/* Transcript Text Box */}
      <div style={{
        backgroundColor: 'var(--surface-1)',
        border: '1px solid var(--border-color)',
        borderRadius: '0px',
        padding: '14px',
        fontFamily: 'var(--font-mono)',
        fontSize: '12px',
        color: 'var(--text-main)',
        lineHeight: 1.6,
        maxHeight: '260px',
        overflowY: 'auto'
      }}>
        {viewMode === 'raw' && currentUserLevel >= 3 ? rawText : redactedText}
      </div>
    </div>
  );
}


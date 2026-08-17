import React, { useState } from 'react';
import { fetchApi } from '../api/client';

export default function TranscriptViewer({ meeting, activeRole, showToast }) {
  const [viewMode, setViewMode] = useState('redacted'); // 'redacted' | 'raw'
  const [unmaskedEntities, setUnmaskedEntities] = useState({});

  const isAuditor = activeRole === 'AUDITOR';

  const toggleEntityUnmask = async (entityVal) => {
    if (isAuditor) {
      showToast('warning', 'Clearance Restriction', 'Auditor role is restricted from unmasking PII entities.');
      return;
    }
    
    const newUnmaskedState = !unmaskedEntities[entityVal];
    setUnmaskedEntities(prev => ({
      ...prev,
      [entityVal]: newUnmaskedState
    }));

    // Log REAL user PII unmask event to Audit Ledger!
    try {
      await fetchApi('/audit-logs/log', {
        method: 'POST',
        body: JSON.stringify({
          action: 'TOGGLE_PII_UNMASK',
          resourceId: meeting?.id || 'mtg-1',
          details: { entity: entityVal, unmasked: newUnmaskedState }
        })
      }, activeRole);
    } catch (e) {}
  };

  const changeViewMode = async (mode) => {
    setViewMode(mode);
    try {
      await fetchApi('/audit-logs/log', {
        method: 'POST',
        body: JSON.stringify({
          action: 'TOGGLE_VIEW_MODE',
          resourceId: meeting?.id || 'mtg-1',
          details: { mode }
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
          📄 Transcript & Presidio PII Anonymization Review
        </div>

        {/* View Mode Toggle Switch */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={() => changeViewMode('redacted')}
            className={`btn-outline ${viewMode === 'redacted' ? 'btn-outline-active' : ''}`}
            style={{ fontSize: '11px', padding: '4px 10px' }}
          >
            Sanitised / Auditor View
          </button>

          {!isAuditor ? (
            <button
              onClick={() => changeViewMode('raw')}
              className={`btn-outline ${viewMode === 'raw' ? 'btn-outline-active' : ''}`}
              style={{ fontSize: '11px', padding: '4px 10px' }}
            >
              Raw Officer View (Unredacted)
            </button>
          ) : (
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'var(--surface-3)', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
              Raw View Locked (Auditor)
            </span>
          )}
        </div>
      </div>

      {/* Detected PII Entity Pills Banner (Muted Gray Placeholder Style) */}
      <div style={{
        backgroundColor: 'var(--surface-2)',
        border: '1px solid var(--border-color)',
        padding: '10px 14px',
        borderRadius: '6px',
        marginBottom: '14px',
        fontSize: '12px'
      }}>
        <div style={{ fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px' }}>
          DETECTED PII ENTITIES (Presidio + Police Custom Regex Patterns):
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {entities.map((ent, idx) => {
            const isUnmasked = unmaskedEntities[ent.value];
            return (
              <span
                key={idx}
                onClick={() => toggleEntityUnmask(ent.value)}
                className={`pii-redacted-tag ${isUnmasked ? 'pii-unmasked-tag' : ''}`}
                title="Click to toggle mask/unmask (Logs event to SHA-256 audit chain)"
              >
                [{ent.entity_type}: {isUnmasked ? ent.value : '••••••••'}]
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

      {/* Transcript Text Box: Generous 1.7 line height for reading carefully */}
      <div style={{
        backgroundColor: 'var(--surface-1)',
        border: '1px solid var(--border-color)',
        borderRadius: '6px',
        padding: '18px',
        fontFamily: 'var(--font-mono)',
        fontSize: '13px',
        color: 'var(--text-main)',
        lineHeight: 1.7,
        maxHeight: '280px',
        overflowY: 'auto'
      }}>
        {viewMode === 'raw' && !isAuditor ? rawText : redactedText}
      </div>
    </div>
  );
}

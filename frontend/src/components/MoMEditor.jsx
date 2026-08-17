import React, { useState, useEffect } from 'react';
import { fetchApi } from '../api/client';

export default function MoMEditor({ meeting, activeRole, onSaveActionItems, onApproveMeeting, showToast, onTitleUpdated }) {
  const [actionItems, setActionItems] = useState([]);
  const [isEditingTasks, setIsEditingTasks] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleText, setTitleText] = useState('');

  const isApproved = meeting?.status === 'OFFICIALLY_APPROVED';
  const isAuditor = activeRole === 'AUDITOR';
  const canEdit = !isApproved && !isAuditor;

  useEffect(() => {
    setActionItems(meeting?.action_items || []);
    setTitleText(meeting?.title || '');
    setIsEditingTitle(false);
  }, [meeting]);

  const handleTaskChange = (index, field, val) => {
    const updated = [...actionItems];
    updated[index][field] = val;
    setActionItems(updated);
  };

  const handleAddTask = () => {
    const newTask = {
      id: `act-${Date.now()}`,
      task: 'New Case Investigation Task',
      owner: 'Investigating Officer',
      deadline: new Date().toISOString().split('T')[0],
      status: 'PENDING'
    };
    setActionItems([...actionItems, newTask]);
  };

  const handleRemoveTask = (index) => {
    const updated = actionItems.filter((_, i) => i !== index);
    setActionItems(updated);
  };

  const handleSaveTasks = () => {
    onSaveActionItems(actionItems);
    setIsEditingTasks(false);
  };

  const handleSaveTitle = async () => {
    if (!titleText.trim()) return;
    try {
      const data = await fetchApi(
        `/meetings/${meeting.id}/title`,
        {
          method: 'PATCH',
          body: JSON.stringify({ title: titleText.trim() })
        },
        activeRole
      );
      setIsEditingTitle(false);
      if (showToast) showToast('success', 'Case Title Updated', 'Updated title saved and logged to audit chain.');
      if (onTitleUpdated) onTitleUpdated(data.meeting);
    } catch (err) {
      if (showToast) showToast('warning', 'Title Update Failed', err.message);
    }
  };

  const agendaList = meeting?.agenda || ["SIM Swapping Fraud Attack Vector", "CDR Packet Log Analysis"];
  const decisionsList = meeting?.decisions || ["Issue Section 91 CrPC notice to telecom operator"];

  return (
    <div className="cyber-card">
      <div className="cyber-card-header">
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isEditingTitle ? (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1 }}>
              <input
                type="text"
                value={titleText}
                onChange={(e) => setTitleText(e.target.value)}
                className="cyber-input"
                style={{ fontWeight: '700', fontSize: '14px' }}
              />
              <button onClick={handleSaveTitle} className="btn-outline btn-outline-active" style={{ fontSize: '11px' }}>
                Save Title
              </button>
              <button onClick={() => setIsEditingTitle(false)} className="btn-outline" style={{ fontSize: '11px' }}>
                Cancel
              </button>
            </div>
          ) : (
            <div className="cyber-card-title">
              📝 Minutes of Meeting & Action Items Matrix
              {canEdit && (
                <button
                  onClick={() => setIsEditingTitle(true)}
                  className="btn-outline"
                  style={{ fontSize: '10px', padding: '2px 8px', marginLeft: '6px' }}
                  title="Click to edit case title (Logs event to SHA-256 audit ledger)"
                >
                  ✏️ Edit Case Title
                </button>
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span className={isApproved ? 'status-pill-approved' : 'status-pill-draft'}>
            {isApproved ? 'OFFICIALLY APPROVED' : 'DRAFT_PENDING_REVIEW'}
          </span>

          {canEdit && (
            <button
              onClick={onApproveMeeting}
              className="btn-primary-approve"
            >
              🔒 APPROVE & LOCK RECORD
            </button>
          )}
        </div>
      </div>

      {/* Agenda & Decisions Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
        <div style={{
          backgroundColor: 'var(--surface-2)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '14px'
        }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
            Meeting Agenda Topics
          </div>
          <ul style={{ paddingLeft: '18px', fontSize: '12px', color: 'var(--text-main)' }}>
            {agendaList.map((item, idx) => (
              <li key={idx} style={{ marginBottom: '4px' }}>{item}</li>
            ))}
          </ul>
        </div>

        <div style={{
          backgroundColor: 'var(--surface-2)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '14px'
        }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
            Key Decisions Taken
          </div>
          <ul style={{ paddingLeft: '18px', fontSize: '12px', color: 'var(--text-main)' }}>
            {decisionsList.map((item, idx) => (
              <li key={idx} style={{ marginBottom: '4px' }}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Editable Action Items Matrix Table */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-main)' }}>
            Assigned Action Items & Tasks ({actionItems.length})
          </div>

          {canEdit && (
            <div style={{ display: 'flex', gap: '8px' }}>
              {isEditingTasks ? (
                <>
                  <button onClick={handleAddTask} className="btn-outline" style={{ fontSize: '11px' }}>
                    + Add Task Row
                  </button>
                  <button onClick={handleSaveTasks} className="btn-outline btn-outline-active" style={{ fontSize: '11px' }}>
                    💾 Save Action Items
                  </button>
                </>
              ) : (
                <button onClick={() => setIsEditingTasks(true)} className="btn-outline" style={{ fontSize: '11px' }}>
                  ✏️ Edit Action Items
                </button>
              )}
            </div>
          )}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="cyber-table">
            <thead>
              <tr>
                <th style={{ width: '45%' }}>Action Item / Investigation Task</th>
                <th style={{ width: '30%' }}>Assigned Officer (Owner)</th>
                <th style={{ width: '15%' }}>Target Deadline</th>
                {isEditingTasks && <th style={{ width: '10%' }}>Action</th>}
              </tr>
            </thead>
            <tbody>
              {actionItems.map((item, idx) => (
                <tr key={item.id || idx}>
                  <td>
                    {isEditingTasks ? (
                      <input
                        type="text"
                        value={item.task}
                        onChange={(e) => handleTaskChange(idx, 'task', e.target.value)}
                        className="cyber-input"
                      />
                    ) : (
                      <span style={{ fontWeight: '600' }}>{item.task}</span>
                    )}
                  </td>
                  <td>
                    {isEditingTasks ? (
                      <input
                        type="text"
                        value={item.owner}
                        onChange={(e) => handleTaskChange(idx, 'owner', e.target.value)}
                        className="cyber-input"
                      />
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>{item.owner}</span>
                    )}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                    {isEditingTasks ? (
                      <input
                        type="date"
                        value={item.deadline}
                        onChange={(e) => handleTaskChange(idx, 'deadline', e.target.value)}
                        className="cyber-input"
                      />
                    ) : (
                      item.deadline
                    )}
                  </td>
                  {isEditingTasks && (
                    <td>
                      <button
                        onClick={() => handleRemoveTask(idx)}
                        style={{ background: 'none', color: '#dc2626', fontWeight: 'bold', fontSize: '14px' }}
                      >
                        ✕
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

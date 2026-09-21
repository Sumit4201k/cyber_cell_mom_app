import React, { useState, useEffect } from 'react';
import { fetchApi } from '../api/client';

export default function MoMEditor({ meeting, activeRole, onSaveActionItems, onApproveMeeting, showToast, onTitleUpdated, onMeetingUpdated }) {
  const [actionItems, setActionItems] = useState([]);
  const [agendaList, setAgendaList] = useState([]);
  const [decisionsList, setDecisionsList] = useState([]);
  const [isEditingTasks, setIsEditingTasks] = useState(false);
  const [isEditingAgenda, setIsEditingAgenda] = useState(false);
  const [isEditingDecisions, setIsEditingDecisions] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleText, setTitleText] = useState('');
  const [officersList, setOfficersList] = useState([]);

  const isApproved = meeting?.status === 'OFFICIALLY_APPROVED';
  const isAuditor = activeRole === 'AUDITOR';
  const canApprove = !isApproved && (activeRole === 'ADMIN' || activeRole === 'INVESTIGATOR');
  const canEditTitle = !isApproved && (activeRole === 'ADMIN' || activeRole === 'INVESTIGATOR');
  const canEditTasks = !isApproved && activeRole !== 'AUDITOR';
  const canEditContent = !isApproved && activeRole !== 'AUDITOR';

  useEffect(() => {
    // Load registered officer directory for task assignments
    const fetchOfficers = async () => {
      try {
        const data = await fetchApi('/auth/users', {}, activeRole);
        if (data.users && Array.isArray(data.users)) {
          setOfficersList(data.users);
        }
      } catch (e) {
        // Silently preserve offline usability
      }
    };
    fetchOfficers();
  }, [activeRole]);

  useEffect(() => {
    setActionItems(meeting?.action_items || []);
    setAgendaList(meeting?.agenda || []);
    setDecisionsList(meeting?.decisions || []);
    setTitleText(meeting?.title || '');
    setIsEditingTitle(false);
    setIsEditingAgenda(false);
    setIsEditingDecisions(false);
    setIsEditingTasks(false);
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

  const handleSaveAgenda = async () => {
    try {
      const data = await fetchApi(
        `/meetings/${meeting.id}/agenda`,
        {
          method: 'PATCH',
          body: JSON.stringify({ agenda: agendaList.filter(a => a.trim().length > 0) })
        },
        activeRole
      );
      setIsEditingAgenda(false);
      if (showToast) showToast('success', 'Agenda Updated', 'Meeting agenda topics updated successfully.');
      if (onMeetingUpdated) onMeetingUpdated(data.meeting);
    } catch (err) {
      if (showToast) showToast('warning', 'Agenda Update Failed', err.message);
    }
  };

  const handleSaveDecisions = async () => {
    try {
      const data = await fetchApi(
        `/meetings/${meeting.id}/decisions`,
        {
          method: 'PATCH',
          body: JSON.stringify({ decisions: decisionsList.filter(d => d.trim().length > 0) })
        },
        activeRole
      );
      setIsEditingDecisions(false);
      if (showToast) showToast('success', 'Decisions Updated', 'Formal decisions taken updated successfully.');
      if (onMeetingUpdated) onMeetingUpdated(data.meeting);
    } catch (err) {
      if (showToast) showToast('warning', 'Decisions Update Failed', err.message);
    }
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

  return (
    <div className="cyber-card">
      <div className="cyber-card-header" style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'stretch' }}>
        {/* Top Row: Full-width Card Title & Edit Title Button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', width: '100%' }}>
          {isEditingTitle ? (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%', flexWrap: 'wrap' }}>
              <input
                type="text"
                value={titleText}
                onChange={(e) => setTitleText(e.target.value)}
                className="cyber-input"
                style={{ fontWeight: '700', fontSize: '13px', flex: 1, minWidth: '180px' }}
              />
              <button onClick={handleSaveTitle} className="btn-outline btn-outline-active" style={{ fontSize: '11px' }}>
                Save Title
              </button>
              <button onClick={() => setIsEditingTitle(false)} className="btn-outline" style={{ fontSize: '11px' }}>
                Cancel
              </button>
            </div>
          ) : (
            <div className="cyber-card-title" style={{ fontSize: '13px', width: '100%', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              <span style={{ whiteSpace: 'nowrap' }}>[MOM] Minutes of Meeting & Action Items Matrix</span>
              {canEditTitle && (
                <button
                  onClick={() => setIsEditingTitle(true)}
                  className="btn-outline"
                  style={{ fontSize: '10px', padding: '2px 8px' }}
                  title="Click to edit case title (Logs event to SHA-256 audit ledger)"
                >
                  Edit Title
                </button>
              )}
            </div>
          )}
        </div>

        {/* Bottom Row: Status Badge & Approve Action Button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', width: '100%', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
          <span className={isApproved ? 'status-pill-approved' : 'status-pill-draft'}>
            {isApproved ? 'OFFICIALLY APPROVED' : 'DRAFT_PENDING_REVIEW'}
          </span>

          {canApprove && (
            <button
              onClick={onApproveMeeting}
              className="btn-primary-approve"
            >
              APPROVE & SEAL RECORD
            </button>
          )}
        </div>
      </div>

      {/* Agenda & Decisions Grid */}
      <div className="agenda-decisions-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
        {/* Agenda Section */}
        <div style={{
          backgroundColor: 'var(--surface-2)',
          border: '1px solid var(--border-color)',
          borderRadius: '0px',
          padding: '12px 14px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Meeting Agenda Topics ({agendaList.length})
            </div>
            {canEditContent && (
              <div>
                {isEditingAgenda ? (
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button onClick={() => setAgendaList([...agendaList, 'New Agenda Topic'])} className="btn-outline" style={{ fontSize: '9px', padding: '1px 5px' }}>
                      + Add
                    </button>
                    <button onClick={handleSaveAgenda} className="btn-outline btn-outline-active" style={{ fontSize: '9px', padding: '1px 5px' }}>
                      Save
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setIsEditingAgenda(true)} className="btn-outline" style={{ fontSize: '9px', padding: '1px 5px' }}>
                    Edit
                  </button>
                )}
              </div>
            )}
          </div>

          {isEditingAgenda ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {agendaList.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '4px' }}>
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => {
                      const updated = [...agendaList];
                      updated[idx] = e.target.value;
                      setAgendaList(updated);
                    }}
                    className="cyber-input"
                    style={{ fontSize: '11px', padding: '3px 6px' }}
                  />
                  <button
                    onClick={() => setAgendaList(agendaList.filter((_, i) => i !== idx))}
                    className="btn-outline"
                    style={{ color: '#dc2626', borderColor: '#f87171', fontSize: '10px', padding: '1px 5px' }}
                  >
                    Del
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <ul style={{ paddingLeft: '18px', fontSize: '12px', color: 'var(--text-main)', margin: 0 }}>
              {agendaList.map((item, idx) => (
                <li key={idx} style={{ marginBottom: '4px' }}>{item}</li>
              ))}
            </ul>
          )}
        </div>

        {/* Decisions Section */}
        <div style={{
          backgroundColor: 'var(--surface-2)',
          border: '1px solid var(--border-color)',
          borderRadius: '0px',
          padding: '12px 14px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Key Decisions Taken ({decisionsList.length})
            </div>
            {canEditContent && (
              <div>
                {isEditingDecisions ? (
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button onClick={() => setDecisionsList([...decisionsList, 'New Key Decision'])} className="btn-outline" style={{ fontSize: '9px', padding: '1px 5px' }}>
                      + Add
                    </button>
                    <button onClick={handleSaveDecisions} className="btn-outline btn-outline-active" style={{ fontSize: '9px', padding: '1px 5px' }}>
                      Save
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setIsEditingDecisions(true)} className="btn-outline" style={{ fontSize: '9px', padding: '1px 5px' }}>
                    Edit
                  </button>
                )}
              </div>
            )}
          </div>

          {isEditingDecisions ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {decisionsList.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '4px' }}>
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => {
                      const updated = [...decisionsList];
                      updated[idx] = e.target.value;
                      setDecisionsList(updated);
                    }}
                    className="cyber-input"
                    style={{ fontSize: '11px', padding: '3px 6px' }}
                  />
                  <button
                    onClick={() => setDecisionsList(decisionsList.filter((_, i) => i !== idx))}
                    className="btn-outline"
                    style={{ color: '#dc2626', borderColor: '#f87171', fontSize: '10px', padding: '1px 5px' }}
                  >
                    Del
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <ul style={{ paddingLeft: '18px', fontSize: '12px', color: 'var(--text-main)', margin: 0 }}>
              {decisionsList.map((item, idx) => (
                <li key={idx} style={{ marginBottom: '4px' }}>{item}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Editable Action Items Matrix Table */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ fontWeight: '700', fontSize: '12px', color: 'var(--text-main)' }}>
            Assigned Action Items & Tasks ({actionItems.length})
          </div>

          {canEditTasks && (
            <div style={{ display: 'flex', gap: '6px' }}>
              {isEditingTasks ? (
                <>
                  <button onClick={handleAddTask} className="btn-outline" style={{ fontSize: '10px' }}>
                    + Add Task Row
                  </button>
                  <button onClick={handleSaveTasks} className="btn-outline btn-outline-active" style={{ fontSize: '10px' }}>
                    Save Action Items
                  </button>
                </>
              ) : (
                <button onClick={() => setIsEditingTasks(true)} className="btn-outline" style={{ fontSize: '10px' }}>
                  Edit Action Items
                </button>
              )}
            </div>
          )}
        </div>

        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table className="cyber-table" style={{ minWidth: '450px' }}>
            <thead>
              <tr>
                <th style={{ width: '45%' }}>Action Item / Task</th>
                <th style={{ width: '30%' }}>Assigned Officer (Owner)</th>
                <th style={{ width: '25%' }}>Target Deadline</th>
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
                      <div>
                        {officersList.length > 0 ? (
                          <select
                            value={officersList.some(o => o.name === item.owner) ? item.owner : 'CUSTOM'}
                            onChange={(e) => {
                              if (e.target.value !== 'CUSTOM') {
                                handleTaskChange(idx, 'owner', e.target.value);
                              }
                            }}
                            className="cyber-input"
                            style={{ fontSize: '11px', marginBottom: officersList.some(o => o.name === item.owner) ? '0' : '4px' }}
                          >
                            <option value="" disabled>-- Select Registered Officer --</option>
                            {officersList.map(o => (
                              <option key={o.id || o.username} value={o.name}>
                                {o.name} ({o.badgeId} - {o.role})
                              </option>
                            ))}
                            <option value="CUSTOM">Custom / External Officer...</option>
                          </select>
                        ) : null}

                        {(!officersList.length || !officersList.some(o => o.name === item.owner)) && (
                          <input
                            type="text"
                            value={item.owner}
                            placeholder="Enter officer or agency name"
                            onChange={(e) => handleTaskChange(idx, 'owner', e.target.value)}
                            className="cyber-input"
                            style={{ fontSize: '11px' }}
                          />
                        )}
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-main)', fontWeight: '600', fontSize: '12px' }}>
                        {item.owner}
                      </span>
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
                        className="btn-outline"
                        style={{ color: '#dc2626', borderColor: '#f87171', fontSize: '10px', padding: '1px 5px' }}
                      >
                        Del
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

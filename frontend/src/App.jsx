import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import AudioPlayer from './components/AudioPlayer';
import TranscriptViewer from './components/TranscriptViewer';
import MoMEditor from './components/MoMEditor';
import AuditLogTable from './components/AuditLogTable';
import UploadModal from './components/UploadModal';
import PdfReportModal from './components/PdfReportModal';
import MFAModal from './components/MFAModal';
import Toast from './components/Toast';
import { fetchApi, uploadMeetingAudio } from './api/client';

export default function App() {
  const [meetings, setMeetings] = useState([]);
  const [selectedMeeting, setSelectedMeetingState] = useState(null);
  const [activeRole, setActiveRole] = useState('INVESTIGATOR');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isPdfOpen, setIsPdfOpen] = useState(false);
  const [isMfaOpen, setIsMfaOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [mobileScreen, setMobileScreen] = useState('case_list'); // 'case_list' | 'case_detail'
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  // Editing sidebar case title inline state
  const [editingCardId, setEditingCardId] = useState(null);
  const [editingCardTitle, setEditingCardTitle] = useState('');

  const isMobile = windowWidth <= 868;

  const showToast = (type, title, message) => {
    setToast({ type, title, message });
  };

  const setSelectedMeeting = (meeting) => {
    setSelectedMeetingState(meeting);
    if (meeting) {
      localStorage.setItem('cyber_selected_meeting_id', meeting.id);
    }
  };

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadMeetings = async () => {
    try {
      const data = await fetchApi('/meetings', {}, activeRole);
      if (data.meetings) {
        setMeetings(data.meetings);
        
        // Cache meetings in browser localStorage for offline/mobile resiliency
        try { localStorage.setItem('cyber_meetings_cache', JSON.stringify(data.meetings)); } catch(e){}

        const savedId = localStorage.getItem('cyber_selected_meeting_id');
        const found = data.meetings.find(m => m.id === savedId);
        if (found) {
          setSelectedMeetingState(found);
        } else if (data.meetings.length > 0 && !selectedMeeting) {
          setSelectedMeetingState(data.meetings[0]);
        }
      }
    } catch (err) {
      // Offline fallback: load cached meetings if server fetch fails
      const stored = localStorage.getItem('cyber_meetings_cache');
      if (stored) {
        try {
          const cached = JSON.parse(stored);
          setMeetings(cached);
          if (cached.length > 0 && !selectedMeeting) setSelectedMeetingState(cached[0]);
        } catch(e){}
      }
    }
  };

  useEffect(() => {
    loadMeetings();
  }, [activeRole]);

  const handleUploadComplete = async (formData, useDemoSample = false) => {
    const data = await uploadMeetingAudio(formData, activeRole);
    if (data.meeting) {
      setMeetings(prev => [data.meeting, ...prev]);
      setSelectedMeeting(data.meeting);
      showToast('success', 'Meeting Ingested', 'Audio file processed and MoM draft created successfully.');
      if (isMobile) setMobileScreen('case_detail');
    }
    return data;
  };

  const handleSaveActionItems = async (updatedItems) => {
    if (!selectedMeeting) return;
    try {
      const data = await fetchApi(
        `/meetings/${selectedMeeting.id}/action-items`,
        {
          method: 'PATCH',
          body: JSON.stringify({ action_items: updatedItems })
        },
        activeRole
      );
      if (data.meeting) {
        setSelectedMeeting(data.meeting);
        loadMeetings();
        showToast('info', 'Action Items Saved', 'Meeting action matrix updated.');
      }
    } catch (err) {
      showToast('warning', 'Save Failed', err.message);
    }
  };

  const handleApproveMeeting = async () => {
    if (!selectedMeeting) return;
    try {
      const data = await fetchApi(
        `/meetings/${selectedMeeting.id}/approve`,
        { method: 'POST' },
        activeRole
      );
      if (data.meeting) {
        setSelectedMeeting(data.meeting);
        loadMeetings();
        showToast('success', 'Record Officially Approved', 'MoM file status updated to OFFICIALLY APPROVED and locked.');
      }
    } catch (err) {
      showToast('warning', 'Approval Failed', err.message);
    }
  };

  const startEditCardTitle = (e, meeting) => {
    e.stopPropagation();
    setEditingCardId(meeting.id);
    setEditingCardTitle(meeting.title);
  };

  const saveCardTitleEdit = async (e, mId) => {
    e.stopPropagation();
    if (!editingCardTitle.trim()) return;

    try {
      const data = await fetchApi(
        `/meetings/${mId}/title`,
        {
          method: 'PATCH',
          body: JSON.stringify({ title: editingCardTitle.trim() })
        },
        activeRole
      );

      setEditingCardId(null);
      setMeetings(prev => prev.map(m => m.id === mId ? data.meeting : m));
      if (selectedMeeting?.id === mId) {
        setSelectedMeetingState(data.meeting);
      }
      showToast('success', 'Title Updated', 'Sidebar card title updated and logged to audit ledger.');
    } catch (err) {
      showToast('warning', 'Title Save Error', err.message);
    }
  };

  // Metrics summary
  const totalCases = meetings.length;
  const pendingCases = meetings.filter(m => m.status !== 'OFFICIALLY_APPROVED').length;
  const approvedCases = meetings.filter(m => m.status === 'OFFICIALLY_APPROVED').length;

  return (
    <div style={{ backgroundColor: 'var(--surface-2)', minHeight: '100vh' }}>
      <Navbar
        activeRole={activeRole}
        setActiveRole={setActiveRole}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        openMfaModal={() => setIsMfaOpen(true)}
      />

      <main className="app-container">
        {activeTab === 'dashboard' ? (
          <>
            {/* Top Operational Metrics Bar */}
            <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-icon">📂</div>
                <div>
                  <div className="metric-value">{totalCases}</div>
                  <div className="metric-label">Total Case Records</div>
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-icon">⏳</div>
                <div>
                  <div className="metric-value" style={{ color: 'var(--state-amber)' }}>{pendingCases}</div>
                  <div className="metric-label">Pending Draft Reviews</div>
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-icon">🔒</div>
                <div>
                  <div className="metric-value" style={{ color: 'var(--state-green)' }}>{approvedCases}</div>
                  <div className="metric-label">Approved & Signed Records</div>
                </div>
              </div>
            </div>

            {/* Action Header Bar */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>
                  Police Incident & Meeting Records
                </h2>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                  Active Clearance Level: <strong>{activeRole}</strong>
                </p>
              </div>

              <div className="action-buttons-group" style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setIsPdfOpen(true)} className="btn-outline">
                  Export PDF Summary
                </button>
                {activeRole !== 'AUDITOR' && (
                  <button onClick={() => setIsUploadOpen(true)} className="btn-outline btn-outline-active">
                    Process Meeting Audio
                  </button>
                )}
              </div>
            </div>

            {/* Mobile Back Navigation Bar when viewing Case Document */}
            {isMobile && mobileScreen === 'case_detail' && (
              <div style={{
                backgroundColor: 'var(--surface-1)',
                border: '1.5px solid var(--border-dark)',
                padding: '10px 14px',
                borderRadius: '0px',
                marginBottom: '16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'stretch',
                gap: '6px'
              }}>
                <button
                  onClick={() => setMobileScreen('case_list')}
                  className="btn-outline btn-outline-active"
                  style={{ width: '100%', justifyContent: 'center', fontWeight: '700', padding: '8px' }}
                >
                  ← BACK TO CASE INCIDENT FILES LIST
                </button>

                <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  Viewing Case File: <strong>{selectedMeeting?.id}</strong>
                </div>
              </div>
            )}

            {/* Layout Grid: Desktop Side-by-Side vs Mobile Page Switcher */}
            {(!isMobile || mobileScreen === 'case_list') && (
              <div className={!isMobile ? "dashboard-grid" : ""}>
                
                {/* Left Panel: Incident Master Record List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{
                    fontSize: '11px',
                    fontWeight: '800',
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    paddingBottom: '4px',
                    fontFamily: 'var(--font-mono)'
                  }}>
                    Case Incident Files ({meetings.length})
                  </div>

                  {meetings.map((m) => {
                    const isSelected = selectedMeeting?.id === m.id;
                    const isEditingThis = editingCardId === m.id;

                    return (
                      <div
                        key={m.id}
                        onClick={() => {
                          setSelectedMeeting(m);
                          if (isMobile) setMobileScreen('case_detail');
                        }}
                        className="cyber-card"
                        style={{
                          cursor: 'pointer',
                          marginBottom: 0,
                          backgroundColor: isSelected ? 'var(--surface-1)' : 'var(--surface-1)',
                          borderLeft: isSelected ? '5px solid var(--text-main)' : '1.5px solid var(--border-dark)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                          <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: '700', color: 'var(--text-muted)' }}>
                            {m.id}
                          </span>
                          <span className={m.status === 'OFFICIALLY_APPROVED' ? 'status-pill-approved' : 'status-pill-draft'} style={{ fontSize: '8px' }}>
                            {m.status === 'OFFICIALLY_APPROVED' ? 'APPROVED' : 'DRAFT'}
                          </span>
                        </div>

                        {/* Inline Title Editor vs Static Title Display */}
                        {isEditingThis ? (
                          <div style={{ display: 'flex', gap: '6px', margin: '6px 0' }} onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              value={editingCardTitle}
                              onChange={(e) => setEditingCardTitle(e.target.value)}
                              className="cyber-input"
                              style={{ fontSize: '11px', fontWeight: '700', padding: '3px 6px' }}
                            />
                            <button onClick={(e) => saveCardTitleEdit(e, m.id)} className="btn-outline btn-outline-active" style={{ fontSize: '10px', padding: '2px 6px' }}>
                              Save
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setEditingCardId(null); }} className="btn-outline" style={{ fontSize: '10px', padding: '2px 6px' }}>
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px' }}>
                            <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', lineHeight: 1.3, flex: 1 }}>
                              {m.title}
                            </div>
                            {activeRole !== 'AUDITOR' && m.status !== 'OFFICIALLY_APPROVED' && (
                              <button
                                onClick={(e) => startEditCardTitle(e, m)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', padding: '0 2px' }}
                                title="Edit Title"
                              >
                                ✏️
                              </button>
                            )}
                          </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', marginTop: '8px' }}>
                          <span>📅 {m.date}</span>
                          <span>👮 {m.createdBy}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Right Panel Desktop Document Workbench */}
                {!isMobile && (
                  <div>
                    {selectedMeeting ? (
                      <>
                        <AudioPlayer meeting={selectedMeeting} activeRole={activeRole} showToast={showToast} />
                        <TranscriptViewer meeting={selectedMeeting} activeRole={activeRole} showToast={showToast} />
                        <MoMEditor
                          meeting={selectedMeeting}
                          activeRole={activeRole}
                          onSaveActionItems={handleSaveActionItems}
                          onApproveMeeting={handleApproveMeeting}
                          showToast={showToast}
                          onTitleUpdated={(updated) => {
                            setSelectedMeeting(updated);
                            loadMeetings();
                          }}
                        />
                      </>
                    ) : (
                      <div className="cyber-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Select a police incident file from the left sidebar to view audio and MoM record.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Mobile View: Detailed Case Document Workbench Screen */}
            {isMobile && mobileScreen === 'case_detail' && (
              <div>
                {selectedMeeting ? (
                  <>
                    <AudioPlayer meeting={selectedMeeting} activeRole={activeRole} showToast={showToast} />
                    <TranscriptViewer meeting={selectedMeeting} activeRole={activeRole} showToast={showToast} />
                    <MoMEditor
                      meeting={selectedMeeting}
                      activeRole={activeRole}
                      onSaveActionItems={handleSaveActionItems}
                      onApproveMeeting={handleApproveMeeting}
                      showToast={showToast}
                      onTitleUpdated={(updated) => {
                        setSelectedMeeting(updated);
                        loadMeetings();
                      }}
                    />
                  </>
                ) : (
                  <div className="cyber-card" style={{ padding: '30px', textAlign: 'center' }}>
                    No meeting record selected.
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          /* Cryptographic Audit Ledger View */
          <AuditLogTable activeRole={activeRole} showToast={showToast} />
        )}
      </main>

      {/* Modals & Dialogs */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadComplete={handleUploadComplete}
        activeRole={activeRole}
        showToast={showToast}
      />

      <PdfReportModal
        isOpen={isPdfOpen}
        onClose={() => setIsPdfOpen(false)}
        meeting={selectedMeeting}
        activeRole={activeRole}
      />

      <MFAModal
        isOpen={isMfaOpen}
        onClose={() => setIsMfaOpen(false)}
        activeRole={activeRole}
      />

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

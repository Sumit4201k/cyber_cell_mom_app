import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import UploadModal from './components/UploadModal';
import AudioPlayer from './components/AudioPlayer';
import TranscriptViewer from './components/TranscriptViewer';
import MoMEditor from './components/MoMEditor';
import AuditLogTable from './components/AuditLogTable';
import MFAModal from './components/MFAModal';
import PdfReportModal from './components/PdfReportModal';
import Toast from './components/Toast';
import { fetchApi, uploadMeetingAudio } from './api/client';

export default function App() {
  const [activeRole, setActiveRoleState] = useState(() => {
    return localStorage.getItem('cyber_activeRole') || 'INVESTIGATOR';
  });
  
  const [activeTab, setActiveTabState] = useState(() => {
    return localStorage.getItem('cyber_activeTab') || 'dashboard';
  });

  const [meetings, setMeetings] = useState([]);
  const [selectedMeeting, setSelectedMeetingState] = useState(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isMfaOpen, setIsMfaOpen] = useState(false);
  const [isPdfOpen, setIsPdfOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);

  // Sidebar card inline editing state
  const [editingCardId, setEditingCardId] = useState(null);
  const [editingCardTitle, setEditingCardTitle] = useState('');

  // Mobile Page Viewing View State: 'case_list' (Page 1) vs 'case_detail' (Page 2)
  const [mobileScreen, setMobileScreen] = useState('case_list');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 820);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 820);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const setActiveRole = (role) => {
    setActiveRoleState(role);
    localStorage.setItem('cyber_activeRole', role);
  };

  const setActiveTab = (tab) => {
    setActiveTabState(tab);
    localStorage.setItem('cyber_activeTab', tab);
  };

  const setSelectedMeeting = (meeting) => {
    setSelectedMeetingState(meeting);
    if (meeting?.id) {
      localStorage.setItem('cyber_selectedMeetingId', meeting.id);
    }
    if (isMobile) {
      setMobileScreen('case_detail');
    }
  };

  // Toast helper
  const showToast = (type, title, message) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      removeToast(id);
    }, 3500);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Load meetings on role change
  const loadMeetings = async () => {
    try {
      setLoading(true);
      const data = await fetchApi('/meetings', {}, activeRole);
      const mtgList = data.meetings || [];
      setMeetings(mtgList);

      const savedMtgId = localStorage.getItem('cyber_selectedMeetingId');
      if (savedMtgId) {
        const savedMtg = mtgList.find(m => m.id === savedMtgId);
        if (savedMtg) {
          setSelectedMeetingState(savedMtg);
          setLoading(false);
          return;
        }
      }

      if (mtgList.length > 0 && !selectedMeeting) {
        setSelectedMeetingState(mtgList[0]);
      } else if (mtgList.length > 0 && selectedMeeting) {
        const updated = mtgList.find(m => m.id === selectedMeeting.id);
        if (updated) setSelectedMeetingState(updated);
      }
    } catch (err) {
      console.warn("Failed to fetch meetings:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMeetings();
  }, [activeRole]);

  const handleUploadComplete = async (formData, useDemoSample) => {
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
        showToast('success', 'MoM Officially Approved', 'Signed record written to SHA-256 cryptographic audit chain.');
      }
    } catch (err) {
      showToast('warning', 'Approval Error', err.message);
    }
  };

  const handleTitleUpdated = (updatedMeeting) => {
    setSelectedMeeting(updatedMeeting);
    setMeetings(prev => prev.map(m => m.id === updatedMeeting.id ? updatedMeeting : m));
  };

  // Direct Sidebar Card Title Edit
  const startEditingCardTitle = (e, m) => {
    e.stopPropagation();
    setEditingCardId(m.id);
    setEditingCardTitle(m.title);
  };

  const saveCardTitle = async (e, mId) => {
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

              <div style={{ display: 'flex', gap: '10px' }}>
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
                border: '1px solid var(--border-dark)',
                padding: '10px 14px',
                borderRadius: '8px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <button
                  onClick={() => setMobileScreen('case_list')}
                  className="btn-outline"
                  style={{ fontWeight: '700' }}
                >
                  ← Back to Case Incident Files List
                </button>

                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  Viewing: {selectedMeeting?.id}
                </span>
              </div>
            )}

            {/* Layout Grid: Desktop Side-by-Side vs Mobile Page Switcher */}
            {(!isMobile || mobileScreen === 'case_list') && (
              <div className={!isMobile ? "dashboard-grid" : ""}>
                
                {/* Case Incident Files Explorer */}
                <div className="cyber-card" style={{ padding: '16px' }}>
                  <h3 style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px', fontWeight: '700', letterSpacing: '0.05em' }}>
                    Case Incident Files ({meetings.length})
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: isMobile ? 'none' : '640px', overflowY: 'auto' }}>
                    {meetings.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => setSelectedMeeting(m)}
                        style={{
                          padding: '14px',
                          borderRadius: '8px',
                          backgroundColor: selectedMeeting?.id === m.id ? 'var(--surface-3)' : 'var(--surface-1)',
                          border: selectedMeeting?.id === m.id ? '1.5px solid var(--text-main)' : '1px solid var(--border-color)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-main)', fontFamily: 'var(--font-mono)', fontWeight: '700' }}>
                            {m.id}
                          </span>

                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <span className={m.status === 'OFFICIALLY_APPROVED' ? 'status-pill-approved' : 'status-pill-draft'} style={{ fontSize: '9px' }}>
                              {m.status === 'OFFICIALLY_APPROVED' ? 'APPROVED' : 'DRAFT'}
                            </span>
                            
                            {activeRole !== 'AUDITOR' && (
                              <button
                                onClick={(e) => startEditingCardTitle(e, m)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: 'var(--text-muted)' }}
                                title="Edit Title Directly on Sidebar Card"
                              >
                                Edit ✏️
                              </button>
                            )}
                          </div>
                        </div>

                        {editingCardId === m.id ? (
                          <div style={{ display: 'flex', gap: '6px', margin: '6px 0' }} onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              value={editingCardTitle}
                              onChange={(e) => setEditingCardTitle(e.target.value)}
                              className="cyber-input"
                              style={{ fontSize: '12px', padding: '3px 6px' }}
                            />
                            <button onClick={(e) => saveCardTitle(e, m.id)} className="btn-outline btn-outline-active" style={{ fontSize: '10px', padding: '2px 6px' }}>
                              Save
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setEditingCardId(null); }} className="btn-outline" style={{ fontSize: '10px', padding: '2px 6px' }}>
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '6px', lineHeight: 1.3 }}>
                            {m.title}
                          </div>
                        )}

                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                          <span>📅 {m.date}</span>
                          <span>Officer: {m.createdBy}</span>
                        </div>

                        {isMobile && (
                          <div style={{ marginTop: '10px', textAlign: 'right' }}>
                            <span className="btn-outline" style={{ fontSize: '10px', padding: '2px 8px' }}>
                              Open Case File →
                            </span>
                          </div>
                        )}
                      </div>
                    ))}

                    {meetings.length === 0 && !loading && (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
                        No meeting records ingested yet. Click "Process Meeting Audio" to upload.
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Case Document Reader (Desktop Only) */}
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
                          onTitleUpdated={handleTitleUpdated}
                        />
                      </>
                    ) : (
                      <div className="cyber-card" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                        <h3>Select a Case File or Upload New Audio to Begin</h3>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Mobile Case Document Reader (Mobile Page 2) */}
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
                      onTitleUpdated={handleTitleUpdated}
                    />
                  </>
                ) : (
                  <div className="cyber-card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    <h3>Select a Case File to View Document Details</h3>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <AuditLogTable activeRole={activeRole} showToast={showToast} />
        )}
      </main>

      {/* Modals */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadComplete={handleUploadComplete}
        activeRole={activeRole}
        showToast={showToast}
      />

      <MFAModal
        isOpen={isMfaOpen}
        onClose={() => setIsMfaOpen(false)}
        activeRole={activeRole}
        showToast={showToast}
      />

      <PdfReportModal
        isOpen={isPdfOpen}
        onClose={() => setIsPdfOpen(false)}
        meeting={selectedMeeting}
        activeRole={activeRole}
        showToast={showToast}
      />

      {/* In-App Toast Container */}
      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  );
}

import React, { useState, useEffect, useMemo } from 'react';
import Navbar from './components/Navbar';
import AudioPlayer from './components/AudioPlayer';
import TranscriptViewer from './components/TranscriptViewer';
import MoMEditor from './components/MoMEditor';
import AuditLogTable from './components/AuditLogTable';
import UploadModal from './components/UploadModal';
import PdfReportModal from './components/PdfReportModal';
import MFAModal from './components/MFAModal';
import AdminUserModal from './components/AdminUserModal';
import LoginScreen from './components/LoginScreen';
import Toast from './components/Toast';
import { fetchApi, uploadMeetingAudio } from './api/client';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [meetings, setMeetings] = useState([]);
  const [selectedMeeting, setSelectedMeetingState] = useState(null);
  const [activeRole, setActiveRole] = useState('INVESTIGATOR');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isPdfOpen, setIsPdfOpen] = useState(false);
  const [isMfaOpen, setIsMfaOpen] = useState(false);
  const [isPersonnelOpen, setIsPersonnelOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [mobileScreen, setMobileScreen] = useState('case_list'); // 'case_list' | 'case_detail'
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  // Editing sidebar case title inline state
  const [editingCardId, setEditingCardId] = useState(null);
  const [editingCardTitle, setEditingCardTitle] = useState('');

  // Sidebar List Filter & Search
  const [caseSearchTerm, setCaseSearchTerm] = useState('');
  const [caseStatusFilter, setCaseStatusFilter] = useState('ALL'); // 'ALL' | 'DRAFT' | 'APPROVED'

  const filteredMeetings = useMemo(() => {
    return meetings.filter((m) => {
      const q = caseSearchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (m.id && m.id.toLowerCase().includes(q)) ||
        (m.title && m.title.toLowerCase().includes(q)) ||
        (m.createdBy && m.createdBy.toLowerCase().includes(q)) ||
        (m.case_reference && m.case_reference.toLowerCase().includes(q));

      const matchesStatus =
        caseStatusFilter === 'ALL' ||
        (caseStatusFilter === 'APPROVED' && m.status === 'OFFICIALLY_APPROVED') ||
        (caseStatusFilter === 'DRAFT' && m.status !== 'OFFICIALLY_APPROVED');

      return matchesSearch && matchesStatus;
    });
  }, [meetings, caseSearchTerm, caseStatusFilter]);

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
    // Check existing authenticated session
    const token = localStorage.getItem('cyber_token');
    const storedUser = localStorage.getItem('cyber_user');
    if (token && storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setCurrentUser(parsed);
        setActiveRole(parsed.role || 'INVESTIGATOR');
        setIsAuthenticated(true);
      } catch (e) {
        setIsAuthenticated(false);
      }
    }

    // Purge any stale client-side cache from previous sessions
    try {
      localStorage.removeItem('cyber_meetings_cache');
    } catch (e) {}

    // Handle token or session expiration: automatically return to login screen
    const handleSessionExpired = (e) => {
      setIsAuthenticated(false);
      setCurrentUser(null);
      setMeetings([]);
      setSelectedMeetingState(null);
      const msg = e.detail?.message || 'Your session has expired. Please sign in with your officer credentials.';
      showToast('warning', 'Session Expired', msg);
    };

    window.addEventListener('cyber_session_expired', handleSessionExpired);
    return () => window.removeEventListener('cyber_session_expired', handleSessionExpired);
  }, []);

  const handleLoginSuccess = (user, role) => {
    setCurrentUser(user);
    setActiveRole(role);
    setIsAuthenticated(true);
    showToast('success', 'Clearance Verified', `Welcome Officer ${user?.username || 'Officer'}. 2FA Authenticated.`);
  };

  const handleLogout = () => {
    localStorage.removeItem('cyber_token');
    localStorage.removeItem('cyber_user');
    localStorage.removeItem('cyber_selected_meeting_id');
    localStorage.removeItem('cyber_meetings_cache');
    setIsAuthenticated(false);
    setCurrentUser(null);
    setMeetings([]);
    setSelectedMeetingState(null);
    showToast('info', 'Signed Out', 'You have been securely signed out of the police terminal.');
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

        if (data.meetings.length === 0) {
          setSelectedMeetingState(null);
          localStorage.removeItem('cyber_selected_meeting_id');
        } else {
          const savedId = localStorage.getItem('cyber_selected_meeting_id');
          const found = data.meetings.find(m => m.id === savedId);
          if (found) {
            setSelectedMeetingState(found);
          } else {
            setSelectedMeetingState(data.meetings[0]);
          }
        }
      }
    } catch (err) {
      showToast('warning', 'Server Connection Error', `Failed to fetch case files from server: ${err.message}`);
      setMeetings([]);
      setSelectedMeetingState(null);
    }
  };

  useEffect(() => {
    loadMeetings();
  }, [activeRole]);

  const handleUploadComplete = async (formData) => {
    try {
      const data = await uploadMeetingAudio(formData, activeRole);
      if (data.meeting) {
        setMeetings(prev => [data.meeting, ...prev]);
        setSelectedMeeting(data.meeting);
        showToast('success', 'Meeting Ingested', 'Audio file processed and MoM draft created successfully.');
        if (isMobile) setMobileScreen('case_detail');
      }
      return data;
    } catch (err) {
      showToast('warning', 'Upload Processing Failed', err.message);
      throw err;
    }
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
        setMeetings(prev => prev.map(m => m.id === data.meeting.id ? data.meeting : m));
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
        setMeetings(prev => prev.map(m => m.id === data.meeting.id ? data.meeting : m));
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

  if (!isAuthenticated) {
    return (
      <>
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
        <Toast toast={toast} onClose={() => setToast(null)} />
      </>
    );
  }

  return (
    <div style={{ backgroundColor: 'var(--surface-2)', minHeight: '100vh' }}>
      <Navbar
        activeRole={activeRole}
        setActiveRole={setActiveRole}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        openMfaModal={() => setIsMfaOpen(true)}
        openAdminModal={() => setActiveTab('officers')}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      <main className="app-container">
        {activeTab === 'dashboard' ? (
          <>
            {/* Top Operational Metrics Bar */}
            <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-icon" style={{ fontSize: '11px', fontWeight: '800', fontFamily: 'var(--font-mono)' }}>[REC]</div>
                <div>
                  <div className="metric-value">{totalCases}</div>
                  <div className="metric-label">Total Case Records</div>
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-icon" style={{ fontSize: '11px', fontWeight: '800', fontFamily: 'var(--font-mono)', color: 'var(--state-amber)' }}>[PEND]</div>
                <div>
                  <div className="metric-value" style={{ color: 'var(--state-amber)' }}>{pendingCases}</div>
                  <div className="metric-label">Pending Draft Reviews</div>
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-icon" style={{ fontSize: '11px', fontWeight: '800', fontFamily: 'var(--font-mono)', color: 'var(--state-green)' }}>[SEAL]</div>
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
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  backgroundColor: 'var(--surface-1)',
                  border: '1.5px solid var(--border-dark)',
                  height: !isMobile ? 'calc(100vh - 170px)' : 'auto',
                  maxHeight: !isMobile ? 'calc(100vh - 170px)' : 'none',
                  position: !isMobile ? 'sticky' : 'static',
                  top: '16px'
                }}>
                  {/* List Header, Filter Tabs & Search Bar */}
                  <div style={{
                    padding: '10px 12px',
                    borderBottom: '1.5px solid var(--border-dark)',
                    backgroundColor: 'var(--surface-3)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div style={{
                        fontSize: '11px',
                        fontWeight: '800',
                        color: 'var(--text-main)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        fontFamily: 'var(--font-mono)'
                      }}>
                        Cases ({filteredMeetings.length}/{meetings.length})
                      </div>

                      {/* Status Filter Buttons */}
                      <div style={{ display: 'flex', gap: '3px' }}>
                        {['ALL', 'DRAFT', 'APPROVED'].map((st) => (
                          <button
                            key={st}
                            onClick={() => setCaseStatusFilter(st)}
                            style={{
                              fontSize: '9px',
                              fontWeight: '700',
                              padding: '2px 6px',
                              fontFamily: 'var(--font-mono)',
                              border: caseStatusFilter === st ? '1px solid var(--text-main)' : '1px solid var(--border-dark)',
                              backgroundColor: caseStatusFilter === st ? 'var(--text-main)' : 'var(--surface-1)',
                              color: caseStatusFilter === st ? '#ffffff' : 'var(--text-muted)',
                              cursor: 'pointer'
                            }}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Quick Search Bar */}
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        placeholder="Search ID, title, officer..."
                        value={caseSearchTerm}
                        onChange={(e) => setCaseSearchTerm(e.target.value)}
                        className="cyber-input"
                        style={{
                          width: '100%',
                          fontSize: '11px',
                          padding: '5px 8px',
                          backgroundColor: 'var(--surface-1)',
                          border: '1px solid var(--border-dark)',
                          boxSizing: 'border-box'
                        }}
                      />
                      {caseSearchTerm && (
                        <button
                          onClick={() => setCaseSearchTerm('')}
                          style={{
                            position: 'absolute',
                            right: '6px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            fontSize: '10px',
                            fontWeight: '700'
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Scrollable List Items Container */}
                  <div style={{
                    overflowY: 'auto',
                    flex: 1,
                    padding: '6px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    {filteredMeetings.length === 0 ? (
                      <div style={{
                        padding: '24px 12px',
                        textAlign: 'center',
                        color: 'var(--text-muted)',
                        fontSize: '11px',
                        fontFamily: 'var(--font-mono)'
                      }}>
                        No matching incident files found.
                      </div>
                    ) : (
                      filteredMeetings.map((m) => {
                        const isSelected = selectedMeeting?.id === m.id;
                        const isEditingThis = editingCardId === m.id;

                        return (
                          <div
                            key={m.id}
                            onClick={() => {
                              setSelectedMeeting(m);
                              if (isMobile) setMobileScreen('case_detail');
                            }}
                            style={{
                              cursor: 'pointer',
                              padding: '8px 10px',
                              backgroundColor: isSelected ? 'var(--surface-3)' : 'var(--surface-1)',
                              border: '1px solid var(--border-dark)',
                              borderLeft: isSelected ? '4px solid var(--text-main)' : '1px solid var(--border-dark)',
                              transition: 'background-color 0.15s ease',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '10.5px', fontFamily: 'var(--font-mono)', fontWeight: '800', color: isSelected ? 'var(--text-main)' : 'var(--text-muted)' }}>
                                {m.id}
                              </span>
                              <span
                                className={m.status === 'OFFICIALLY_APPROVED' ? 'status-pill-approved' : 'status-pill-draft'}
                                style={{ fontSize: '7.5px', padding: '1px 5px' }}
                              >
                                {m.status === 'OFFICIALLY_APPROVED' ? 'APPROVED' : 'DRAFT'}
                              </span>
                            </div>

                            {/* Inline Title Editor vs Compact Title */}
                            {isEditingThis ? (
                              <div style={{ display: 'flex', gap: '4px', margin: '3px 0' }} onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="text"
                                  value={editingCardTitle}
                                  onChange={(e) => setEditingCardTitle(e.target.value)}
                                  className="cyber-input"
                                  style={{ fontSize: '10.5px', fontWeight: '700', padding: '2px 4px', flex: 1 }}
                                />
                                <button onClick={(e) => saveCardTitleEdit(e, m.id)} className="btn-outline btn-outline-active" style={{ fontSize: '9px', padding: '1px 5px' }}>
                                  Save
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); setEditingCardId(null); }} className="btn-outline" style={{ fontSize: '9px', padding: '1px 5px' }}>
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '4px' }}>
                                <div style={{
                                  fontSize: '11.5px',
                                  fontWeight: '700',
                                  color: 'var(--text-main)',
                                  lineHeight: 1.25,
                                  flex: 1,
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden'
                                }}>
                                  {m.title}
                                </div>
                                {(activeRole === 'ADMIN' || activeRole === 'INVESTIGATOR') && m.status !== 'OFFICIALLY_APPROVED' && (
                                  <button
                                    onClick={(e) => startEditCardTitle(e, m)}
                                    style={{
                                      background: 'none',
                                      border: '1px solid var(--border-color)',
                                      color: 'var(--text-muted)',
                                      cursor: 'pointer',
                                      fontSize: '9px',
                                      padding: '1px 4px',
                                      flexShrink: 0
                                    }}
                                    title="Edit Title"
                                  >
                                    Edit
                                  </button>
                                )}
                              </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9.5px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                              <span>{m.date}</span>
                              <span>OFFICER: {m.createdBy}</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
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
                          onMeetingUpdated={(updated) => {
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
                      onMeetingUpdated={(updated) => {
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
        ) : activeTab === 'audit' ? (
          /* Cryptographic Audit Ledger View */
          <AuditLogTable activeRole={activeRole} showToast={showToast} />
        ) : (
          /* Officer Directory & RBAC Provisioning Portal View */
          <AdminUserModal
            isPage={true}
            onClose={() => setActiveTab('dashboard')}
            activeRole={activeRole}
            showToast={showToast}
          />
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

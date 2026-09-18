import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[State Cyber Cell] Unhandled React Runtime Error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    try {
      localStorage.removeItem('cyber_selected_meeting_id');
    } catch (e) {}
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  handleClearCache = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {}
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#050a12',
          color: '#e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            maxWidth: '640px',
            width: '100%',
            backgroundColor: '#0c1524',
            border: '2px solid #ef4444',
            padding: '28px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <span style={{ fontSize: '14px', fontWeight: '800', color: '#ef4444', border: '1.5px solid #ef4444', padding: '4px 8px', fontFamily: 'monospace' }}>[ERROR]</span>
              <div>
                <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#ef4444', letterSpacing: '0.05em' }}>
                  STATE CYBER CELL — COMPONENT ERROR RECOVERY
                </h1>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94a3b8' }}>
                  An unexpected UI rendering boundary exception was intercepted.
                </p>
              </div>
            </div>

            <div style={{
              backgroundColor: '#050a12',
              border: '1px solid #1e293b',
              padding: '12px',
              fontSize: '12px',
              fontFamily: 'monospace',
              color: '#f87171',
              marginBottom: '20px',
              maxHeight: '140px',
              overflowY: 'auto'
            }}>
              {this.state.error?.toString() || "Unknown Component Exception"}
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                onClick={this.handleReset}
                style={{
                  backgroundColor: '#0284c7',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 18px',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Reload Application
              </button>
              <button
                onClick={this.handleClearCache}
                style={{
                  backgroundColor: 'transparent',
                  color: '#94a3b8',
                  border: '1px solid #334155',
                  padding: '10px 18px',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Clear Offline Cache & Reset
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

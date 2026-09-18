import React, { useState, useRef } from 'react';

export default function UploadModal({ isOpen, onClose, onUploadComplete, activeRole, showToast }) {
  const [file, setFile] = useState(null);
  const [customTitle, setCustomTitle] = useState('');
  const [customOfficer, setCustomOfficer] = useState('');
  const [manualTranscript, setManualTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const mediaStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recognitionRef = useRef(null);
  const timerIntervalRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    setErrorMessage('');
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
    }
  };

  const startMicrophoneRecording = async () => {
    setErrorMessage('');
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setErrorMessage('Microphone recording requires a modern browser with mediaDevices support.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const options = MediaRecorder.isTypeSupported('audio/webm')
        ? { mimeType: 'audio/webm' }
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? { mimeType: 'audio/mp4' }
        : {};

      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      setLiveTranscript('');
      setRecordingSeconds(0);

      // Start recording timer
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);

      // SpeechRecognition for real-time live preview if supported
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = 'en-US';

          recognition.onresult = (event) => {
            let fullSpeech = '';
            for (let i = 0; i < event.results.length; i++) {
              fullSpeech += event.results[i][0].transcript + ' ';
            }
            setLiveTranscript(fullSpeech.trim());
          };

          recognition.onerror = () => {};
          recognition.start();
          recognitionRef.current = recognition;
        } catch (e) {
          console.warn('SpeechRecognition initialization error:', e);
        }
      }

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const mimeType = recorder.mimeType || 'audio/webm';
        const ext = mimeType.includes('mp4') ? '.m4a' : mimeType.includes('wav') ? '.wav' : '.webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const recordedFile = new File([audioBlob], `live_recorded_meeting_${Date.now()}${ext}`, { type: mimeType });
        recordedFile.audioUrl = URL.createObjectURL(audioBlob);
        setFile(recordedFile);

        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((track) => track.stop());
          mediaStreamRef.current = null;
        }
      };

      recorder.start(250);
      setIsRecording(true);
      if (showToast) showToast('info', 'Microphone Active', 'Recording live audio stream from microphone...');
    } catch (err) {
      setErrorMessage('Microphone access error: ' + err.message);
    }
  };

  const stopMicrophoneRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      setIsRecording(false);

      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }

      if (showToast) showToast('success', 'Recording Complete', 'Audio recording captured and ready for processing.');
    }
  };

  const handleProcessAudio = async () => {
    setErrorMessage('');
    if (!file && !manualTranscript.trim()) {
      setErrorMessage('Please select an audio file, record live via microphone, or enter transcript text.');
      return;
    }

    if (isRecording) {
      stopMicrophoneRecording();
    }

    setIsProcessing(true);
    setProgress(20);
    setStatusMessage('Preparing and uploading audio stream to backend...');

    try {
      const formData = new FormData();

      if (file) {
        formData.append('audio', file, file.name);
        if (file.audioUrl) {
          formData.append('audioUrl', file.audioUrl);
        }
      }

      if (manualTranscript.trim()) {
        formData.append('customTranscript', manualTranscript.trim());
      } else if (liveTranscript.trim()) {
        formData.append('customTranscript', liveTranscript.trim());
      }

      if (customTitle.trim()) {
        formData.append('title', customTitle.trim());
      }

      if (customOfficer.trim()) {
        formData.append('createdBy', customOfficer.trim());
      }

      const p1 = setTimeout(() => {
        setProgress(50);
        setStatusMessage('Transcribing audio via offline faster-whisper INT8 CPU engine...');
      }, 400);

      const p2 = setTimeout(() => {
        setProgress(75);
        setStatusMessage('Anonymizing sensitive PII via Presidio & Indian Cyber patterns...');
      }, 900);

      const p3 = setTimeout(() => {
        setProgress(90);
        setStatusMessage('Synthesizing structured Minutes of Meeting JSON matrix...');
      }, 1400);

      const response = await onUploadComplete(formData);

      clearTimeout(p1);
      clearTimeout(p2);
      clearTimeout(p3);

      if (response?.meeting && file && file.audioUrl) {
        response.meeting.audioUrl = file.audioUrl;
      }

      setProgress(100);
      setStatusMessage('Processing Complete');

      setTimeout(() => {
        setIsProcessing(false);
        setFile(null);
        setCustomTitle('');
        setCustomOfficer('');
        setManualTranscript('');
        setLiveTranscript('');
        onClose();
      }, 400);
    } catch (err) {
      setIsProcessing(false);
      setProgress(0);
      setStatusMessage('');
      const errText = err.message || 'Audio processing failed.';
      setErrorMessage(errText);
      if (showToast) showToast('warning', 'Processing Error', errText);
    }
  };

  const formatSecs = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="cyber-modal-overlay">
      <div className="cyber-card cyber-modal-dialog">
        <div className="cyber-card-header">
          <div className="cyber-card-title">
            [INGEST] Audio Recording & Case Briefing
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="btn-outline"
            style={{ fontSize: '11px', padding: '2px 8px', cursor: 'pointer' }}
          >
            Close
          </button>
        </div>

        <div style={{ padding: '6px 0' }}>
          {/* Metadata Override Fields */}
          <div className="modal-input-grid">
            <div>
              <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                CASE TITLE / FIR # (OPTIONAL)
              </label>
              <input
                type="text"
                placeholder="Auto-extracted by AI if blank"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="cyber-input"
                disabled={isProcessing}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                INVESTIGATING OFFICER (OPTIONAL)
              </label>
              <input
                type="text"
                placeholder="e.g. Inspector Deshmukh (POL-8842)"
                value={customOfficer}
                onChange={(e) => setCustomOfficer(e.target.value)}
                className="cyber-input"
                disabled={isProcessing}
              />
            </div>
          </div>

          {/* File Upload Box */}
          <div style={{
            border: file ? '2px solid var(--state-green)' : '2px dashed var(--border-dark)',
            borderRadius: '0px',
            padding: '16px',
            textAlign: 'center',
            backgroundColor: 'var(--surface-2)',
            marginBottom: '12px'
          }}>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
              Upload real police audio file (<code>.wav</code>, <code>.mp3</code>, <code>.m4a</code>, <code>.webm</code>, <code>.flac</code>):
            </p>

            <input
              type="file"
              accept="audio/*,.wav,.mp3,.m4a,.webm,.ogg,.flac"
              onChange={handleFileChange}
              style={{ display: 'none' }}
              id="file-input"
              disabled={isProcessing || isRecording}
            />
            <label
              htmlFor="file-input"
              className="btn-outline"
              style={{ cursor: isProcessing || isRecording ? 'not-allowed' : 'pointer', display: 'inline-block' }}
            >
              Select Local Audio File
            </label>

            {file && (
              <div style={{ marginTop: '10px', color: 'var(--state-green)', fontSize: '12px', fontWeight: '600' }}>
                Selected: {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
              </div>
            )}
          </div>

          {/* Live Mic Recording Option */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              {!isRecording ? (
                <button
                  type="button"
                  onClick={startMicrophoneRecording}
                  className="btn-outline"
                  style={{ flex: 1 }}
                  disabled={isProcessing}
                >
                  Start Live Mic Recording
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopMicrophoneRecording}
                  className="btn-outline btn-outline-active"
                  style={{ flex: 1, borderColor: 'var(--state-amber)', color: 'var(--state-amber)' }}
                >
                  Stop Recording ({formatSecs(recordingSeconds)})
                </button>
              )}
            </div>
          </div>

          {/* Live Speech Recognition Transcript Box if active */}
          {liveTranscript && (
            <div style={{
              backgroundColor: 'var(--surface-2)',
              border: '1.5px solid var(--border-dark)',
              padding: '10px 14px',
              fontSize: '11px',
              marginBottom: '12px',
              color: 'var(--text-main)',
              maxHeight: '80px',
              overflowY: 'auto',
              fontFamily: 'var(--font-mono)'
            }}>
              <div style={{ fontWeight: '700', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '2px', textTransform: 'uppercase' }}>
                Live Microphone Transcription:
              </div>
              "{liveTranscript}"
            </div>
          )}

          {/* Direct Text Transcript Input Option */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              OR DIRECT BRIEFING TRANSCRIPT (OPTIONAL / TEXT INPUT):
            </label>
            <textarea
              rows={3}
              placeholder="Paste or type meeting dialogue directly to process PII redaction and MoM extraction without audio file..."
              value={manualTranscript}
              onChange={(e) => {
                setManualTranscript(e.target.value);
                setErrorMessage('');
              }}
              className="cyber-input"
              style={{ width: '100%', resize: 'vertical', fontSize: '11px', fontFamily: 'var(--font-mono)' }}
              disabled={isProcessing}
            />
          </div>

          {/* Error Message Banner */}
          {errorMessage && (
            <div style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1.5px solid #ef4444',
              color: '#ef4444',
              padding: '10px 14px',
              fontSize: '12px',
              fontWeight: '600',
              marginBottom: '12px'
            }}>
              [ERROR] {errorMessage}
            </div>
          )}

          {/* Progress Bar */}
          {isProcessing && (
            <div style={{ marginTop: '12px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                <span>{statusMessage}</span>
                <span>{progress}%</span>
              </div>
              <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--surface-3)', overflow: 'hidden' }}>
                <div style={{ width: `${progress}%`, height: '100%', backgroundColor: 'var(--state-green)', transition: 'width 0.3s' }}></div>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
          <button onClick={onClose} className="btn-outline" disabled={isProcessing}>
            Cancel
          </button>
          <button
            onClick={handleProcessAudio}
            className="btn-outline btn-outline-active"
            disabled={isProcessing || (!file && !manualTranscript.trim() && !isRecording)}
          >
            {isProcessing ? 'Processing with AI...' : 'Process with AI Engine'}
          </button>
        </div>
      </div>
    </div>
  );
}

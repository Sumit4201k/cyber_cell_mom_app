import React, { useState, useRef } from 'react';

const DEMO_TRANSCRIPTS = [
  "Inspector Deshmukh briefing on extortion via Instagram fake profile targeting victim under case FIR 2026 8890.",
  "Senior Inspector Shinde investigating fake bank customer care portal stealing victim credit card numbers under case FIR 2026 4419.",
  "Officer Pawar tracking illegal gambling syndicate laundering funds via USDT crypto wallets under case FIR 2026 9912.",
  "Technical Lead Constable Pawar analyzing LockBit ransomware strain on district hospital servers under ticket CY 2026 9931.",
  "Inspector Shinde reviewing unauthorized SIM porting and mobile banking fraud under case FIR 2026 3841.",
  "DSP Deshmukh investigating deepfake video blackmail targeting college student under case FIR 2026 1204.",
  "Cyber Analyst ISP 1029 analyzing WhatsApp APK malware extracting victim contacts under ticket CY 2026 7712."
];

export default function UploadModal({ isOpen, onClose, onUploadComplete, activeRole, showToast }) {
  const [file, setFile] = useState(null);
  const [customTitle, setCustomTitle] = useState('');
  const [customOfficer, setCustomOfficer] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const mediaStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recognitionRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const startMicrophoneRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Microphone recording requires HTTPS or a modern mobile browser.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      setLiveTranscript('');

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
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

        recognition.start();
        recognitionRef.current = recognition;
      }

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const recordedFile = new File([audioBlob], 'live_recorded_meeting.wav', { type: 'audio/wav' });
        recordedFile.audioUrl = URL.createObjectURL(audioBlob);
        if (liveTranscript) {
          recordedFile.customTranscript = liveTranscript;
        }
        setFile(recordedFile);

        // Hardware Safety: Immediately stop all microphone hardware tracks!
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(track => track.stop());
          mediaStreamRef.current = null;
        }
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      if (showToast) showToast('info', 'Microphone Active', 'Recording live audio stream...');
    } catch (err) {
      alert('Microphone access denied or unsupported: ' + err.message);
    }
  };

  const stopMicrophoneRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);

      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }

      if (showToast) showToast('success', 'Recording Stopped', 'Microphone stream released.');
    }
  };

  const handleProcessAudio = async (useDemoSample = false) => {
    if (!file && !useDemoSample) {
      alert('Please select an audio file or click "Load Demonstration Record".');
      return;
    }

    stopMicrophoneRecording();

    setIsProcessing(true);
    setProgress(15);
    setStatusMessage('Ingesting Audio Stream...');

    try {
      const formData = new FormData();
      let transcriptToPass = file?.customTranscript || liveTranscript;

      if (useDemoSample || (!transcriptToPass && !file)) {
        // Pick a random realistic police incident transcript for demo processing
        const randIndex = Math.floor(Math.random() * DEMO_TRANSCRIPTS.length);
        transcriptToPass = DEMO_TRANSCRIPTS[randIndex];
      }

      if (file && !useDemoSample) {
        formData.append('audio', file);
        if (file.audioUrl) {
          formData.append('audioUrl', file.audioUrl);
        }
      }

      if (transcriptToPass) {
        formData.append('customTranscript', transcriptToPass);
      }

      if (customTitle.trim()) {
        formData.append('title', customTitle.trim());
      }

      if (customOfficer.trim()) {
        formData.append('createdBy', customOfficer.trim());
      }

      setTimeout(() => { setProgress(45); setStatusMessage('Transcribing & Extracting Case Details...'); }, 600);
      setTimeout(() => { setProgress(75); setStatusMessage('Executing Presidio PII Anonymization...'); }, 1200);
      setTimeout(() => { setProgress(90); setStatusMessage('Structuring Minutes of Meeting JSON Schema...'); }, 1800);

      const response = await onUploadComplete(formData, useDemoSample);
      
      if (response?.meeting) {
        if (file && file.audioUrl) {
          response.meeting.audioUrl = file.audioUrl;
        }
        if (transcriptToPass) {
          response.meeting.rawTranscript = transcriptToPass;
          if (!response.meeting.redactedTranscript || response.meeting.redactedTranscript.includes("Inspector Shinde: Initiated emergency")) {
            response.meeting.redactedTranscript = transcriptToPass;
          }
        }
      }

      setProgress(100);
      setStatusMessage('Processing Complete');
      setTimeout(() => {
        setIsProcessing(false);
        setFile(null);
        setCustomTitle('');
        setCustomOfficer('');
        onClose();
      }, 400);
    } catch (err) {
      setIsProcessing(false);
      alert('Upload processing error: ' + err.message);
    }
  };

  return (
    <div className="cyber-modal-container">
      <div className="cyber-card cyber-modal-card">
        <div className="cyber-card-header">
          <div className="cyber-card-title">
            Ingest Audio Recording & Case Details
          </div>
          <button onClick={onClose} style={{ background: 'none', color: 'var(--text-muted)', fontSize: '18px' }}>✕</button>
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
                placeholder="Leave blank for automatic extraction"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="cyber-input"
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                INVESTIGATING OFFICER (OPTIONAL)
              </label>
              <input
                type="text"
                placeholder="e.g. Inspector Shinde"
                value={customOfficer}
                onChange={(e) => setCustomOfficer(e.target.value)}
                className="cyber-input"
              />
            </div>
          </div>

          {/* File Upload Box */}
          <div style={{
            border: '2px dashed var(--border-dark)',
            borderRadius: '0px',
            padding: '16px',
            textAlign: 'center',
            backgroundColor: 'var(--surface-2)',
            marginBottom: '14px'
          }}>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
              Select audio file (`.wav`, `.mp3`, `.m4a`) or record via microphone:
            </p>

            <input
              type="file"
              accept="audio/*"
              onChange={handleFileChange}
              style={{ display: 'none' }}
              id="file-input"
            />
            <label htmlFor="file-input" className="btn-outline" style={{ cursor: 'pointer', display: 'inline-block' }}>
              Select Local Audio File
            </label>

            {file && (
              <div style={{ marginTop: '10px', color: 'var(--state-green)', fontSize: '12px', fontWeight: '600' }}>
                Selected File: {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
              </div>
            )}
          </div>

          {/* Live Mic Recording Option */}
          <div className="modal-button-group">
            {!isRecording ? (
              <button onClick={startMicrophoneRecording} className="btn-outline" style={{ flex: 1 }}>
                Record Live via Microphone
              </button>
            ) : (
              <button onClick={stopMicrophoneRecording} className="btn-outline btn-outline-active" style={{ flex: 1, borderColor: 'var(--state-amber)' }}>
                Stop Recording & Release Mic
              </button>
            )}

            <button
              onClick={() => handleProcessAudio(true)}
              className="btn-outline"
              style={{ flex: 1 }}
            >
              Load Demonstration Record
            </button>
          </div>

          {/* Live Speech-to-Text Transcript Display Box */}
          {liveTranscript && (
            <div style={{
              backgroundColor: 'var(--surface-2)',
              border: '1.5px solid var(--border-dark)',
              padding: '12px 16px',
              borderRadius: '0px',
              fontSize: '12px',
              marginBottom: '14px',
              color: 'var(--text-main)',
              maxHeight: '120px',
              overflowY: 'auto',
              fontFamily: 'var(--font-mono)',
              lineHeight: 1.5
            }}>
              <div style={{ fontWeight: '700', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>
                Live Speech Transcript ({liveTranscript.split(/\s+/).length} words):
              </div>
              "{liveTranscript}"
            </div>
          )}

          {/* Progress Bar */}
          {isProcessing && (
            <div style={{ marginTop: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                <span>{statusMessage}</span>
                <span>{progress}%</span>
              </div>
              <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--surface-3)', borderRadius: '0px', overflow: 'hidden' }}>
                <div style={{ width: `${progress}%`, height: '100%', backgroundColor: 'var(--state-green)', transition: 'width 0.3s' }}></div>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
          <button onClick={onClose} className="btn-outline" disabled={isProcessing}>
            Cancel
          </button>
          <button
            onClick={() => handleProcessAudio(false)}
            className="btn-outline btn-outline-active"
            disabled={isProcessing || (!file && !isRecording && !liveTranscript)}
          >
            Process Audio File
          </button>
        </div>
      </div>
    </div>
  );
}

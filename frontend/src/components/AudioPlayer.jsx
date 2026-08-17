import React, { useState, useRef, useEffect } from 'react';
import { fetchApi } from '../api/client';

export default function AudioPlayer({ meeting, activeRole, showToast }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(30);
  const [audioVolume, setAudioVolume] = useState(1.0);
  const [playbackSpeed, setPlaybackSpeed] = useState('1.0');
  const [barHeights, setBarHeights] = useState([12, 24, 18, 30, 15, 26, 10, 22, 16, 28, 14, 20, 25, 18, 29, 12]);
  
  const audioRef = useRef(null);
  const animFrameRef = useRef(null);
  const synthTimerRef = useRef(null);

  const isAuditor = activeRole === 'AUDITOR';
  const speedNum = parseFloat(playbackSpeed) || 1.0;

  // Dynamic Audio Ingestion when meeting changes or speed updates
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    if (synthTimerRef.current) {
      clearInterval(synthTimerRef.current);
    }

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }

    if (meeting?.audioUrl) {
      const audio = new Audio(meeting.audioUrl);
      audio.volume = audioVolume;
      audio.playbackRate = speedNum;
      audioRef.current = audio;

      audio.onloadedmetadata = () => {
        if (audio.duration && !isNaN(audio.duration) && audio.duration !== Infinity) {
          setTotalDuration(Math.ceil(audio.duration));
        }
      };

      audio.ontimeupdate = () => {
        setCurrentTime(Math.floor(audio.currentTime));
      };

      audio.onended = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };

      audio.onerror = () => {
        estimateDurationFromTranscript();
      };
    } else {
      estimateDurationFromTranscript();
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (synthTimerRef.current) {
        clearInterval(synthTimerRef.current);
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [meeting, playbackSpeed]);

  const estimateDurationFromTranscript = () => {
    const text = meeting?.rawTranscript || "";
    const words = text.split(/\s+/).filter(Boolean).length;
    const estimated = Math.max(12, Math.ceil(words / (2.3 * speedNum)));
    setTotalDuration(estimated);
  };

  // Dynamic Equalizer Animation Loop when playing
  useEffect(() => {
    if (isPlaying) {
      const animateEqualizer = () => {
        const newHeights = barHeights.map(() => Math.floor(Math.random() * 26) + 6);
        setBarHeights(newHeights);
        animFrameRef.current = setTimeout(animateEqualizer, 120 / speedNum);
      };
      animateEqualizer();
    } else {
      if (animFrameRef.current) clearTimeout(animFrameRef.current);
      setBarHeights([12, 24, 18, 30, 15, 26, 10, 22, 16, 28, 14, 20, 25, 18, 29, 12]);
    }

    return () => {
      if (animFrameRef.current) clearTimeout(animFrameRef.current);
    };
  }, [isPlaying, playbackSpeed]);

  const formatTime = (secs) => {
    if (isNaN(secs) || secs === undefined) return "00:00";
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const togglePlay = async () => {
    if (isAuditor) {
      showToast('warning', 'Access Restricted', 'Audio playback is restricted for Auditor clearance level.');
      return;
    }

    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.pause();
      }
      if (synthTimerRef.current) {
        clearInterval(synthTimerRef.current);
      }
      setIsPlaying(false);
    } else {
      try {
        await fetchApi('/audit-logs/log', {
          method: 'POST',
          body: JSON.stringify({
            action: 'PLAY_AUDIO_RECORDING',
            resourceId: meeting?.id || 'audio-1',
            details: { title: meeting?.title, speed: speedNum, audioUrl: meeting?.audioUrl ? 'Real Audio File' : 'Speech Synth Utterance' }
          })
        }, activeRole);
      } catch (e) {}

      if (audioRef.current) {
        audioRef.current.playbackRate = speedNum;
        audioRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch(() => {
          playSpeechSynthFallback();
        });
      } else {
        playSpeechSynthFallback();
      }
    }
  };

  const playSpeechSynthFallback = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const textToSpeak = meeting?.rawTranscript || "State Cyber Cell meeting recording playback initialized.";
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.rate = speedNum;
      utterance.volume = audioVolume;
      
      utterance.onend = () => {
        setIsPlaying(false);
        setCurrentTime(0);
        if (synthTimerRef.current) clearInterval(synthTimerRef.current);
      };

      window.speechSynthesis.speak(utterance);
      setIsPlaying(true);

      // Dynamic timer progress for speech synth matching playback speed
      synthTimerRef.current = setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= totalDuration) {
            clearInterval(synthTimerRef.current);
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000 / speedNum);
    } else {
      setIsPlaying(true);
    }
  };

  const handleSeek = (e) => {
    const newTime = Number(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const handleSpeedChange = (e) => {
    const newSpeedStr = e.target.value;
    setPlaybackSpeed(newSpeedStr);
    const newSpeedVal = parseFloat(newSpeedStr);
    if (audioRef.current) {
      audioRef.current.playbackRate = newSpeedVal;
    }
    if (window.speechSynthesis && isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      if (showToast) showToast('info', 'Speed Changed', `Playback speed set to ${newSpeedStr}x. Press Play to listen.`);
    }
  };

  return (
    <div className="cyber-card" style={{ backgroundColor: 'var(--surface-1)' }}>
      <div className="cyber-card-header" style={{ marginBottom: '12px', paddingBottom: '8px' }}>
        <div className="cyber-card-title" style={{ fontSize: '14px' }}>
          🔊 Synchronized Waveform Audio Player ({meeting?.id})
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {!isAuditor && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>SPEED:</span>
              <select
                value={playbackSpeed}
                onChange={handleSpeedChange}
                className="role-select-box"
                style={{ padding: '3px 8px', fontSize: '11px', fontWeight: '700' }}
                title="Dynamic Playback Speed Control"
              >
                <option value="0.75">0.75x (Slow)</option>
                <option value="1.0">1.0x (Normal)</option>
                <option value="1.25">1.25x (Fast)</option>
                <option value="1.5">1.5x (Faster)</option>
                <option value="2.0">2.0x (Double Speed)</option>
              </select>
            </div>
          )}

          {isAuditor ? (
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', backgroundColor: 'var(--surface-3)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
              Audio Playback Restricted
            </span>
          ) : (
            <span className={isPlaying ? 'status-pill-approved' : 'status-pill-draft'} style={{ fontSize: '9px' }}>
              {isPlaying ? `▶️ PLAYING AT ${playbackSpeed}x` : 'IDLE'}
            </span>
          )}
        </div>
      </div>

      {!isAuditor ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Main Controls + Dynamic Waveform */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Play/Pause Button */}
            <button
              onClick={togglePlay}
              className="btn-outline"
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                borderColor: isPlaying ? 'var(--state-green)' : 'var(--text-main)',
                backgroundColor: isPlaying ? 'var(--state-green-bg)' : 'transparent'
              }}
            >
              {isPlaying ? '⏸️' : '▶️'}
            </button>

            {/* Audio Details & Equalizer */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--text-main)', marginBottom: '8px', fontFamily: 'var(--font-mono)' }}>
                <span style={{ color: 'var(--text-main)', fontWeight: '800', fontSize: '13px' }}>
                  ⏱️ {formatTime(currentTime)} / {formatTime(totalDuration)}
                </span>

                {/* Dynamic Equalizer Visualizer Bars */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px', height: '28px' }}>
                  {barHeights.map((h, i) => (
                    <div
                      key={i}
                      style={{
                        width: '4px',
                        height: `${h}px`,
                        backgroundColor: isPlaying ? 'var(--state-green)' : 'var(--border-dark)',
                        borderRadius: '2px',
                        transition: 'height 0.1s ease-in-out'
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Dynamic Interactive Seek Slider */}
              <input
                type="range"
                min="0"
                max={totalDuration || 100}
                value={currentTime}
                onChange={handleSeek}
                style={{ width: '100%', accentColor: 'var(--state-green)', cursor: 'pointer' }}
              />
            </div>
          </div>

          {/* Dynamic Audio File Info Bar */}
          <div style={{
            fontSize: '11px',
            color: 'var(--text-muted)',
            display: 'flex',
            justifyContent: 'space-between',
            borderTop: '1px solid var(--border-color)',
            paddingTop: '8px'
          }}>
            <span>Source: <strong>{meeting?.audioUrl ? 'Live Audio Recording Track' : 'Speech Synthesis Engine'}</strong></span>
            <span>Selected Speed: <strong>{playbackSpeed}x</strong> | Duration: <strong>{formatTime(totalDuration)}</strong></span>
          </div>
        </div>
      ) : (
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>
          Audio file access is restricted to assigned Investigating Officers and Technical Lead Administrators.
        </p>
      )}
    </div>
  );
}

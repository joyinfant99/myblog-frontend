import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import './AudioManager.css';

const AudioManager = () => {
  // Core state
  const [hasVoice, setHasVoice] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [testText, setTestText] = useState('Welcome to my blog! This is how my voice sounds.');
  const [error, setError] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudio, setCurrentAudio] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Audio device state
  const [audioDevices, setAudioDevices] = useState({ input: [], output: [] });
  const [selectedInputDevice, setSelectedInputDevice] = useState('');
  const [selectedOutputDevice, setSelectedOutputDevice] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);

  // Voice recordings state
  const [voiceRecordings, setVoiceRecordings] = useState([]);
  const [showRecordings, setShowRecordings] = useState(false);

  // Voice settings
  const [settings, setSettings] = useState({
    speed: 1.0,
    temperature: 0.85,
    length_penalty: 1.0,
    repetition_penalty: 2.5,
    top_k: 50,
    top_p: 0.85,
    pitch_shift: -5.0,  // More masculine default
    formant_shift: -0.25,  // More masculine default
    accent: "neutral"
  });

  const TTS_URL = process.env.REACT_APP_TTS_URL || 'http://127.0.0.1:8001';

  useEffect(() => {
    checkVoice();
    loadMasterSettings();
    loadRecordedAudioFromStorage();
    enumerateAudioDevices();
    loadVoiceRecordings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadVoiceRecordings = async () => {
    try {
      const res = await axios.get(`${TTS_URL}/voice-recordings`);
      setVoiceRecordings(res.data.recordings || []);
    } catch (err) {
      console.error('Failed to load voice recordings:', err);
    }
  };

  const deleteRecording = async (voiceName) => {
    if (!window.confirm(`Delete voice recording "${voiceName}"? This cannot be undone.`)) return;

    try {
      await axios.delete(`${TTS_URL}/voice-recording/${voiceName}`);
      await loadVoiceRecordings();
      await checkVoice();
      alert(`✅ Deleted voice recording "${voiceName}"`);
    } catch (err) {
      setError('Failed to delete recording: ' + (err.response?.data?.detail || err.message));
    }
  };

  const loadMasterSettings = async () => {
    try {
      const res = await axios.get(`${TTS_URL}/master-settings`);
      if (res.data.default_settings) {
        setSettings(res.data.default_settings);
      }
    } catch (err) {
      console.log('No master settings found, using defaults');
    }
  };

  const enumerateAudioDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const inputDevices = devices.filter(d => d.kind === 'audioinput');
      const outputDevices = devices.filter(d => d.kind === 'audiooutput');

      setAudioDevices({ input: inputDevices, output: outputDevices });

      // Set default devices
      if (inputDevices.length > 0 && !selectedInputDevice) {
        setSelectedInputDevice(inputDevices[0].deviceId);
      }
      if (outputDevices.length > 0 && !selectedOutputDevice) {
        setSelectedOutputDevice(outputDevices[0].deviceId);
      }
    } catch (err) {
      console.error('Failed to enumerate audio devices:', err);
    }
  };

  const loadRecordedAudioFromStorage = () => {
    try {
      // Clear old metadata if exists (audio files too large for localStorage)
      localStorage.removeItem('hasRecording');
      localStorage.removeItem('recordingDuration');
      // Note: We don't restore audio on refresh anymore to avoid quota issues
    } catch (err) {
      console.error('Failed to clear audio metadata:', err);
    }
  };

  const saveRecordedAudioToStorage = (audioBlob, duration) => {
    try {
      // Don't save large audio files to localStorage - it causes quota errors
      // Just keep in memory for current session
      console.log('Recorded audio kept in memory (too large for localStorage)');
      // Only save metadata
      localStorage.setItem('hasRecording', 'true');
      localStorage.setItem('recordingDuration', duration.toString());
    } catch (err) {
      console.error('Failed to save audio metadata:', err);
    }
  };

  const clearRecordedAudioFromStorage = () => {
    localStorage.removeItem('hasRecording');
    localStorage.removeItem('recordingDuration');
  };

  const saveMasterSettings = async () => {
    try {
      await axios.post(`${TTS_URL}/master-settings`, {
        default_settings: settings
      });
      alert('✅ Master voice settings saved! These will be used for all blog audio generation.');
    } catch (err) {
      setError('Failed to save master settings: ' + err.message);
    }
  };

  const checkVoice = async () => {
    try {
      const res = await axios.get(`${TTS_URL}/voices`);
      setHasVoice(res.data.voices?.length > 0);
    } catch (err) {
      setHasVoice(false);
    }
  };

  const startRecording = async () => {
    try {
      const constraints = {
        audio: {
          deviceId: selectedInputDevice ? { exact: selectedInputDevice } : undefined,
          sampleRate: 22050,
          channelCount: 1
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      const audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 22050 });
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);

      // Create analyser for real-time audio level visualization
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      setAnalyserNode(analyser);

      const audioChunks = [];
      const startTime = Date.now();

      const durationInterval = setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);

      // Audio level monitoring
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const levelInterval = setInterval(() => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setAudioLevel(average / 255); // Normalize to 0-1
      }, 50); // Update every 50ms

      processor.onaudioprocess = (e) => {
        audioChunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      setMediaRecorder({
        stop: () => {
          clearInterval(durationInterval);
          clearInterval(levelInterval);
          processor.disconnect();
          source.disconnect();
          analyser.disconnect();
          audioContext.close();
          stream.getTracks().forEach(t => t.stop());
          const finalDuration = Math.floor((Date.now() - startTime) / 1000);
          const audioBlob = createWavBlob(audioChunks, 22050);
          setRecordedAudio(audioBlob);
          saveRecordedAudioToStorage(audioBlob, finalDuration);
          setAudioLevel(0);
          setAnalyserNode(null);
        },
        durationInterval,
        levelInterval
      });

      setIsRecording(true);
      setRecordingDuration(0);
    } catch (err) {
      setError('Microphone access denied: ' + err.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const createWavBlob = (chunks, sampleRate) => {
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const merged = new Float32Array(totalLength);
    let offset = 0;
    chunks.forEach(chunk => {
      merged.set(chunk, offset);
      offset += chunk.length;
    });
    
    const pcm = new Int16Array(merged.length);
    for (let i = 0; i < merged.length; i++) {
      pcm[i] = Math.max(-32768, Math.min(32767, Math.floor(merged[i] * 32768)));
    }
    
    const buffer = new ArrayBuffer(44 + pcm.length * 2);
    const view = new DataView(buffer);
    
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + pcm.length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, pcm.length * 2, true);
    
    const pcmView = new Int16Array(buffer, 44);
    pcmView.set(pcm);
    
    return new Blob([buffer], { type: 'audio/wav' });
  };

  const trainVoice = async () => {
    if (!recordedAudio) return;
    
    try {
      setTrainingProgress(0);
      const progressInterval = setInterval(() => {
        setTrainingProgress(p => p >= 90 ? p : p + 10);
      }, 500);

      const formData = new FormData();
      formData.append('voice_name', 'MyVoice');
      formData.append('description', 'My voice');
      formData.append('audio_files', recordedAudio, 'voice.wav');

      const res = await fetch(`${TTS_URL}/train-voice`, {
        method: 'POST',
        body: formData
      });

      clearInterval(progressInterval);
      
      if (!res.ok) throw new Error('Training failed');
      
      setTrainingProgress(100);
      setTimeout(() => {
        setHasVoice(true);
        setRecordedAudio(null);
        setTrainingProgress(0);
        clearRecordedAudioFromStorage();
        loadVoiceRecordings(); // Reload recordings list
        alert('✅ Voice trained successfully!');
      }, 500);
    } catch (err) {
      setError('Training failed: ' + err.message);
      setTrainingProgress(0);
    }
  };

  const deleteVoice = async () => {
    if (!window.confirm('Delete your voice model? This cannot be undone.')) return;
    
    try {
      await axios.delete(`${TTS_URL}/voice/MyVoice`);
      setHasVoice(false);
      alert('✅ Voice deleted');
    } catch (err) {
      setError('Delete failed: ' + (err.response?.data?.detail || err.message));
    }
  };

  const testVoice = async () => {
    if (!testText.trim()) {
      setError('Enter text to test');
      return;
    }

    // Stop any currently playing audio
    if (currentAudio) {
      currentAudio.pause();
      setIsPlaying(false);
    }

    try {
      setError('');
      setIsGenerating(true); // Show loading state

      console.log('Sending voice settings to test endpoint:', settings);

      const res = await axios.post(`${TTS_URL}/test-voice`, {
        text: testText,
        voice_settings: settings
      }, { responseType: 'blob' });

      setIsGenerating(false); // Hide loading state

      const audio = new Audio(URL.createObjectURL(res.data));

      // Set output device if supported
      if (typeof audio.setSinkId === 'function' && selectedOutputDevice) {
        try {
          await audio.setSinkId(selectedOutputDevice);
        } catch (err) {
          console.warn('Failed to set output device:', err);
        }
      }

      // Set playing only when audio actually starts
      audio.onplay = () => {
        setIsPlaying(true);
      };

      audio.onended = () => {
        setIsPlaying(false);
        setCurrentAudio(null);
      };

      audio.onerror = () => {
        setIsPlaying(false);
        setCurrentAudio(null);
        setError('Audio playback failed');
      };

      setCurrentAudio(audio);
      await audio.play();
    } catch (err) {
      setIsGenerating(false);
      setIsPlaying(false);
      setCurrentAudio(null);
      setError('Test failed: ' + (err.response?.data?.detail || err.message));
    }
  };

  const stopAudio = () => {
    if (currentAudio) {
      currentAudio.pause();
      setIsPlaying(false);
      setCurrentAudio(null);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="audio-manager" style={{maxWidth: '900px', margin: '0 auto', padding: '20px'}}>
      <h2>🎙️ Voice Manager</h2>
      
      {error && (
        <div style={{padding: '12px', backgroundColor: '#fee', border: '1px solid #fcc', borderRadius: '6px', marginBottom: '20px', color: '#c00'}}>
          {error}
        </div>
      )}

      {/* SECTION 1: Voice Training */}
      {!hasVoice && (
        <div style={{backgroundColor: '#f9fafb', padding: '24px', borderRadius: '12px', marginBottom: '20px'}}>
          <h3>Step 1: Train Your Voice</h3>
          <p style={{color: '#666', marginBottom: '20px'}}>Record 3-5 minutes of natural speech for best results.</p>

          {!isRecording && !recordedAudio && (
            <>
              {/* Audio Device Selection */}
              <div style={{backgroundColor: 'white', padding: '16px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #e5e7eb'}}>
                <h4 style={{margin: '0 0 12px 0', fontSize: '15px', color: '#374151'}}>🎚️ Audio Devices</h4>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px'}}>
                  <div>
                    <label style={{display: 'block', marginBottom: '6px', fontSize: '13px', color: '#6b7280', fontWeight: '500'}}>
                      🎤 Input Microphone:
                    </label>
                    <select
                      value={selectedInputDevice}
                      onChange={(e) => setSelectedInputDevice(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        backgroundColor: 'white',
                        cursor: 'pointer'
                      }}
                    >
                      {audioDevices.input.map(device => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{display: 'block', marginBottom: '6px', fontSize: '13px', color: '#6b7280', fontWeight: '500'}}>
                      🔊 Output Speaker:
                    </label>
                    <select
                      value={selectedOutputDevice}
                      onChange={(e) => setSelectedOutputDevice(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        backgroundColor: 'white',
                        cursor: 'pointer'
                      }}
                    >
                      {audioDevices.output.map(device => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label || `Speaker ${device.deviceId.slice(0, 8)}`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <button
                  onClick={enumerateAudioDevices}
                  style={{
                    marginTop: '12px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    backgroundColor: '#f3f4f6',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    color: '#374151'
                  }}
                >
                  🔄 Refresh Devices
                </button>
              </div>

              <button
                onClick={startRecording}
                style={{padding: '12px 24px', fontSize: '16px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer'}}
              >
                🎤 Start Recording
              </button>
            </>
          )}

          {isRecording && (
            <div style={{backgroundColor: '#fef2f2', padding: '20px', borderRadius: '8px', border: '2px solid #fca5a5', position: 'relative', overflow: 'hidden'}}>
              {/* Animated pulse background */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'radial-gradient(circle at 20% 50%, rgba(239, 68, 68, 0.1) 0%, transparent 50%)',
                animation: 'pulse 2s ease-in-out infinite',
                pointerEvents: 'none'
              }}></div>

              <div style={{display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px', position: 'relative', zIndex: 1}}>
                {/* Animated recording indicator with ripple effect */}
                <div style={{position: 'relative', width: '20px', height: '20px'}}>
                  <div style={{
                    position: 'absolute',
                    width: '20px',
                    height: '20px',
                    backgroundColor: '#ef4444',
                    borderRadius: '50%',
                    animation: 'ripple 1.5s ease-out infinite'
                  }}></div>
                  <div style={{
                    position: 'absolute',
                    width: '12px',
                    height: '12px',
                    backgroundColor: '#ef4444',
                    borderRadius: '50%',
                    top: '4px',
                    left: '4px'
                  }}></div>
                </div>

                <div style={{flex: 1}}>
                  <strong style={{fontSize: '18px', color: '#dc2626'}}>🎙️ RECORDING</strong>
                  <div style={{fontSize: '24px', fontWeight: 'bold', color: '#991b1b', fontFamily: 'monospace', marginTop: '4px'}}>
                    {formatTime(recordingDuration)}
                  </div>
                </div>

                <div style={{textAlign: 'right', fontSize: '14px', padding: '8px 12px', backgroundColor: 'white', borderRadius: '6px', border: '1px solid #fca5a5'}}>
                  {recordingDuration < 30 && <span style={{color: '#dc2626'}}>⚠️ Keep going<br/><small>(30s min)</small></span>}
                  {recordingDuration >= 30 && recordingDuration < 180 && <span style={{color: '#059669'}}>✓ Good<br/><small>(3min recommended)</small></span>}
                  {recordingDuration >= 180 && <span style={{color: '#7c3aed'}}>✨ Excellent!<br/><small>Ready to stop</small></span>}
                </div>
              </div>

              {/* Audio level visualization bars - Real-time */}
              <div style={{display: 'flex', gap: '4px', height: '40px', alignItems: 'flex-end', marginBottom: '15px', padding: '0 20px'}}>
                {[...Array(20)].map((_, i) => {
                  // Create dynamic height based on audio level with some randomness for visual effect
                  const randomFactor = 0.7 + Math.random() * 0.3;
                  const barHeight = Math.max(20, audioLevel * 100 * randomFactor);
                  return (
                    <div key={i} style={{
                      flex: 1,
                      height: `${barHeight}%`,
                      backgroundColor: audioLevel > 0.1 ? '#ef4444' : '#fca5a5',
                      borderRadius: '2px',
                      transition: 'height 0.1s ease-out, background-color 0.2s',
                      opacity: 0.9
                    }}></div>
                  );
                })}
              </div>
              <div style={{backgroundColor: 'white', padding: '15px', borderRadius: '6px', marginBottom: '15px', lineHeight: '1.8', maxHeight: '300px', overflowY: 'auto'}}>
                <strong>📖 Read this naturally (3-5 minutes):</strong>
                
                <p style={{marginTop: '15px'}}><strong>Introduction (30 seconds):</strong><br/>
                "Welcome to my blog. I'm excited to share my thoughts on technology, innovation, and the future of artificial intelligence. My goal is to make complex topics accessible and engaging for everyone who visits."</p>
                
                <p><strong>On Technology (1 minute):</strong><br/>
                "Technology is evolving at an unprecedented pace. What seemed impossible just a few years ago is now part of our daily lives. From smartphones to cloud computing, from social media to artificial intelligence, we're living through a remarkable transformation. The key is not just to adopt new technologies, but to understand their impact on society, business, and our personal lives."</p>
                
                <p><strong>On AI and Voice Cloning (1 minute):</strong><br/>
                "Voice cloning technology represents a fascinating intersection of artificial intelligence and human creativity. It allows content creators to scale their work while maintaining their personal touch and authentic voice. The technology works by analyzing speech patterns, intonation, and vocal characteristics to create a digital representation of someone's voice. When done right, it can sound remarkably natural and preserve the speaker's unique personality."</p>
                
                <p><strong>On Content Creation (1 minute):</strong><br/>
                "Creating quality content requires time, effort, and consistency. Whether you're writing blog posts, recording podcasts, or producing videos, maintaining a regular schedule can be challenging. That's where AI tools become valuable assistants rather than replacements. They help us work more efficiently, allowing us to focus on the creative aspects while automating repetitive tasks. The goal isn't to replace human creativity, but to enhance it."</p>
                
                <p><strong>On Learning and Growth (1 minute):</strong><br/>
                "I believe in continuous learning and experimentation. Every new technology, every new tool, every new approach is an opportunity to grow and improve. Whether you're a developer, entrepreneur, designer, or creative professional, staying curious and open to new ideas is essential. Don't be afraid to try new things, make mistakes, and learn from them. That's how we innovate and push boundaries."</p>
                
                <p><strong>Conclusion (30 seconds):</strong><br/>
                "Thank you for taking the time to read my blog. I hope you find the content valuable and thought-provoking. Feel free to explore different topics, leave comments, and share your own perspectives. Technology is most powerful when it brings people together and enables meaningful conversations. Let's continue learning and growing together."</p>
                
                <p style={{fontStyle: 'italic', color: '#666', marginTop: '15px'}}>
                  💡 Tip: Keep reading naturally. Vary your tone, pause between paragraphs, and speak as if you're talking to a friend. The more natural and expressive you sound, the better your cloned voice will be!
                </p>
              </div>
              <button 
                onClick={stopRecording}
                style={{padding: '12px 24px', fontSize: '16px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer'}}
              >
                ⏹️ Stop Recording
              </button>
            </div>
          )}

          {recordedAudio && (
            <div style={{backgroundColor: '#ecfdf5', padding: '20px', borderRadius: '8px', border: '2px solid #6ee7b7'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
                <div>
                  <strong style={{fontSize: '16px'}}>✅ Recording Complete</strong>
                  <div style={{fontSize: '14px', color: '#065f46', marginTop: '4px'}}>
                    Duration: {formatTime(recordingDuration)}
                  </div>
                </div>
                {recordingDuration < 180 && (
                  <div style={{padding: '8px 12px', backgroundColor: '#dbeafe', borderRadius: '6px', fontSize: '13px', color: '#1e40af'}}>
                    💡 Tip: 3-5 min recordings work best
                  </div>
                )}
              </div>

              {/* Audio Playback Section */}
              <div style={{backgroundColor: 'white', padding: '15px', borderRadius: '8px', marginBottom: '15px', border: '1px solid #a7f3d0'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px'}}>
                  <span style={{fontSize: '14px', fontWeight: '500', color: '#047857'}}>🎧 Preview Your Recording:</span>
                </div>
                <audio
                  controls
                  style={{width: '100%', height: '40px'}}
                  src={recordedAudio ? URL.createObjectURL(recordedAudio) : ''}
                />
                <p style={{fontSize: '12px', color: '#6b7280', marginTop: '8px', marginBottom: 0}}>
                  Listen to your recording to make sure the quality is good before training
                </p>
              </div>

              <div style={{display: 'flex', gap: '10px'}}>
                <button
                  onClick={trainVoice}
                  disabled={trainingProgress > 0}
                  style={{
                    flex: 1,
                    padding: '12px 24px',
                    fontSize: '16px',
                    backgroundColor: trainingProgress > 0 ? '#9ca3af' : '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: trainingProgress > 0 ? 'not-allowed' : 'pointer',
                    fontWeight: '600'
                  }}
                >
                  {trainingProgress > 0 ? `🔄 Training ${trainingProgress}%` : '🚀 Train Voice'}
                </button>
                <button
                  onClick={() => {
                    setRecordedAudio(null);
                    setRecordingDuration(0);
                    clearRecordedAudioFromStorage();
                  }}
                  style={{padding: '12px 24px', fontSize: '16px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer'}}
                >
                  🗑️ Discard
                </button>
              </div>
              {trainingProgress > 0 && (
                <div style={{marginTop: '15px'}}>
                  <div style={{width: '100%', height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden'}}>
                    <div style={{width: `${trainingProgress}%`, height: '100%', backgroundColor: '#10b981', transition: 'width 0.3s'}}></div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: Voice Controls (only show when voice is trained) */}
      {hasVoice && (
        <>
          <div style={{backgroundColor: '#f9fafb', padding: '24px', borderRadius: '12px', marginBottom: '20px'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
              <h3>✅ Voice Trained</h3>
              <div style={{display: 'flex', gap: '10px'}}>
                <button 
                  onClick={() => {setHasVoice(false); setRecordedAudio(null);}}
                  style={{padding: '8px 16px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer'}}
                >
                  🔄 Re-train
                </button>
                <button 
                  onClick={deleteVoice}
                  style={{padding: '8px 16px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer'}}
                >
                  🗑️ Delete
                </button>
              </div>
            </div>

            {/* Voice Info */}
            <div style={{padding: '12px', backgroundColor: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: '6px', marginBottom: '20px', fontSize: '14px'}}>
              <strong style={{color: '#065f46'}}>📊 Your Voice Model</strong>
              <p style={{margin: '8px 0 0 0', color: '#047857'}}>
                Voice model is active and ready to use. Adjust settings below to customize how it sounds.
              </p>
              <p style={{margin: '8px 0 0 0', color: '#dc2626', fontSize: '13px'}}>
                ⚠️ <strong>If voice sounds robotic or feminine:</strong> Re-train with a 3-5 minute recording of deep, masculine speech for better quality.
              </p>
            </div>

            {/* Voice Recordings Manager */}
            <div style={{marginBottom: '20px'}}>
              <button
                onClick={() => setShowRecordings(!showRecordings)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  backgroundColor: '#f3f4f6',
                  border: '2px solid #d1d5db',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '15px',
                  fontWeight: '600',
                  color: '#374151',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span>🎵 Manage Voice Recordings ({voiceRecordings.length})</span>
                <span>{showRecordings ? '▼' : '▶'}</span>
              </button>

              {showRecordings && (
                <div style={{marginTop: '12px', padding: '16px', backgroundColor: 'white', border: '2px solid #d1d5db', borderRadius: '8px'}}>
                  <p style={{fontSize: '13px', color: '#6b7280', marginBottom: '15px'}}>
                    These are your voice training recordings. Listen to them to check quality. Delete poor recordings and re-train if needed.
                  </p>

                  {voiceRecordings.length === 0 ? (
                    <p style={{fontSize: '14px', color: '#9ca3af', textAlign: 'center', padding: '20px'}}>
                      No voice recordings found. Train a voice to see recordings here.
                    </p>
                  ) : (
                    <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                      {voiceRecordings.map((recording) => (
                        <div
                          key={recording.voice_name}
                          style={{
                            padding: '16px',
                            backgroundColor: '#f9fafb',
                            borderRadius: '8px',
                            border: '1px solid #e5e7eb'
                          }}
                        >
                          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px'}}>
                            <div style={{flex: 1}}>
                              <strong style={{fontSize: '15px', color: '#111827'}}>{recording.voice_name}</strong>
                              <div style={{fontSize: '13px', color: '#6b7280', marginTop: '4px'}}>
                                Duration: {recording.duration_seconds}s | Size: {recording.size_mb} MB
                              </div>
                              <div style={{fontSize: '12px', color: '#9ca3af', marginTop: '2px'}}>
                                Created: {new Date(recording.created_at).toLocaleString()}
                              </div>
                            </div>
                            <button
                              onClick={() => deleteRecording(recording.voice_name)}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: '#fee2e2',
                                color: '#dc2626',
                                border: '1px solid #fca5a5',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: '600'
                              }}
                            >
                              🗑️ Delete
                            </button>
                          </div>

                          <audio
                            controls
                            style={{width: '100%', height: '36px'}}
                            src={`${TTS_URL}/voice-recording/${recording.voice_name}`}
                          />

                          {recording.duration_seconds < 30 && (
                            <div style={{marginTop: '8px', padding: '8px', backgroundColor: '#fef2f2', borderRadius: '4px', fontSize: '12px', color: '#dc2626'}}>
                              ⚠️ Recording is too short ({recording.duration_seconds}s). For best results, record 3-5 minutes.
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Accent Selection */}
            <div style={{backgroundColor: '#fefce8', padding: '15px', borderRadius: '8px', marginBottom: '20px'}}>
              <h4 style={{margin: '0 0 15px 0'}}>🌍 Accent</h4>
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px'}}>
                <button
                  onClick={() => setSettings({...settings, accent: 'neutral'})}
                  style={{
                    padding: '10px 8px',
                    fontSize: '13px',
                    backgroundColor: settings.accent === 'neutral' ? '#eab308' : 'white',
                    color: settings.accent === 'neutral' ? 'white' : '#854d0e',
                    border: '2px solid #eab308',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  🌐 Neutral
                </button>
                <button
                  onClick={() => setSettings({...settings, accent: 'us'})}
                  style={{
                    padding: '10px 8px',
                    fontSize: '13px',
                    backgroundColor: settings.accent === 'us' ? '#3b82f6' : 'white',
                    color: settings.accent === 'us' ? 'white' : '#1e40af',
                    border: '2px solid #3b82f6',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  🇺🇸 US English
                </button>
                <button
                  onClick={() => setSettings({...settings, accent: 'uk'})}
                  style={{
                    padding: '10px 8px',
                    fontSize: '13px',
                    backgroundColor: settings.accent === 'uk' ? '#8b5cf6' : 'white',
                    color: settings.accent === 'uk' ? 'white' : '#5b21b6',
                    border: '2px solid #8b5cf6',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  🇬🇧 UK English
                </button>
                <button
                  onClick={() => setSettings({...settings, accent: 'indian'})}
                  style={{
                    padding: '10px 8px',
                    fontSize: '13px',
                    backgroundColor: settings.accent === 'indian' ? '#f97316' : 'white',
                    color: settings.accent === 'indian' ? 'white' : '#9a3412',
                    border: '2px solid #f97316',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  🇮🇳 Indian English
                </button>
              </div>
              <div style={{marginTop: '12px', padding: '10px', backgroundColor: 'white', borderRadius: '6px', fontSize: '12px', color: '#854d0e'}}>
                💡 <strong>Note:</strong> Accent simulation modifies pitch, intonation, and rhythm patterns. This is an approximation and works best with clear voice recordings.
              </div>
            </div>

            {/* Voice Character Adjustment */}
            <div style={{backgroundColor: '#f0f9ff', padding: '15px', borderRadius: '8px', marginBottom: '20px'}}>
              <h4 style={{margin: '0 0 15px 0'}}>🎵 Voice Character</h4>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px'}}>
                <div>
                  <label style={{display: 'block', marginBottom: '8px', fontSize: '14px'}}>
                    Pitch: {settings.pitch_shift > 0 ? '+' : ''}{settings.pitch_shift}
                    <span style={{marginLeft: '10px', fontSize: '12px', color: '#666'}}>
                      {settings.pitch_shift < -3 ? '🔉 Masculine' : settings.pitch_shift > 3 ? '🔊 Feminine' : '🎯 Neutral'}
                    </span>
                  </label>
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    step="0.5"
                    value={settings.pitch_shift}
                    onChange={(e) => setSettings({...settings, pitch_shift: parseFloat(e.target.value)})}
                    style={{width: '100%'}}
                  />
                </div>
                <div>
                  <label style={{display: 'block', marginBottom: '8px', fontSize: '14px'}}>
                    Formant: {settings.formant_shift > 0 ? '+' : ''}{settings.formant_shift.toFixed(2)}
                    <span style={{marginLeft: '10px', fontSize: '12px', color: '#666'}}>
                      {settings.formant_shift < -0.3 ? '💪 Masculine' : settings.formant_shift > 0.3 ? '✨ Feminine' : '⚖️ Balanced'}
                    </span>
                  </label>
                  <input
                    type="range"
                    min="-1"
                    max="1"
                    step="0.05"
                    value={settings.formant_shift}
                    onChange={(e) => setSettings({...settings, formant_shift: parseFloat(e.target.value)})}
                    style={{width: '100%'}}
                  />
                </div>
              </div>
              <div style={{display: 'flex', gap: '10px', marginTop: '15px'}}>
                <button onClick={() => setSettings({...settings, pitch_shift: -4, formant_shift: -0.4})} style={{padding: '6px 12px', fontSize: '13px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer'}}>
                  💪 More Masculine
                </button>
                <button onClick={() => setSettings({...settings, pitch_shift: 0, formant_shift: 0})} style={{padding: '6px 12px', fontSize: '13px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer'}}>
                  ⚖️ Reset
                </button>
                <button onClick={() => setSettings({...settings, pitch_shift: 4, formant_shift: 0.4})} style={{padding: '6px 12px', fontSize: '13px', backgroundColor: '#ec4899', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer'}}>
                  ✨ More Feminine
                </button>
              </div>
            </div>

            {/* Advanced Settings */}
            <div style={{backgroundColor: '#fff7ed', padding: '15px', borderRadius: '8px', marginTop: '20px'}}>
              <h4 style={{margin: '0 0 15px 0'}}>⚙️ Advanced Voice Settings</h4>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px'}}>
                <div>
                  <label style={{display: 'block', marginBottom: '8px', fontSize: '14px'}}>
                    Speed: {settings.speed.toFixed(2)}
                    <span style={{marginLeft: '10px', fontSize: '12px', color: '#666'}}>
                      {settings.speed < 0.8 ? '🐢 Slow' : settings.speed > 1.2 ? '🚀 Fast' : '⚡ Normal'}
                    </span>
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.05"
                    value={settings.speed}
                    onChange={(e) => setSettings({...settings, speed: parseFloat(e.target.value)})}
                    style={{width: '100%'}}
                  />
                </div>
                <div>
                  <label style={{display: 'block', marginBottom: '8px', fontSize: '14px'}}>
                    Temperature: {settings.temperature.toFixed(2)}
                    <span style={{marginLeft: '10px', fontSize: '12px', color: '#666'}}>
                      {settings.temperature < 0.5 ? '🤖 Robotic' : settings.temperature > 0.8 ? '🎭 Expressive' : '😊 Balanced'}
                    </span>
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={settings.temperature}
                    onChange={(e) => setSettings({...settings, temperature: parseFloat(e.target.value)})}
                    style={{width: '100%'}}
                  />
                </div>
                <div>
                  <label style={{display: 'block', marginBottom: '8px', fontSize: '14px'}}>
                    Repetition Penalty: {settings.repetition_penalty.toFixed(1)}
                    <span style={{marginLeft: '10px', fontSize: '12px', color: '#666'}}>
                      {settings.repetition_penalty > 3 ? '🔒 Strict' : '✨ Flexible'}
                    </span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="0.1"
                    value={settings.repetition_penalty}
                    onChange={(e) => setSettings({...settings, repetition_penalty: parseFloat(e.target.value)})}
                    style={{width: '100%'}}
                  />
                </div>
                <div>
                  <label style={{display: 'block', marginBottom: '8px', fontSize: '14px'}}>
                    Top-K: {settings.top_k}
                    <span style={{marginLeft: '10px', fontSize: '12px', color: '#666'}}>
                      {settings.top_k < 30 ? '🎯 Precise' : '🌊 Creative'}
                    </span>
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={settings.top_k}
                    onChange={(e) => setSettings({...settings, top_k: parseInt(e.target.value)})}
                    style={{width: '100%'}}
                  />
                </div>
                <div>
                  <label style={{display: 'block', marginBottom: '8px', fontSize: '14px'}}>
                    Top-P: {settings.top_p.toFixed(2)}
                    <span style={{marginLeft: '10px', fontSize: '12px', color: '#666'}}>
                      {settings.top_p < 0.7 ? '📍 Focused' : '🎨 Diverse'}
                    </span>
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="1"
                    step="0.05"
                    value={settings.top_p}
                    onChange={(e) => setSettings({...settings, top_p: parseFloat(e.target.value)})}
                    style={{width: '100%'}}
                  />
                </div>
                <div>
                  <label style={{display: 'block', marginBottom: '8px', fontSize: '14px'}}>
                    Length Penalty: {settings.length_penalty.toFixed(1)}
                    <span style={{marginLeft: '10px', fontSize: '12px', color: '#666'}}>
                      {settings.length_penalty < 0.8 ? '📝 Concise' : settings.length_penalty > 1.2 ? '📚 Detailed' : '⚖️ Balanced'}
                    </span>
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={settings.length_penalty}
                    onChange={(e) => setSettings({...settings, length_penalty: parseFloat(e.target.value)})}
                    style={{width: '100%'}}
                  />
                </div>
              </div>
              <div style={{marginTop: '12px', padding: '10px', backgroundColor: 'white', borderRadius: '6px', fontSize: '12px', color: '#92400e'}}>
                💡 <strong>Tip:</strong> If voice sounds robotic, increase Temperature (0.85+) and decrease Repetition Penalty (2.0-2.5). For more natural speech, use default settings.
              </div>
            </div>
          </div>

          {/* Test Voice */}
          <div style={{backgroundColor: '#f9fafb', padding: '24px', borderRadius: '12px'}}>
            <h3>🎯 Test Your Voice</h3>
            {isGenerating && (
              <div style={{padding: '12px', backgroundColor: '#fef3c7', border: '2px solid #fbbf24', borderRadius: '6px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px'}}>
                <div style={{width: '12px', height: '12px', backgroundColor: '#f59e0b', borderRadius: '50%', animation: 'pulse 1.5s infinite'}}></div>
                <strong style={{color: '#92400e'}}>⏳ Generating audio...</strong>
              </div>
            )}
            {isPlaying && (
              <div style={{padding: '12px', backgroundColor: '#dbeafe', border: '2px solid #3b82f6', borderRadius: '6px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px'}}>
                <div style={{width: '12px', height: '12px', backgroundColor: '#3b82f6', borderRadius: '50%', animation: 'pulse 1.5s infinite'}}></div>
                <strong style={{color: '#1e40af'}}>🔊 Playing audio...</strong>
              </div>
            )}
            <textarea
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              placeholder="Enter text to test..."
              style={{width: '100%', minHeight: '100px', padding: '12px', fontSize: '14px', borderRadius: '6px', border: '1px solid #d1d5db', marginBottom: '15px'}}
            />
            <div style={{display: 'flex', gap: '10px'}}>
              <button
                onClick={testVoice}
                disabled={isPlaying || isGenerating}
                style={{padding: '12px 24px', fontSize: '16px', backgroundColor: (isPlaying || isGenerating) ? '#9ca3af' : '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: (isPlaying || isGenerating) ? 'not-allowed' : 'pointer'}}
              >
                {isGenerating ? '⏳ Generating...' : isPlaying ? '🔊 Playing...' : '▶️ Test Voice'}
              </button>
              {isPlaying && (
                <button
                  onClick={stopAudio}
                  style={{padding: '12px 24px', fontSize: '16px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer'}}
                >
                  ⏹️ Stop
                </button>
              )}
            </div>

            {/* Save as Master Button - Moved here after testing */}
            <div style={{marginTop: '24px', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '2px solid #e5e7eb'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <div style={{flex: 1}}>
                  <p style={{fontSize: '14px', color: '#374151', marginBottom: '4px', fontWeight: '500'}}>
                    💾 Happy with your voice settings?
                  </p>
                  <p style={{fontSize: '12px', color: '#6b7280', margin: 0}}>
                    Save these settings as default for all blog audio generation
                  </p>
                </div>
                <button
                  onClick={saveMasterSettings}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#8b5cf6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '15px',
                    fontWeight: '600',
                    boxShadow: '0 2px 4px rgba(139, 92, 246, 0.3)',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap'
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = '#7c3aed'}
                  onMouseOut={(e) => e.target.style.backgroundColor = '#8b5cf6'}
                >
                  💾 Save Master Settings
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AudioManager;

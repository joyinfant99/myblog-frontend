import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AudioManager.css';

const AudioManager = () => {
  const [generating, setGenerating] = useState({});
  const [error, setError] = useState('');
  const [playingAudio, setPlayingAudio] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordedAudio, setRecordedAudio] = useState(null);
  const [customTestText, setCustomTestText] = useState('Welcome to my blog! This is how my voice sounds when reading my posts.');
  const [textLengthWarning, setTextLengthWarning] = useState('');
  const [hasTrainedVoice, setHasTrainedVoice] = useState(false);
  const [showRetraining, setShowRetraining] = useState(false);
  const [voiceInfo, setVoiceInfo] = useState(null);
  const [voiceSettings, setVoiceSettings] = useState({
    speed: 1.0,
    temperature: 0.75,
    length_penalty: 1.0,
    repetition_penalty: 5.0,
    top_k: 50,
    top_p: 0.85,
    pitch_shift: 0.0,
    formant_shift: 0.0
  });
  const [recordings, setRecordings] = useState([]);
  const [playingRecording, setPlayingRecording] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [trainingProgress, setTrainingProgress] = useState(0);

  const REACT_APP_API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';
  const TTS_SERVICE_URL = process.env.REACT_APP_TTS_URL || 'http://127.0.0.1:8001';

  useEffect(() => {
    checkTrainedVoice();
    fetchVoiceInfo();
    fetchRecordings();
  }, []);

  const checkTrainedVoice = async () => {
    try {
      const response = await axios.get(`${TTS_SERVICE_URL}/voices`);
      const voices = response.data.voices || [];
      setHasTrainedVoice(voices.length > 0);
    } catch (err) {
      console.error('Failed to check trained voices:', err);
      setHasTrainedVoice(false);
    }
  };

  const fetchVoiceInfo = async () => {
    try {
      const response = await axios.get(`${TTS_SERVICE_URL}/voice-info`);
      setVoiceInfo(response.data);
    } catch (err) {
      console.log('No voice info available:', err.response?.status);
      setVoiceInfo(null);
    }
  };

  const fetchRecordings = async () => {
    try {
      const response = await axios.get(`${TTS_SERVICE_URL}/recordings`);
      setRecordings(response.data.recordings || []);
    } catch (err) {
      console.error('Failed to fetch recordings:', err);
      setRecordings([]);
    }
  };

  const playRecording = (recording) => {
    // Stop any currently playing audio
    if (playingRecording) {
      playingRecording.pause();
      setPlayingRecording(null);
    }

    const audio = new Audio(`${TTS_SERVICE_URL}${recording.audio_url}`);
    audio.onended = () => setPlayingRecording(null);
    audio.play();
    setPlayingRecording(audio);
  };

  const stopPlayingRecording = () => {
    if (playingRecording) {
      playingRecording.pause();
      setPlayingRecording(null);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 22050,
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false
        }
      });
      
      // Use Web Audio API to record directly to WAV format
      const audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 22050 });
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      
      const audioChunks = [];
      const startTime = Date.now();
      
      // Update duration timer
      const durationInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setRecordingDuration(elapsed);
      }, 1000);
      
      processor.onaudioprocess = (event) => {
        const inputData = event.inputBuffer.getChannelData(0);
        audioChunks.push(new Float32Array(inputData));
      };
      
      source.connect(processor);
      processor.connect(audioContext.destination);
      
      setMediaRecorder({
        stop: () => {
          clearInterval(durationInterval);
          processor.disconnect();
          source.disconnect();
          audioContext.close();
          stream.getTracks().forEach(track => track.stop());
          
          // Convert Float32Array chunks to WAV
          const wavBlob = createWavBlob(audioChunks, 22050);
          setRecordedAudio(wavBlob);
          console.log('Recording saved as: audio/wav');
        },
        durationInterval
      });
      
      setIsRecording(true);
      setRecordingDuration(0);
    } catch (err) {
      setError('Failed to access microphone: ' + err.message);
    }
  };

  // Helper function to create WAV blob from audio data
  const createWavBlob = (audioChunks, sampleRate) => {
    // Calculate total length
    const totalLength = audioChunks.reduce((acc, chunk) => acc + chunk.length, 0);
    
    // Merge all chunks
    const mergedData = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of audioChunks) {
      mergedData.set(chunk, offset);
      offset += chunk.length;
    }
    
    // Convert to 16-bit PCM
    const pcmData = new Int16Array(mergedData.length);
    for (let i = 0; i < mergedData.length; i++) {
      pcmData[i] = Math.max(-32768, Math.min(32767, Math.floor(mergedData[i] * 32768)));
    }
    
    // Create WAV header
    const headerLength = 44;
    const dataLength = pcmData.length * 2;
    const buffer = new ArrayBuffer(headerLength + dataLength);
    const view = new DataView(buffer);
    
    // WAV header
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
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
    view.setUint32(40, dataLength, true);
    
    // Write PCM data
    const pcmView = new Int16Array(buffer, headerLength);
    pcmView.set(pcmData);
    
    return new Blob([buffer], { type: 'audio/wav' });
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const playRecordedAudio = () => {
    if (recordedAudio) {
      const audioUrl = URL.createObjectURL(recordedAudio);
      const audio = new Audio(audioUrl);
      audio.play();
      audio.addEventListener('ended', () => {
        URL.revokeObjectURL(audioUrl);
      });
    }
  };

  const uploadVoiceSamples = async () => {
    if (!recordedAudio) {
      setError('Please record a voice sample first');
      return;
    }

    try {
      setGenerating(prev => ({ ...prev, 'training': true }));
      setError('');
      setTrainingProgress(0);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setTrainingProgress(prev => {
          if (prev >= 90) return prev;
          return prev + 10;
        });
      }, 500);

      // Upload to voice cloning service
      const formData = new FormData();
      formData.append('voice_name', 'MyVoice');
      formData.append('description', 'My custom voice for blog posts');
      formData.append('audio_files', recordedAudio, 'voice_sample.wav');

      const response = await fetch(`${TTS_SERVICE_URL}/train-voice`, {
        method: 'POST',
        body: formData
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        throw new Error('Voice training failed');
      }

      const result = await response.json();
      setTrainingProgress(100);
      
      setTimeout(async () => {
        setHasTrainedVoice(true);
        await fetchVoiceInfo(); // Refresh voice info
        await fetchRecordings(); // Refresh recordings list
        setShowRetraining(false); // Close retraining section
        alert('✅ Voice training completed! Your voice is now ready for generating blog audio.');
        setTrainingProgress(0);
      }, 500);
      
      // Don't clear the recording so user can play it back
    } catch (err) {
      setError('Failed to save voice sample: ' + err.message);
      setTrainingProgress(0);
    } finally {
      setGenerating(prev => ({ ...prev, 'training': false }));
    }
  };

  const deleteVoice = async (voiceName) => {
    if (!window.confirm(`Are you sure you want to delete the voice "${voiceName}"? This cannot be undone.`)) {
      return;
    }

    try {
      const response = await axios.delete(`${TTS_SERVICE_URL}/voice/${voiceName}`);
      
      if (response.data.success) {
        alert(`✅ Voice "${voiceName}" deleted successfully!`);
        await fetchVoiceInfo();
        await fetchRecordings();
        setHasTrainedVoice(false);
      }
    } catch (err) {
      setError('Failed to delete voice: ' + (err.response?.data?.detail || err.message));
    }
  };

  const testCustomVoice = async () => {
    if (!customTestText.trim()) {
      setError('Please enter some text to test');
      return;
    }

    if (!hasTrainedVoice) {
      setError('Please train your voice first by recording a voice sample above');
      return;
    }

    try {
      setGenerating(prev => ({ ...prev, 'voiceTest': true }));
      setError('');

      const response = await axios.post(`${TTS_SERVICE_URL}/test-voice`, {
        text: customTestText,
        voice_settings: voiceSettings
      }, {
        responseType: 'blob'
      });

      // Create a URL for the audio blob and play it
      const audioBlob = response.data;
      const audioUrl = URL.createObjectURL(audioBlob);
      
      if (playingAudio) {
        playingAudio.pause();
        setPlayingAudio(null);
      }
      
      const audio = new Audio(audioUrl);
      
      // Add error handling for audio playback
      audio.addEventListener('error', (e) => {
        console.error('Audio playback error:', e);
        setError('Audio playback failed. Your browser may not support this audio format.');
        URL.revokeObjectURL(audioUrl);
        setPlayingAudio(null);
      });
      
      // Clean up URL after playing
      audio.addEventListener('ended', () => {
        URL.revokeObjectURL(audioUrl);
        setPlayingAudio(null);
      });
      
      setPlayingAudio(audio);
      
      // Attempt to play the audio
      audio.play().catch(e => {
        console.error('Audio play failed:', e);
        setError('Failed to play audio. Please try again.');
        URL.revokeObjectURL(audioUrl);
        setPlayingAudio(null);
      });
      
    } catch (err) {
      console.error('Error testing voice:', err);
      
      // Handle different error types
      if (err.response?.status === 404) {
        setError('No voice model found. Please train your voice first by recording a sample above.');
        setHasTrainedVoice(false);
      } else if (err.response?.status === 503) {
        setError('TTS service is starting up. Please wait a moment and try again.');
      } else if (err.response?.data?.detail) {
        setError('Failed to test voice: ' + err.response.data.detail);
      } else {
        setError('Failed to test voice: ' + err.message);
      }
    } finally {
      setGenerating(prev => ({ ...prev, 'voiceTest': false }));
    }
  };


  return (
    <div className="audio-manager">
      <div className="header">
        <div className="header-content">
          <h2>🎙️ Voice Cloning Studio</h2>
          <p>Train your voice, test it, and generate audio for your blog posts</p>
        </div>
        <div className="voice-status">
          {hasTrainedVoice ? (
            <div className="status-indicator status-ready">
              ✅ Voice Trained
            </div>
          ) : (
            <div className="status-indicator status-pending">
              ⏳ No Voice Trained
            </div>
          )}
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Workflow Guide */}
      <div className="workflow-guide">
        <h3>🚀 Quick Start Guide</h3>
        <div className="workflow-steps">
          <div className={`workflow-step ${!hasTrainedVoice ? 'active' : 'completed'}`}>
            <div className="step-number">1</div>
            <div className="step-content">
              <h4>Record Your Voice</h4>
              <p>Record a sample of your voice speaking naturally</p>
            </div>
          </div>
          <div className={`workflow-step ${hasTrainedVoice && !recordedAudio ? 'active' : hasTrainedVoice ? 'completed' : ''}`}>
            <div className="step-number">2</div>
            <div className="step-content">
              <h4>Train Voice Model</h4>
              <p>Process your recording to create a voice model</p>
            </div>
          </div>
          <div className={`workflow-step ${hasTrainedVoice ? 'active' : ''}`}>
            <div className="step-number">3</div>
            <div className="step-content">
              <h4>Test & Generate</h4>
              <p>Test your voice and generate blog post audio</p>
            </div>
          </div>
        </div>
      </div>

      {/* Voice Status & Management */}
      <div className="voice-management">
        <h3>🎤 Your Voice Model</h3>
        
        {hasTrainedVoice ? (
          <div className="voice-trained">
            <div className="voice-status-card">
              <div className="status-icon">✅</div>
              <div className="status-content">
                <h4>Voice Model Ready</h4>
                <p>Your voice has been trained and is ready to use for blog posts</p>
                {voiceInfo && (
                  <div className="voice-details">
                    <span>📊 Duration: {voiceInfo.duration}</span>
                    <span>🎯 Quality: {voiceInfo.quality_score}</span>
                    <span>📅 Trained: {new Date(voiceInfo.trained_at).toLocaleDateString()}</span>
                    <span>🔊 Sample Rate: {voiceInfo.sample_rate}</span>
                    <span>📁 Size: {voiceInfo.file_size}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="voice-actions" style={{display: 'flex', gap: '10px', marginTop: '15px'}}>
              <button
                onClick={() => setShowRetraining(!showRetraining)}
                className="retrain-btn"
                style={{flex: 1}}
              >
                🔄 Re-train Voice Model
              </button>
              <button
                onClick={() => deleteVoice('MyVoice')}
                style={{padding: '10px 20px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px'}}
                title="Delete current voice model"
              >
                🗑️ Delete Voice
              </button>
            </div>

            {/* Voice Tweaking Controls */}
            <div className="voice-tweaking">
              <h4>🎛️ Voice Settings</h4>
              <p>Adjust these settings to fine-tune how your voice sounds</p>
              
              <div className="settings-grid">
                <div className="setting-control">
                  <label>Speed: {voiceSettings.speed.toFixed(2)}</label>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={voiceSettings.speed}
                    onChange={(e) => setVoiceSettings(prev => ({...prev, speed: parseFloat(e.target.value)}))}
                    className="setting-slider"
                  />
                  <small>How fast your voice speaks</small>
                </div>

                <div className="setting-control">
                  <label>Voice Variation: {voiceSettings.temperature.toFixed(2)}</label>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={voiceSettings.temperature}
                    onChange={(e) => setVoiceSettings(prev => ({...prev, temperature: parseFloat(e.target.value)}))}
                    className="setting-slider"
                  />
                  <small>Higher = more expressive, Lower = more consistent</small>
                </div>

                <div className="setting-control">
                  <label>Speech Flow: {voiceSettings.length_penalty.toFixed(2)}</label>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={voiceSettings.length_penalty}
                    onChange={(e) => setVoiceSettings(prev => ({...prev, length_penalty: parseFloat(e.target.value)}))}
                    className="setting-slider"
                  />
                  <small>Controls speech rhythm and pacing</small>
                </div>

                <div className="setting-control">
                  <label>Repetition Control: {voiceSettings.repetition_penalty.toFixed(1)}</label>
                  <input
                    type="range"
                    min="1.0"
                    max="10.0"
                    step="0.5"
                    value={voiceSettings.repetition_penalty}
                    onChange={(e) => setVoiceSettings(prev => ({...prev, repetition_penalty: parseFloat(e.target.value)}))}
                    className="setting-slider"
                  />
                  <small>Prevents repetitive speech patterns</small>
                </div>

                <div className="setting-control">
                  <label>Voice Quality: {voiceSettings.top_k}</label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={voiceSettings.top_k}
                    onChange={(e) => setVoiceSettings(prev => ({...prev, top_k: parseInt(e.target.value)}))}
                    className="setting-slider"
                  />
                  <small>Higher = more natural, Lower = more controlled</small>
                </div>

                <div className="setting-control">
                  <label>Voice Precision: {voiceSettings.top_p.toFixed(2)}</label>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={voiceSettings.top_p}
                    onChange={(e) => setVoiceSettings(prev => ({...prev, top_p: parseFloat(e.target.value)}))}
                    className="setting-slider"
                  />
                  <small>Fine-tunes voice accuracy</small>
                </div>
              </div>

              {/* Voice Gender/Tone Controls */}
              <div style={{marginTop: '20px', padding: '15px', backgroundColor: '#f0f9ff', borderRadius: '8px', border: '1px solid #bfdbfe'}}>
                <h4 style={{margin: '0 0 15px 0', color: '#1e40af'}}>🎵 Voice Character Adjustment</h4>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px'}}>
                  <div className="setting-item">
                    <label>
                      Pitch Shift: {voiceSettings.pitch_shift > 0 ? '+' : ''}{voiceSettings.pitch_shift} semitones
                      <span style={{fontSize: '12px', color: '#666', marginLeft: '10px'}}>
                        {voiceSettings.pitch_shift < -3 ? '🔉 More Masculine' : 
                         voiceSettings.pitch_shift > 3 ? '🔊 More Feminine' : 
                         '🎯 Neutral'}
                      </span>
                    </label>
                    <input
                      type="range"
                      min="-12"
                      max="12"
                      step="0.5"
                      value={voiceSettings.pitch_shift}
                      onChange={(e) => setVoiceSettings({...voiceSettings, pitch_shift: parseFloat(e.target.value)})}
                      className="setting-slider"
                    />
                    <small>Negative = deeper/masculine, Positive = higher/feminine</small>
                  </div>
                  <div className="setting-item">
                    <label>
                      Formant Shift: {voiceSettings.formant_shift > 0 ? '+' : ''}{voiceSettings.formant_shift.toFixed(2)}
                      <span style={{fontSize: '12px', color: '#666', marginLeft: '10px'}}>
                        {voiceSettings.formant_shift < -0.3 ? '💪 Masculine Tone' : 
                         voiceSettings.formant_shift > 0.3 ? '✨ Feminine Tone' : 
                         '⚖️ Balanced'}
                      </span>
                    </label>
                    <input
                      type="range"
                      min="-1"
                      max="1"
                      step="0.05"
                      value={voiceSettings.formant_shift}
                      onChange={(e) => setVoiceSettings({...voiceSettings, formant_shift: parseFloat(e.target.value)})}
                      className="setting-slider"
                    />
                    <small>Adjusts voice resonance and timbre</small>
                  </div>
                </div>
                <div style={{marginTop: '15px', display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
                  <button
                    onClick={() => setVoiceSettings({...voiceSettings, pitch_shift: -4, formant_shift: -0.4})}
                    style={{padding: '6px 12px', fontSize: '13px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer'}}
                  >
                    💪 More Masculine
                  </button>
                  <button
                    onClick={() => setVoiceSettings({...voiceSettings, pitch_shift: 0, formant_shift: 0})}
                    style={{padding: '6px 12px', fontSize: '13px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer'}}
                  >
                    ⚖️ Reset to Natural
                  </button>
                  <button
                    onClick={() => setVoiceSettings({...voiceSettings, pitch_shift: 4, formant_shift: 0.4})}
                    style={{padding: '6px 12px', fontSize: '13px', backgroundColor: '#ec4899', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer'}}
                  >
                    ✨ More Feminine
                  </button>
                </div>
                <div style={{marginTop: '10px', padding: '10px', backgroundColor: '#fff', borderRadius: '6px', fontSize: '13px', color: '#374151'}}>
                  <strong>💡 Tip:</strong> If your voice sounds too feminine, try "More Masculine" preset. 
                  Adjust gradually and test to find your natural sound.
                </div>
              </div>

              <div className="preset-buttons">
                <button 
                  onClick={() => setVoiceSettings({
                    speed: 1.0, temperature: 0.75, length_penalty: 1.0, 
                    repetition_penalty: 5.0, top_k: 50, top_p: 0.85,
                    pitch_shift: 0.0, formant_shift: 0.0
                  })}
                  className="preset-btn"
                >
                  🎯 Default
                </button>
                <button 
                  onClick={() => setVoiceSettings({
                    speed: 0.95, temperature: 0.70, length_penalty: 1.1, 
                    repetition_penalty: 6.5, top_k: 45, top_p: 0.82,
                    pitch_shift: 0.0, formant_shift: 0.0
                  })}
                  className="preset-btn"
                  title="Best for blog posts - clear and natural"
                >
                  📚 Blog Reading (Recommended)
                </button>
                <button 
                  onClick={() => setVoiceSettings({
                    speed: 1.05, temperature: 0.80, length_penalty: 0.95, 
                    repetition_penalty: 5.5, top_k: 55, top_p: 0.87,
                    pitch_shift: 0.0, formant_shift: 0.0
                  })}
                  className="preset-btn"
                  title="Natural conversational tone"
                >
                  💬 Conversational
                </button>
                <button 
                  onClick={() => setVoiceSettings({
                    speed: 0.90, temperature: 0.65, length_penalty: 1.2, 
                    repetition_penalty: 7.0, top_k: 40, top_p: 0.78,
                    pitch_shift: 0.0, formant_shift: 0.0
                  })}
                  className="preset-btn"
                  title="Professional and deliberate"
                >
                  🎓 Professional
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="voice-not-trained">
            <div className="voice-status-card">
              <div className="status-icon">❌</div>
              <div className="status-content">
                <h4>No Voice Model Found</h4>
                <p>You need to train your voice model first</p>
              </div>
            </div>
            
            <button
              onClick={() => setShowRetraining(true)}
              className="train-btn-large"
            >
              🎤 Train Your Voice Model
            </button>
          </div>
        )}

        {/* Voice Training/Retraining Section */}
        {showRetraining && (
          <div className="voice-training-section" style={{backgroundColor: '#f9fafb', padding: '20px', borderRadius: '12px', border: '2px solid #e5e7eb'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
              <h3 style={{margin: 0}}>🎙️ Record Your Voice</h3>
              <button onClick={() => setShowRetraining(false)} style={{padding: '6px 12px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer'}}>✕ Close</button>
            </div>
            <p style={{color: '#6b7280', marginBottom: '20px'}}>For best results, record 3-5 minutes of natural speech. The longer and clearer your recording, the better your cloned voice will sound!</p>
            
            <div className="recording-controls">
              {!isRecording ? (
                <button 
                  onClick={startRecording}
                  className="record-btn-large"
                >
                  🎤 Start Recording
                </button>
              ) : (
                <button 
                  onClick={stopRecording}
                  className="stop-btn-large"
                >
                  ⏹️ Stop Recording
                </button>
              )}
            </div>
            
            {isRecording && (
              <div style={{backgroundColor: '#fef2f2', border: '2px solid #fca5a5', borderRadius: '8px', padding: '20px', marginTop: '15px'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px'}}>
                  <div style={{width: '12px', height: '12px', backgroundColor: '#ef4444', borderRadius: '50%', animation: 'pulse 1.5s infinite'}}></div>
                  <strong style={{fontSize: '18px'}}>Recording: {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}</strong>
                  <span style={{marginLeft: 'auto', fontSize: '14px', color: '#991b1b'}}>
                    {recordingDuration < 30 && '⚠️ Keep going! (30s minimum)'}
                    {recordingDuration >= 30 && recordingDuration < 180 && '✓ Good! (3min recommended)'}
                    {recordingDuration >= 180 && '✨ Excellent length!'}
                  </span>
                </div>
                <div style={{backgroundColor: 'white', padding: '15px', borderRadius: '6px', fontSize: '15px', lineHeight: '1.8'}}>
                  <strong style={{display: 'block', marginBottom: '10px', color: '#1f2937'}}>📖 Read this sample text naturally:</strong>
                  <p style={{margin: '10px 0'}}>"Welcome to my blog. I'm excited to share my insights on technology, innovation, and the future of AI. When I first started exploring artificial intelligence, I never imagined how transformative it would become."</p>
                  <p style={{margin: '10px 0'}}>"Today, we're seeing AI tools that enhance human creativity rather than replace it. Voice cloning is a perfect example - it allows creators to scale their content while maintaining their personal touch and authentic voice."</p>
                  <p style={{margin: '10px 0'}}>"The key to quality voice cloning is providing clear, varied speech samples. That's why I'm taking the time to record this properly. The better the input, the more natural the output will sound."</p>
                  <p style={{margin: '10px 0'}}>"I believe technology should empower people, not intimidate them. Whether you're a developer, entrepreneur, or creative professional, there's never been a better time to experiment with these tools and see what's possible."</p>
                  <p style={{margin: '10px 0', fontStyle: 'italic', color: '#6b7280'}}>Continue speaking naturally about your interests, experiences, or read from your blog posts...</p>
                </div>
              </div>
            )}

            {recordedAudio && (
              <div style={{backgroundColor: '#ecfdf5', border: '2px solid #6ee7b7', borderRadius: '8px', padding: '20px', marginTop: '15px'}}>
                <div style={{marginBottom: '15px'}}>
                  <strong style={{fontSize: '16px', color: '#065f46'}}>✅ Recording Complete!</strong>
                  <p style={{margin: '5px 0', color: '#047857'}}>Duration: {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}</p>
                  {recordingDuration < 30 && (
                    <p style={{color: '#dc2626', fontSize: '14px', marginTop: '10px'}}>⚠️ Recording is very short. Consider re-recording for 3-5 minutes for better quality.</p>
                  )}
                  {recordingDuration >= 30 && recordingDuration < 180 && (
                    <p style={{color: '#2563eb', fontSize: '14px', marginTop: '10px'}}>💡 Good length! For even better quality, try recording 3-5 minutes.</p>
                  )}
                  {recordingDuration >= 180 && (
                    <p style={{color: '#059669', fontSize: '14px', marginTop: '10px'}}>✨ Excellent! This length should produce high-quality voice cloning.</p>
                  )}
                </div>
                <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
                  <button 
                    onClick={playRecordedAudio}
                    style={{padding: '10px 20px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '15px'}}
                  >
                    ▶️ Listen to Recording
                  </button>
                  <button
                    onClick={uploadVoiceSamples}
                    disabled={generating.training}
                    style={{padding: '10px 20px', backgroundColor: generating.training ? '#9ca3af' : '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: generating.training ? 'not-allowed' : 'pointer', fontSize: '15px', fontWeight: '600'}}
                  >
                    {generating.training ? '🔄 Training Voice Model...' : '🚀 Train Voice Model'}
                  </button>
                  <button
                    onClick={() => {setRecordedAudio(null); setRecordingDuration(0);}}
                    style={{padding: '10px 20px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '15px'}}
                  >
                    🗑️ Discard & Re-record
                  </button>
                </div>
                {generating.training && trainingProgress > 0 && (
                  <div style={{marginTop: '15px'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '5px'}}>
                      <span style={{fontSize: '14px', fontWeight: '600'}}>Training Progress:</span>
                      <span style={{fontSize: '14px', fontWeight: '600'}}>{trainingProgress}%</span>
                    </div>
                    <div style={{width: '100%', height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden'}}>
                      <div style={{width: `${trainingProgress}%`, height: '100%', backgroundColor: '#10b981', transition: 'width 0.3s ease'}}></div>
                    </div>
                    <p style={{fontSize: '13px', color: '#6b7280', marginTop: '8px', textAlign: 'center'}}>
                      {trainingProgress < 30 && '📤 Uploading audio...'}
                      {trainingProgress >= 30 && trainingProgress < 60 && '🧠 Analyzing voice patterns...'}
                      {trainingProgress >= 60 && trainingProgress < 90 && '🎵 Computing voice embeddings...'}
                      {trainingProgress >= 90 && '✨ Finalizing voice model...'}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="voice-tips">
              <h4>📝 Recording Tips:</h4>
              <ul>
                <li>Find a quiet place with minimal background noise</li>
                <li>Speak clearly and naturally</li>
                <li>Record 30-60 seconds for best results</li>
                <li>Use your normal speaking voice</li>
              </ul>
            </div>
            
            <button
              onClick={() => setShowRetraining(false)}
              className="cancel-btn"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Voice Recordings Library */}
      {recordings.length > 0 && (
        <div className="voice-recordings-library" style={{marginBottom: '30px'}}>
          <h3>🎙️ Your Voice Recordings</h3>
          <p>All your recorded voice samples used for training</p>
          
          <div className="recordings-list">
            {recordings.map((recording, index) => (
              <div 
                key={index} 
                className={`recording-card ${recording.is_active ? 'active' : ''}`}
                style={{
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  padding: '15px',
                  marginBottom: '10px',
                  backgroundColor: recording.is_active ? '#f0f9ff' : '#fff',
                  borderLeft: recording.is_active ? '4px solid #3b82f6' : '4px solid transparent'
                }}
              >
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <div style={{flex: 1}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px'}}>
                      <h4 style={{margin: 0, fontSize: '16px', fontWeight: '600'}}>
                        {recording.name}
                      </h4>
                      {recording.is_active && (
                        <span style={{
                          backgroundColor: '#10b981',
                          color: 'white',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: '600'
                        }}>
                          ACTIVE
                        </span>
                      )}
                      {recording.has_model && !recording.is_active && (
                        <span style={{
                          backgroundColor: '#6b7280',
                          color: 'white',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '11px'
                        }}>
                          TRAINED
                        </span>
                      )}
                    </div>
                    <div style={{display: 'flex', gap: '20px', fontSize: '14px', color: '#666'}}>
                      <span>⏱️ Duration: <strong>{recording.duration_formatted}</strong> ({recording.duration}s)</span>
                      <span>📁 Size: <strong>{recording.size_mb} MB</strong></span>
                      <span>📅 {new Date(recording.created * 1000).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div style={{display: 'flex', gap: '10px'}}>
                    <button
                      onClick={() => playRecording(recording)}
                      disabled={playingRecording !== null}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: playingRecording ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        opacity: playingRecording ? 0.6 : 1
                      }}
                    >
                      {playingRecording ? '▶️ Playing...' : '▶️ Listen'}
                    </button>
                    {playingRecording && (
                      <button
                        onClick={stopPlayingRecording}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        ⏹️ Stop
                      </button>
                    )}
                  </div>
                </div>
                {recording.duration < 30 && (
                  <div style={{
                    marginTop: '10px',
                    padding: '8px 12px',
                    backgroundColor: '#fef3c7',
                    borderRadius: '6px',
                    fontSize: '13px',
                    color: '#92400e'
                  }}>
                    ⚠️ Recording is short ({recording.duration}s). For better quality, record 3-5 minutes.
                  </div>
                )}
                {recording.duration >= 30 && recording.duration < 120 && (
                  <div style={{
                    marginTop: '10px',
                    padding: '8px 12px',
                    backgroundColor: '#dbeafe',
                    borderRadius: '6px',
                    fontSize: '13px',
                    color: '#1e40af'
                  }}>
                    💡 Good length! For even better quality, try recording 3-5 minutes.
                  </div>
                )}
                {recording.duration >= 180 && (
                  <div style={{
                    marginTop: '10px',
                    padding: '8px 12px',
                    backgroundColor: '#d1fae5',
                    borderRadius: '6px',
                    fontSize: '13px',
                    color: '#065f46'
                  }}>
                    ✨ Excellent length! This should produce high-quality voice cloning.
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div style={{
            marginTop: '15px',
            padding: '12px',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            fontSize: '13px',
            color: '#374151'
          }}>
            <strong>💡 Tip:</strong> The active recording is currently being used for voice generation. 
            To use a different recording, re-train your voice model with a new sample.
          </div>
        </div>
      )}

      {/* Voice Testing Section */}
      <div className="voice-testing">
        <h3>🎯 Test Your Voice</h3>
        <p>Test how your trained voice sounds with custom text</p>
        
        <div className="test-voice-section">
          <div className="test-input">
            <label htmlFor="customTestText">Enter text to test:</label>
            <textarea
              id="customTestText"
              value={customTestText}
              onChange={(e) => {
                const text = e.target.value;
                setCustomTestText(text);
                // Rough estimate: ~400 tokens = ~300 words = ~1500 characters
                if (text.length > 1500) {
                  setTextLengthWarning('⚠️ Text is too long (max ~300 words). Audio may be truncated.');
                } else if (text.length > 1000) {
                  setTextLengthWarning('⚡ Text is getting long. Consider shortening for best results.');
                } else {
                  setTextLengthWarning('');
                }
              }}
              placeholder="Enter any text to hear how it sounds with your voice..."
              rows={3}
              className="test-text-input"
              maxLength={2000}
            />
            <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '5px', fontSize: '12px'}}>
              <span style={{color: customTestText.length > 1500 ? '#ff6b6b' : '#888'}}>
                {customTestText.length} / 2000 characters (~{Math.floor(customTestText.length / 5)} words)
              </span>
              {textLengthWarning && (
                <span style={{color: customTestText.length > 1500 ? '#ff6b6b' : '#ffa500'}}>
                  {textLengthWarning}
                </span>
              )}
            </div>
          </div>
          
          <div className="test-controls">
            <button
              onClick={testCustomVoice}
              disabled={generating.voiceTest || !customTestText.trim() || !hasTrainedVoice}
              className="test-voice-btn"
              title={!hasTrainedVoice ? 'Please train your voice first' : ''}
            >
              {generating.voiceTest ? '🔄 Generating...' : '🎵 Test My Voice'}
            </button>
            {!hasTrainedVoice && (
              <p className="warning-text" style={{color: '#ff6b6b', marginTop: '10px'}}>
                ⚠️ Train your voice first to test
              </p>
            )}
          </div>
          
          <div className="test-tips">
            <h4>💡 Testing Tips:</h4>
            <ul>
              <li>Make sure you've trained your voice first</li>
              <li>Try different types of sentences to test voice quality</li>
              <li>This is how your blog posts will sound</li>
            </ul>
          </div>
        </div>
      </div>


    </div>
  );
};

export default AudioManager;
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Volume2, 
  VolumeX, 
  Loader, 
  AlertCircle, 
  CheckCircle,
  Play,
  Pause,
  RefreshCw
} from 'lucide-react';
import './VoiceAudioGenerator.css';

const VoiceAudioGenerator = ({ postId, postTitle, onAudioGenerated }) => {
  const [hasTrainedVoice, setHasTrainedVoice] = useState(false);
  const [audioStatus, setAudioStatus] = useState('not_generated'); // not_generated, generating, ready, failed
  const [audioUrl, setAudioUrl] = useState('');
  const [error, setError] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudio, setCurrentAudio] = useState(null);
  const [checkingVoice, setCheckingVoice] = useState(true);

  const REACT_APP_API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';
  const TTS_SERVICE_URL = 'http://127.0.0.1:8001';

  useEffect(() => {
    checkTrainedVoice();
    if (postId) {
      checkAudioStatus();
    }
  }, [postId]);

  const checkTrainedVoice = async () => {
    try {
      setCheckingVoice(true);
      const response = await axios.get(`${TTS_SERVICE_URL}/voices`);
      const voices = response.data.voices || [];
      setHasTrainedVoice(voices.length > 0);
    } catch (err) {
      console.error('Failed to check trained voices:', err);
      setHasTrainedVoice(false);
    } finally {
      setCheckingVoice(false);
    }
  };

  const checkAudioStatus = async () => {
    if (!postId) return;
    
    try {
      const response = await axios.get(`${REACT_APP_API_URL}/admin/posts/${postId}/audio-status`);
      const status = response.data.status;
      setAudioStatus(status);
      
      if (status === 'ready' && response.data.audioUrl) {
        setAudioUrl(response.data.audioUrl);
      }
    } catch (err) {
      console.error('Error checking audio status:', err);
      setAudioStatus('not_generated');
    }
  };

  const generateAudio = async () => {
    if (!postId) {
      setError('Post must be saved before generating audio');
      return;
    }

    if (!hasTrainedVoice) {
      setError('Please train your voice first in the Audio Manager');
      return;
    }

    try {
      setIsGenerating(true);
      setError('');
      setAudioStatus('generating');

      const response = await axios.post(`${REACT_APP_API_URL}/admin/posts/${postId}/generate-audio`);
      
      if (response.data.cached) {
        setAudioStatus('ready');
        setAudioUrl(response.data.audioUrl);
        if (onAudioGenerated) onAudioGenerated(response.data);
      } else {
        // Start polling for status
        pollForAudioStatus();
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message;
      setError('Failed to generate audio: ' + errorMessage);
      setAudioStatus('failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const pollForAudioStatus = () => {
    const checkStatus = async () => {
      try {
        const response = await axios.get(`${REACT_APP_API_URL}/admin/posts/${postId}/audio-status`);
        const status = response.data.status;
        setAudioStatus(status);
        
        if (status === 'ready') {
          setAudioUrl(response.data.audioUrl);
          if (onAudioGenerated) onAudioGenerated(response.data);
        } else if (status === 'failed') {
          setError('Audio generation failed');
        } else if (status === 'generating') {
          // Continue polling
          setTimeout(checkStatus, 3000);
        }
      } catch (err) {
        console.error('Error checking audio status:', err);
        setError('Failed to check audio status');
        setAudioStatus('failed');
      }
    };
    
    setTimeout(checkStatus, 3000);
  };

  const playAudio = () => {
    if (!audioUrl) return;

    if (currentAudio) {
      currentAudio.pause();
      setCurrentAudio(null);
      setIsPlaying(false);
    }

    const audio = new Audio(`${REACT_APP_API_URL}${audioUrl}`);
    
    audio.addEventListener('play', () => setIsPlaying(true));
    audio.addEventListener('pause', () => setIsPlaying(false));
    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      setCurrentAudio(null);
    });
    audio.addEventListener('error', (e) => {
      console.error('Audio playback error:', e);
      setError('Audio playback failed');
      setIsPlaying(false);
      setCurrentAudio(null);
    });

    setCurrentAudio(audio);
    audio.play().catch(e => {
      console.error('Audio play failed:', e);
      setError('Failed to play audio');
      setIsPlaying(false);
      setCurrentAudio(null);
    });
  };

  const pauseAudio = () => {
    if (currentAudio) {
      currentAudio.pause();
    }
  };

  const retryGeneration = () => {
    setError('');
    setAudioStatus('not_generated');
    generateAudio();
  };

  if (checkingVoice) {
    return (
      <div className="voice-audio-generator checking">
        <Loader className="animate-spin" size={16} />
        <span>Checking voice status...</span>
      </div>
    );
  }

  if (!hasTrainedVoice) {
    return (
      <div className="voice-audio-generator no-voice">
        <div className="no-voice-message">
          <VolumeX size={20} />
          <span>No voice trained. Train your voice in Audio Manager to generate blog audio.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="voice-audio-generator">
      <div className="generator-header">
        <Volume2 size={20} />
        <h4>Blog Audio</h4>
      </div>

      {error && (
        <div className="error-message">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="audio-status">
        {audioStatus === 'not_generated' && (
          <div className="status-section">
            <p>Generate audio for this blog post using your trained voice</p>
            <button
              onClick={generateAudio}
              disabled={isGenerating || !postId}
              className="generate-btn"
            >
              {isGenerating ? (
                <>
                  <Loader className="animate-spin" size={16} />
                  Generating...
                </>
              ) : (
                <>
                  <Volume2 size={16} />
                  Generate Audio
                </>
              )}
            </button>
            {!postId && (
              <p className="help-text">Save the post first to generate audio</p>
            )}
          </div>
        )}

        {audioStatus === 'generating' && (
          <div className="status-section generating">
            <div className="status-indicator">
              <Loader className="animate-spin" size={20} />
              <span>Generating audio...</span>
            </div>
            <p>This may take a few minutes depending on post length</p>
          </div>
        )}

        {audioStatus === 'ready' && audioUrl && (
          <div className="status-section ready">
            <div className="audio-ready">
              <CheckCircle size={20} className="success-icon" />
              <span>Audio ready!</span>
            </div>
            <div className="audio-controls">
              {!isPlaying ? (
                <button onClick={playAudio} className="play-btn">
                  <Play size={16} />
                  Play Audio
                </button>
              ) : (
                <button onClick={pauseAudio} className="pause-btn">
                  <Pause size={16} />
                  Pause
                </button>
              )}
              <button onClick={retryGeneration} className="regenerate-btn">
                <RefreshCw size={16} />
                Regenerate
              </button>
            </div>
            <audio controls className="audio-player">
              <source src={`${REACT_APP_API_URL}${audioUrl}`} type="audio/mpeg" />
              <source src={`${REACT_APP_API_URL}${audioUrl}`} type="audio/wav" />
              Your browser does not support the audio element.
            </audio>
          </div>
        )}

        {audioStatus === 'failed' && (
          <div className="status-section failed">
            <div className="error-indicator">
              <AlertCircle size={20} />
              <span>Audio generation failed</span>
            </div>
            <button onClick={retryGeneration} className="retry-btn">
              <RefreshCw size={16} />
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceAudioGenerator;
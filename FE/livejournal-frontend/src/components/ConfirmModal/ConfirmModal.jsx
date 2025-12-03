import { useState, useRef, useEffect } from 'react';
import { X, AlertTriangle, Info, CheckCircle, HelpCircle } from 'lucide-react';
import './ConfirmModal.scss';

const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning', // 'warning', 'danger', 'info', 'success'
  confirmButtonStyle = 'primary' // 'primary', 'danger', 'success'
}) => {
  const [isDisintegrating, setIsDisintegrating] = useState(false);
  const modalRef = useRef(null);
  const audioRef = useRef(null);

  // Initialize audio context for Thanos snap sound
  useEffect(() => {
    if (isOpen) {
      // Create audio element for the snap/disintegration sound
      audioRef.current = new Audio();
      audioRef.current.volume = 0.5; // Set volume to 50%
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'warning':
        return <AlertTriangle size={48} />;
      case 'danger':
        return <AlertTriangle size={48} />;
      case 'info':
        return <Info size={48} />;
      case 'success':
        return <CheckCircle size={48} />;
      default:
        return <HelpCircle size={48} />;
    }
  };

  // Generate Thanos snap sound using Web Audio API
  const playDisintegrationSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();

      // Create multiple oscillators for a complex sound
      const createSnapSound = () => {
        // Sharp snap sound
        const snapOsc = audioContext.createOscillator();
        const snapGain = audioContext.createGain();

        snapOsc.type = 'sine';
        snapOsc.frequency.setValueAtTime(800, audioContext.currentTime);
        snapOsc.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.1);

        snapGain.gain.setValueAtTime(0.3, audioContext.currentTime);
        snapGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

        snapOsc.connect(snapGain);
        snapGain.connect(audioContext.destination);

        snapOsc.start(audioContext.currentTime);
        snapOsc.stop(audioContext.currentTime + 0.1);
      };

      // Dust/wind sound
      const createDustSound = () => {
        const noiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate * 1.5, audioContext.sampleRate);
        const output = noiseBuffer.getChannelData(0);

        for (let i = 0; i < noiseBuffer.length; i++) {
          output[i] = Math.random() * 2 - 1;
        }

        const noiseSource = audioContext.createBufferSource();
        noiseSource.buffer = noiseBuffer;

        const noiseFilter = audioContext.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.setValueAtTime(200, audioContext.currentTime);
        noiseFilter.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 1.5);

        const noiseGain = audioContext.createGain();
        noiseGain.gain.setValueAtTime(0, audioContext.currentTime);
        noiseGain.gain.linearRampToValueAtTime(0.15, audioContext.currentTime + 0.1);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1.5);

        noiseSource.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(audioContext.destination);

        noiseSource.start(audioContext.currentTime);
        noiseSource.stop(audioContext.currentTime + 1.5);
      };

      // Low rumble
      const createRumbleSound = () => {
        const rumbleOsc = audioContext.createOscillator();
        const rumbleGain = audioContext.createGain();

        rumbleOsc.type = 'sine';
        rumbleOsc.frequency.setValueAtTime(40, audioContext.currentTime);
        rumbleOsc.frequency.exponentialRampToValueAtTime(20, audioContext.currentTime + 1.5);

        rumbleGain.gain.setValueAtTime(0, audioContext.currentTime);
        rumbleGain.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.2);
        rumbleGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1.5);

        rumbleOsc.connect(rumbleGain);
        rumbleGain.connect(audioContext.destination);

        rumbleOsc.start(audioContext.currentTime);
        rumbleOsc.stop(audioContext.currentTime + 1.5);
      };

      // Play all sounds together
      createSnapSound();
      createDustSound();
      createRumbleSound();

    } catch (error) {
      console.error('Error playing disintegration sound:', error);
    }
  };

  const createDustParticles = () => {
    if (!modalRef.current) return;

    const rect = modalRef.current.getBoundingClientRect();
    const particleCount = 30;

    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'dust-particle';

      // Random position within modal bounds
      const x = rect.left + Math.random() * rect.width;
      const y = rect.top + Math.random() * rect.height;

      // Random size
      const size = Math.random() * 8 + 4;

      // Random direction
      const tx = (Math.random() - 0.5) * 200;
      const ty = Math.random() * 150 + 50;

      particle.style.left = `${x}px`;
      particle.style.top = `${y}px`;
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      particle.style.setProperty('--tx', `${tx}px`);
      particle.style.setProperty('--ty', `${ty}px`);

      document.body.appendChild(particle);

      // Remove particle after animation
      setTimeout(() => {
        particle.remove();
      }, 1500);
    }
  };

  const handleConfirm = () => {
    // Only trigger disintegration for danger/delete actions
    if (confirmButtonStyle === 'danger' || type === 'danger') {
      setIsDisintegrating(true);

      // Play the disintegration sound
      playDisintegrationSound();

      createDustParticles();

      // Wait for animation to complete before executing callback
      setTimeout(() => {
        onConfirm?.();
        onClose();
        setIsDisintegrating(false);
      }, 1500);
    } else {
      // For non-danger actions, execute immediately
      onConfirm?.();
      onClose();
    }
  };

  return (
    <div
      className={`confirm-modal-overlay ${isDisintegrating ? 'disintegrating' : ''}`}
      onClick={isDisintegrating ? undefined : onClose}
    >
      <div
        ref={modalRef}
        className={`confirm-modal ${isDisintegrating ? 'disintegrating' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="close-btn"
          onClick={onClose}
          disabled={isDisintegrating}
        >
          <X size={24} />
        </button>

        <div className={`modal-icon ${type}`}>
          {getIcon()}
        </div>

        <div className="modal-content">
          <h2>{title}</h2>
          <p>{message}</p>
        </div>

        <div className="modal-actions">
          <button
            className="cancel-btn"
            onClick={onClose}
            disabled={isDisintegrating}
          >
            {cancelText}
          </button>
          <button
            className={`confirm-btn ${confirmButtonStyle}`}
            onClick={handleConfirm}
            disabled={isDisintegrating}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;

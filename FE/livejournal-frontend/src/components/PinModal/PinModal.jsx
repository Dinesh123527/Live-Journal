import { useState, useEffect, useRef } from 'react';
import { Lock, X, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import Cookies from 'js-cookie';
import './PinModal.scss';

const PinModal = ({ isOpen, onClose, onSuccess, mode = 'verify' }) => {
  const [pin, setPin] = useState(['', '', '', '']);
  const [confirmPin, setConfirmPin] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isSetupMode, setIsSetupMode] = useState(mode === 'setup');
  const [step, setStep] = useState(1); // 1: enter pin, 2: confirm pin (setup mode only)

  const inputRefs = useRef([]);
  const confirmInputRefs = useRef([]);

  const getUserPinKey = () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user && user.id) {
          return `journalPin_${user.id}`;
        }
      } catch (e) {
        console.error('Error parsing user from localStorage:', e);
      }
    }

    // Fallback: try to decode userId from access token
    const token = Cookies.get('accessToken');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload && payload.userId) {
          return `journalPin_${payload.userId}`;
        }
      } catch (e) {
        console.error('Error decoding token:', e);
      }
    }

    console.error('No user ID found');
    return null;
  };

  useEffect(() => {
    if (isOpen && inputRefs.current[0]) {
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens
      const resetState = () => {
        setPin(['', '', '', '']);
        setConfirmPin(['', '', '', '']);
        setError('');
        setSuccess('');
        setStep(1);

        // Check if PIN exists and determine mode
        const pinKey = getUserPinKey();
        if (!pinKey) {
          setError('User session not found. Please log in again.');
          return;
        }

        const storedPin = localStorage.getItem(pinKey);
        if (!storedPin) {
          // No PIN set - force setup mode
          setIsSetupMode(true);
        } else {
          // PIN exists - use the mode passed from parent or default to verify
          setIsSetupMode(mode === 'setup');
        }
      };
      resetState();
    }
  }, [isOpen, mode]);

  const handlePinChange = (index, value, isConfirm = false) => {
    const targetPin = isConfirm ? confirmPin : pin;
    const setTargetPin = isConfirm ? setConfirmPin : setPin;
    const refs = isConfirm ? confirmInputRefs : inputRefs;

    // Only allow numbers
    if (value && !/^\d$/.test(value)) return;

    const newPin = [...targetPin];
    newPin[index] = value;
    setTargetPin(newPin);
    setError('');

    // Auto-focus next input
    if (value && index < 3) {
      refs.current[index + 1]?.focus();
    }

    // Auto-submit when all fields are filled
    if (value && index === 3 && newPin.every(digit => digit !== '')) {
      if (isSetupMode) {
        if (!isConfirm) {
          // First step in setup - move to confirm
          setTimeout(() => {
            setStep(2);
            confirmInputRefs.current[0]?.focus();
          }, 100);
        } else {
          // Second step - verify match
          handleSetupSubmit(pin, newPin);
        }
      } else {
        // Verify mode - submit immediately
        handleVerifySubmit(newPin);
      }
    }
  };

  const handleKeyDown = (index, e, isConfirm = false) => {
    const refs = isConfirm ? confirmInputRefs : inputRefs;
    const targetPin = isConfirm ? confirmPin : pin;

    if (e.key === 'Backspace' && !targetPin[index] && index > 0) {
      refs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      refs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 3) {
      refs.current[index + 1]?.focus();
    } else if (e.key === 'Enter') {
      if (isSetupMode) {
        if (!isConfirm && pin.every(digit => digit !== '')) {
          setStep(2);
          confirmInputRefs.current[0]?.focus();
        } else if (isConfirm && confirmPin.every(digit => digit !== '')) {
          handleSetupSubmit(pin, confirmPin);
        }
      } else if (targetPin.every(digit => digit !== '')) {
        handleVerifySubmit(targetPin);
      }
    }
  };

  const handlePaste = (e, isConfirm = false) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    const setTargetPin = isConfirm ? setConfirmPin : setPin;
    const refs = isConfirm ? confirmInputRefs : inputRefs;

    if (pastedData.length === 4) {
      setTargetPin(pastedData.split(''));
      refs.current[3]?.focus();
    }
  };

  const handleVerifySubmit = async (pinArray) => {
    const pinValue = pinArray.join('');

    // Get stored PIN from localStorage with user-specific key
    const pinKey = getUserPinKey();
    if (!pinKey) {
      setError('User session not found. Please log in again.');
      return;
    }

    const storedPin = localStorage.getItem(pinKey);

    if (!storedPin) {
      setError('No PIN set. Please set up your PIN first.');
      setIsSetupMode(true);
      setStep(1);
      return;
    }

    if (pinValue === storedPin) {
      setSuccess('✓ Unlocked');
      setTimeout(() => {
        // Store unlock status in session
        sessionStorage.setItem('privateUnlocked', 'true');
        sessionStorage.setItem('privateUnlockedAt', Date.now().toString());
        onSuccess?.();
        onClose();
      }, 500);
    } else {
      setError('Incorrect PIN. Try again.');
      setPin(['', '', '', '']);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  };

  const handleSetupSubmit = async (pinArray, confirmPinArray) => {
    const pinValue = pinArray.join('');
    const confirmValue = confirmPinArray.join('');

    if (pinValue !== confirmValue) {
      setError('PINs do not match. Please try again.');
      setStep(1);
      setPin(['', '', '', '']);
      setConfirmPin(['', '', '', '']);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
      return;
    }

    // Store PIN in localStorage with user-specific key
    const pinKey = getUserPinKey();
    if (!pinKey) {
      setError('User session not found. Please log in again.');
      return;
    }

    localStorage.setItem(pinKey, pinValue);

    setSuccess('✓ PIN created successfully');
    setTimeout(() => {
      sessionStorage.setItem('privateUnlocked', 'true');
      sessionStorage.setItem('privateUnlockedAt', Date.now().toString());
      onSuccess?.();
      onClose();
    }, 800);
  };

  const handleBackToEnter = () => {
    setStep(1);
    setConfirmPin(['', '', '', '']);
    setError('');
    setTimeout(() => inputRefs.current[0]?.focus(), 100);
  };

  if (!isOpen) return null;

  return (
    <div className="pin-modal-overlay" onClick={onClose}>
      <div className="pin-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>
          <X size={24} />
        </button>

        <div className="pin-modal-header">
          <div className="lock-icon">
            <Lock size={48} />
          </div>
          <h2>
            {isSetupMode
              ? (step === 1 ? 'Set a New PIN' : 'Confirm Your PIN')
              : 'Enter Your PIN'}
          </h2>
          <p>
            {isSetupMode
              ? (step === 1
                  ? 'Set up a 4-digit PIN to protect your private entries'
                  : 'Re-enter your PIN to confirm')
              : 'Enter your 4-digit PIN to view private entries'}
          </p>
        </div>

        {error && (
          <div className="pin-alert error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="pin-alert success">
            <CheckCircle size={18} />
            <span>{success}</span>
          </div>
        )}

        {/* PIN Input for Enter/Setup Step 1 */}
        {(!isSetupMode || step === 1) && (
          <div className="pin-input-group">
            {pin.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handlePinChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={(e) => handlePaste(e)}
                className="pin-input"
                autoComplete="off"
              />
            ))}
          </div>
        )}

        {/* Confirm PIN Input for Setup Step 2 */}
        {isSetupMode && step === 2 && (
          <div className="pin-input-group">
            {confirmPin.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (confirmInputRefs.current[index] = el)}
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handlePinChange(index, e.target.value, true)}
                onKeyDown={(e) => handleKeyDown(index, e, true)}
                onPaste={(e) => handlePaste(e, true)}
                className="pin-input"
                autoComplete="off"
              />
            ))}
          </div>
        )}

        <div className="pin-actions">
          <button
            className="show-pin-btn"
            onClick={() => setShowPin(!showPin)}
          >
            {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
            <span>{showPin ? 'Hide' : 'Show'} PIN</span>
          </button>

          {isSetupMode && step === 2 && (
            <button className="back-btn" onClick={handleBackToEnter}>
              ← Back
            </button>
          )}
        </div>

        {!isSetupMode && (
          <div className="pin-footer">
            <p>
              Forgot your PIN?{' '}
              <button
                className="reset-link"
                onClick={() => {
                  if (window.confirm('This will remove your PIN protection. Continue?')) {
                    const pinKey = getUserPinKey();
                    if (pinKey) {
                      localStorage.removeItem(pinKey);
                    }
                    setIsSetupMode(true);
                    setStep(1);
                    setPin(['', '', '', '']);
                    setError('');
                  }
                }}
              >
                Reset PIN
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PinModal;


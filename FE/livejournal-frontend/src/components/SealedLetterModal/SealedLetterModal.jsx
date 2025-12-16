import { Calendar, Gift, Lock, Mail, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import './SealedLetterModal.scss';

const SealedLetterModal = ({ isOpen, onClose, letter }) => {
    const [timeRemaining, setTimeRemaining] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 });

    const calculateTimeRemaining = () => {
        if (!letter?.unlock_at) return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
        const unlockDate = new Date(letter.unlock_at);
        const now = new Date();
        const diffTime = unlockDate - now;

        if (diffTime <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };

        const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diffTime % (1000 * 60)) / 1000);

        return { days, hours, minutes, seconds, total: diffTime };
    };

    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
            setTimeRemaining(calculateTimeRemaining());
            const interval = setInterval(() => {
                setTimeRemaining(calculateTimeRemaining());
            }, 1000);
            return () => {
                document.removeEventListener('keydown', handleEscape);
                document.body.style.overflow = '';
                clearInterval(interval);
            };
        }
        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose, letter]);

    if (!isOpen || !letter) return null;

    // Format unlock date
    const formatUnlockDate = () => {
        if (!letter?.unlock_at) return '';
        const date = new Date(letter.unlock_at);
        return date.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    };

    // Get life event info
    const getLifeEventInfo = (event) => {
        const events = {
            'birthday': { icon: '🎂', label: 'Your Birthday' },
            'new_year': { icon: '🎆', label: 'New Year' },
            'graduation': { icon: '🎓', label: 'Graduation' },
            'got_job': { icon: '💼', label: 'Getting a Job' },
            'moved_city': { icon: '🏠', label: 'Moving City' },
            'got_married': { icon: '💒', label: 'Getting Married' },
            'had_baby': { icon: '👶', label: 'Having a Baby' },
            'milestone_entries': { icon: '📚', label: 'Entry Milestone' }
        };
        return events[event] || { icon: '🎁', label: event };
    };

    const { days, hours, minutes, seconds, total } = timeRemaining;
    const isDateBased = letter.unlock_type === 'date';

    return (
        <div className="sealed-letter-overlay" onClick={onClose}>
            <div className="sealed-letter-modal" onClick={(e) => e.stopPropagation()}>
                {/* Floating particles */}
                <div className="floating-particles">
                    <div className="particle"></div>
                    <div className="particle"></div>
                    <div className="particle"></div>
                    <div className="particle"></div>
                </div>

                {/* Close button */}
                <button className="modal-close-btn" onClick={onClose}>
                    <X size={20} />
                </button>

                {/* Envelope Icon */}
                <div className="envelope-container">
                    <Mail size={64} className="envelope-icon" />
                    <div className="wax-seal">
                        <Lock size={20} />
                    </div>
                    <div className="glow-ring"></div>
                </div>

                {/* Badge */}
                <div className="sealed-badge">
                    <Lock size={14} />
                    <span>Sealed Letter</span>
                </div>

                {/* Title */}
                <h2>✉️ Waiting to be Opened</h2>

                {/* Countdown or Life Event */}
                {isDateBased && total > 0 ? (
                    <div className="countdown-container">
                        <div className="countdown-box">
                            <span className="value">{days}</span>
                            <span className="label">{days === 1 ? 'Day' : 'Days'}</span>
                        </div>
                        <div className="countdown-box">
                            <span className="value">{hours}</span>
                            <span className="label">{hours === 1 ? 'Hour' : 'Hours'}</span>
                        </div>
                        <div className="countdown-box">
                            <span className="value">{minutes}</span>
                            <span className="label">{minutes === 1 ? 'Min' : 'Mins'}</span>
                        </div>
                        <div className="countdown-box">
                            <span className="value">{seconds}</span>
                            <span className="label">{seconds === 1 ? 'Sec' : 'Secs'}</span>
                        </div>
                    </div>
                ) : !isDateBased ? (
                    <div className="life-event-info">
                        <div className="event-icon">
                            {getLifeEventInfo(letter.life_event).icon}
                        </div>
                        <p>This letter opens when you experience:</p>
                        <h3>{getLifeEventInfo(letter.life_event).label}</h3>
                    </div>
                ) : null}

                {/* Message */}
                <div className="modal-message">
                    {isDateBased && (
                        <p className="date-text">
                            <Calendar size={14} />
                            Opens on {formatUnlockDate()}
                        </p>
                    )}
                    {!isDateBased && (
                        <p className="event-text">
                            <Gift size={14} />
                            Trigger this event when the time comes
                        </p>
                    )}
                    <p className="recipient-text">
                        Written to: {letter.recipient === 'future' ? '✨ Future You' : '💜 Past You'}
                    </p>
                </div>

                {/* Letter title preview */}
                {letter?.title && (
                    <div className="letter-title-preview">
                        <span>📝</span>
                        <span>{letter.title}</span>
                    </div>
                )}

                <button className="okay-btn" onClick={onClose}>
                    I'll Wait Patiently ✨
                </button>
            </div>
        </div>
    );
};

export default SealedLetterModal;

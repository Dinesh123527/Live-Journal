import { Package, X } from 'lucide-react';
import { useEffect } from 'react';
import './SealedCapsuleModal.scss';

const SealedCapsuleModal = ({ isOpen, onClose, capsule }) => {
    
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    // Calculate days remaining
    const getDaysRemaining = () => {
        if (!capsule?.unlock_at) return 0;
        const unlockDate = new Date(capsule.unlock_at);
        const now = new Date();
        const diffTime = unlockDate - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const daysRemaining = getDaysRemaining();

    // Format unlock date
    const formatUnlockDate = () => {
        if (!capsule?.unlock_at) return '';
        const date = new Date(capsule.unlock_at);
        return date.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    };

    return (
        <div className="sealed-modal-overlay" onClick={onClose}>
            <div className="sealed-modal" onClick={(e) => e.stopPropagation()}>
                {/* Close button */}
                <button className="modal-close-btn" onClick={onClose}>
                    <X size={20} />
                </button>

                {/* Capsule Icon - Breathing animation */}
                <div className="capsule-icon-container">
                    <Package size={56} className="capsule-icon" />
                    <div className="glow-ring"></div>
                </div>

                {/* Title */}
                <h2>🔒 Sealed Time Capsule</h2>

                {/* Message */}
                <div className="modal-message">
                    <p className="unlock-text">
                        {daysRemaining === 1
                            ? 'This entry will unlock tomorrow.'
                            : daysRemaining === 0
                                ? 'This entry unlocks today!'
                                : `This entry will unlock in ${daysRemaining} days.`}
                    </p>
                    <p className="date-text">
                        Opens on {formatUnlockDate()}
                    </p>
                    <p className="reassurance">
                        You wrote this for your future self.
                    </p>
                </div>

                {/* Capsule title if available */}
                {capsule?.title && (
                    <div className="capsule-title-preview">
                        <span>📝</span>
                        <span>{capsule.title}</span>
                    </div>
                )}

                <button className="okay-btn" onClick={onClose}>
                    Okay
                </button>
            </div>
        </div>
    );
};

export default SealedCapsuleModal;

import { AnimatePresence, motion } from 'framer-motion';
import { Calendar, Package, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import './UnlockedCapsuleModal.scss';

const UnlockedCapsuleModal = ({ isOpen, onClose, capsule, onDelete }) => {
    const [countdown, setCountdown] = useState(null);
    const [showDeleteWarning, setShowDeleteWarning] = useState(false);
    const AUTO_DELETE_SECONDS = 300; // 5 minutes

    // Start countdown when modal opens
    useEffect(() => {
        if (isOpen && capsule) {
            setCountdown(AUTO_DELETE_SECONDS);
            setShowDeleteWarning(false);
        }
        return () => {
            setCountdown(null);
        };
    }, [isOpen, capsule?.id]);

    // Countdown timer
    useEffect(() => {
        if (countdown === null || countdown <= 0) return;

        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    // Auto-delete when countdown reaches 0
                    if (onDelete && capsule) {
                        onDelete(capsule.id);
                    }
                    return 0;
                }
                // Show warning at 60 seconds
                if (prev === 60) {
                    setShowDeleteWarning(true);
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [countdown, onDelete, capsule]);

    if (!isOpen || !capsule) return null;

    // Format countdown time
    const formatCountdown = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Format date
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
    };

    return (
        <AnimatePresence>
            <motion.div
                className="unlocked-capsule-modal-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            >
                <motion.div
                    className="unlocked-capsule-modal"
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Close Button */}
                    <button className="close-btn" onClick={onClose}>
                        <X size={24} />
                    </button>

                    {/* Self-destruct countdown */}
                    {countdown !== null && countdown > 0 && (
                        <div className={`countdown-banner ${showDeleteWarning ? 'warning' : ''}`}>
                            <Trash2 size={16} />
                            <span>
                                {showDeleteWarning
                                    ? `⚠️ Deleting in ${formatCountdown(countdown)}`
                                    : `Auto-delete in ${formatCountdown(countdown)}`
                                }
                            </span>
                        </div>
                    )}

                    {/* Header */}
                    <div className="modal-header">
                        <div className="header-icon opened">
                            <Package size={32} />
                        </div>
                        <h2>{capsule.title || 'Time Capsule'}</h2>
                        <div className="capsule-dates">
                            <span className="created-date">
                                <Calendar size={14} />
                                Written on {formatDate(capsule.created_at)}
                            </span>
                            <span className="unlock-date">
                                Available from {formatDate(capsule.unlock_at)}
                            </span>
                            <span className="opened-date">
                                Opened on {formatDate(capsule.opened_at || capsule.unlock_at)}
                            </span>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="modal-body">
                        <div className="message-container">
                            <div className="message-label">Your Message to Future Self:</div>
                            <div
                                className="message-content"
                                dangerouslySetInnerHTML={{ __html: capsule.body }}
                            />
                        </div>

                        {/* Tags if present */}
                        {capsule.tags && capsule.tags.length > 0 && (
                            <div className="capsule-tags">
                                {(typeof capsule.tags === 'string'
                                    ? JSON.parse(capsule.tags)
                                    : capsule.tags
                                ).map((tag, index) => (
                                    <span key={index} className="tag">#{tag}</span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="modal-footer">
                        <button className="close-modal-btn" onClick={onClose}>
                            Close
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default UnlockedCapsuleModal;

import { Calendar, MailOpen, X } from 'lucide-react';
import { useEffect } from 'react';
import './OpenedLetterModal.scss';

const OpenedLetterModal = ({ isOpen, onClose, letter }) => {

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

    if (!isOpen || !letter) return null;

    // Format date
    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
    };

    // Get years ago
    const getYearsAgo = () => {
        const created = new Date(letter.created_at);
        const now = new Date();
        const years = now.getFullYear() - created.getFullYear();
        if (years === 0) {
            const months = now.getMonth() - created.getMonth();
            if (months === 0) return 'Just now';
            return `${months} month${months > 1 ? 's' : ''} ago`;
        }
        return `${years} year${years > 1 ? 's' : ''} ago`;
    };

    return (
        <div className="opened-letter-overlay" onClick={onClose}>
            <div className="opened-letter-modal" onClick={(e) => e.stopPropagation()}>
                {/* Close button */}
                <button className="modal-close-btn" onClick={onClose}>
                    <X size={20} />
                </button>

                {/* Letter Header */}
                <div className="opened-letter-header">
                    <div className="envelope-opened">
                        <MailOpen size={48} />
                    </div>
                    <div className="from-badge">
                        From: {letter.recipient === 'future'
                            ? `✨ ${getYearsAgo()} You`
                            : letter.recipient === 'present'
                                ? '🌟 Present You'
                                : '💜 Past You'}
                    </div>
                </div>

                {/* Letter Title */}
                <h2 className="letter-title">
                    {letter.title || `Dear ${letter.recipient === 'future' ? 'Future' : letter.recipient === 'present' ? 'Present' : 'Past'} Me`}
                </h2>

                {/* Date Written */}
                <div className="date-written">
                    <Calendar size={14} />
                    <span>Written on {formatDate(letter.created_at)}</span>
                </div>

                {/* Letter Content */}
                <div className="letter-content">
                    <div
                        className="letter-body"
                        dangerouslySetInnerHTML={{ __html: letter.body }}
                    />
                </div>

                {/* Tags if any */}
                {(() => {
                    let parsedTags = [];
                    try {
                        if (letter.tags) {
                            parsedTags = typeof letter.tags === 'string'
                                ? JSON.parse(letter.tags)
                                : letter.tags;
                        }
                    } catch (e) {
                        parsedTags = [];
                    }
                    return parsedTags.length > 0 && (
                        <div className="letter-tags">
                            {parsedTags.map((tag, index) => (
                                <span key={index} className="tag">#{tag}</span>
                            ))}
                        </div>
                    );
                })()}

                {/* Opened info */}
                {letter.opened_at && (
                    <p className="opened-info">
                        📬 Opened on {formatDate(letter.opened_at)}
                    </p>
                )}

                <button className="opened-letter-close-btn" onClick={onClose}>
                    Close Letter
                </button>
            </div>
        </div>
    );
};

export default OpenedLetterModal;

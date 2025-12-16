import {
    ArrowLeft,
    Bold,
    Calendar,
    Gift,
    Italic,
    List,
    ListOrdered,
    Loader,
    Mail,
    Sparkles,
    Star,
    Tag,
    X
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal.jsx';
import Navbar from '../../components/Navbar/Navbar.jsx';
import PremiumDateTimePicker from '../../components/PremiumDateTimePicker/PremiumDateTimePicker.jsx';
import axiosInstance from '../../utils/axiosInstance';
import './LetterToMyself.scss';

const LIFE_EVENTS = [
    { id: 'birthday', label: 'Birthday', icon: '🎂', description: 'Opens on your next birthday' },
    { id: 'new_year', label: 'New Year', icon: '🎆', description: 'Opens on January 1st' },
    { id: 'graduation', label: 'Graduation', icon: '🎓', description: 'Opens when you graduate' },
    { id: 'got_job', label: 'Got a Job', icon: '💼', description: 'Opens when you get a new job' },
    { id: 'moved_city', label: 'Moved City', icon: '🏠', description: 'Opens when you move' },
    { id: 'got_married', label: 'Got Married', icon: '💒', description: 'Opens when you get married' },
    { id: 'had_baby', label: 'Had a Baby', icon: '👶', description: 'Opens when you have a baby' },
    { id: 'milestone_entries', label: 'Entry Milestone', icon: '📚', description: 'Opens after 100 entries' }
];

const LetterToMyself = () => {
    const navigate = useNavigate();

    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [tags, setTags] = useState([]);
    const [tagInput, setTagInput] = useState('');
    const [recipient, setRecipient] = useState('future');
    const [unlockType, setUnlockType] = useState('date');
    const [unlockDate, setUnlockDate] = useState('');
    const [unlockTime, setUnlockTime] = useState('09:00');
    const [lifeEvent, setLifeEvent] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [showSealAnimation, setShowSealAnimation] = useState(false);
    const [userInfo, setUserInfo] = useState(null);
    const bodyTextareaRef = useRef(null);
    const lastBodyValueRef = useRef('');
    const [showBackConfirm, setShowBackConfirm] = useState(false);

    const hasContent = useMemo(() => {
        const editor = bodyTextareaRef.current;
        const bodyText = editor ? (editor.textContent || editor.innerText || '').trim() : body.replace(/<[^>]*>/g, '').trim();
        return bodyText !== '';
    }, [body]);

    // Check if form is ready to submit
    const canSubmit = useMemo(() => {
        if (!hasContent) return false;
        if (!title.trim()) return false;  // Title is required
        if (recipient === 'present') return true;  // Present letters don't need date
        // Future letters need either a date or life event
        if (unlockType === 'date' && !unlockDate) return false;
        if (unlockType === 'life_event' && !lifeEvent) return false;
        return true;
    }, [hasContent, title, recipient, unlockType, unlockDate, lifeEvent]);

    const getTextContent = () => {
        const editor = bodyTextareaRef.current;
        if (!editor) return '';
        return editor.textContent || editor.innerText || '';
    };

    const wordCount = useMemo(() => {
        const text = getTextContent().trim();
        return text === '' ? 0 : text.split(/\s+/).filter(word => word.length > 0).length;
    }, [body]);

    const handleBodyChange = useCallback(() => {
        const editor = bodyTextareaRef.current;
        if (!editor) return;
        const newValue = editor.innerHTML;
        if (newValue !== lastBodyValueRef.current) {
            setBody(newValue);
            lastBodyValueRef.current = newValue;
        }
    }, []);

    const applyFormatting = useCallback((command) => {
        const editor = bodyTextareaRef.current;
        if (!editor) return;
        editor.focus();
        document.execCommand(command, false, null);
        handleBodyChange();
    }, [handleBodyChange]);

    useEffect(() => {
        const fetchUserInfo = () => {
            try {
                const storedUser = localStorage.getItem('user');
                if (storedUser) {
                    setUserInfo(JSON.parse(storedUser));
                } else {
                    setUserInfo({
                        username: localStorage.getItem('username') || 'User',
                        email: localStorage.getItem('email') || '',
                        id: localStorage.getItem('userId') || ''
                    });
                }
            } catch (error) {
                console.error('Error fetching user info:', error);
                setUserInfo({ username: 'User', email: '', id: '' });
            }
        };
        fetchUserInfo();
    }, []);

    const handleDateChange = (e) => {
        const selectedDate = e.target.value;
        setUnlockDate(selectedDate);

        const selected = new Date(selectedDate + 'T' + unlockTime);
        if (selected <= new Date()) {
            setError('Please choose a future date');
            setTimeout(() => setError(null), 3000);
        }
    };

    const formatUnlockDisplay = () => {
        if (!unlockDate) return '';
        const date = new Date(unlockDate + 'T' + unlockTime);
        const options = { month: 'long', day: 'numeric', year: 'numeric' };
        const timeOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
        return `Opens on ${date.toLocaleDateString('en-US', options)} at ${date.toLocaleTimeString('en-US', timeOptions)}`;
    };

    // Get minimum date (tomorrow)
    const getMinDate = () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
    };

    const handleSaveLetter = async () => {
        if (!body.trim()) {
            setError('Please write your letter');
            return;
        }

        if (unlockType === 'date' && !unlockDate) {
            setError('Please select when you\'d like to open this letter');
            return;
        }

        if (unlockType === 'life_event' && !lifeEvent) {
            setError('Please select a life event');
            return;
        }

        // Validate date is in future
        if (unlockType === 'date') {
            const unlockDateTime = new Date(unlockDate + 'T' + unlockTime);
            if (unlockDateTime <= new Date()) {
                setError('Choose a future date');
                return;
            }
        }

        setSaving(true);
        setError(null);
        setShowSealAnimation(true);

        try {
            const payload = {
                title: title || `Dear ${recipient === 'future' ? 'Future' : 'Past'} Me`,
                body,
                recipient,
                unlock_type: unlockType,
                tags
            };

            if (unlockType === 'date') {
                payload.unlock_at = new Date(unlockDate + 'T' + unlockTime).toISOString();
            } else {
                payload.life_event = lifeEvent;
            }

            await axiosInstance.post('/letters', payload);

            // Show success after seal animation
            setTimeout(() => {
                setSuccess('Your letter has been sealed ✨');

                // Navigate after showing success
                setTimeout(() => {
                    navigate('/dashboard/letters');
                }, 2000);
            }, 800);

        } catch (error) {
            console.error('Error saving letter:', error);
            setError(error.response?.data?.error || 'Failed to save letter');
            setShowSealAnimation(false);
        } finally {
            setSaving(false);
        }
    };

    const handleBack = () => {
        if (hasContent) {
            setShowBackConfirm(true);
        } else {
            navigate('/dashboard/letters');
        }
    };

    const confirmBack = () => {
        setShowBackConfirm(false);
        navigate('/dashboard');
    };

    return (
        <div className="letter-page">
            <Navbar
                showAuthButtons={false}
                isAuthenticated={true}
                userProfileInfo={userInfo}
            />

            <div className="letter-container">
                <div className="letter-header">
                    <button className="back-btn" onClick={handleBack}>
                        <ArrowLeft size={20} />
                        <span>Back</span>
                    </button>
                    <h1>
                        <Mail className="header-icon" size={28} />
                        Letter to Myself
                    </h1>
                    <button
                        className="view-letters-btn"
                        onClick={() => navigate('/dashboard/letters')}
                    >
                        My Letters
                    </button>
                </div>

                <div className="recipient-card">
                    <h3>Who is this letter for?</h3>
                    <div className="recipient-options">
                        <button
                            className={`recipient-btn ${recipient === 'future' ? 'active' : ''}`}
                            onClick={() => setRecipient('future')}
                        >
                            <Sparkles size={20} />
                            <span>Dear Future Me</span>
                        </button>
                        <button
                            className={`recipient-btn ${recipient === 'present' ? 'active' : ''}`}
                            onClick={() => setRecipient('present')}
                        >
                            <Star size={20} />
                            <span>Dear Present Me</span>
                        </button>
                    </div>
                    {recipient === 'present' && (
                        <p className="present-me-note">✨ This letter will be available immediately for self-reflection</p>
                    )}
                </div>

                {/* Unlock Type Card - Only show for future letters */}
                {recipient === 'future' && (
                    <div className="unlock-card">
                        <h3>When should this letter open?</h3>
                        <div className="unlock-type-tabs">
                            <button
                                className={`type-tab ${unlockType === 'date' ? 'active' : ''}`}
                                onClick={() => setUnlockType('date')}
                            >
                                <Calendar size={18} />
                                <span>On a Date</span>
                            </button>
                            <button
                                className={`type-tab ${unlockType === 'life_event' ? 'active' : ''}`}
                                onClick={() => setUnlockType('life_event')}
                            >
                                <Gift size={18} />
                                <span>Life Event</span>
                            </button>
                        </div>

                        {unlockType === 'date' ? (
                            <PremiumDateTimePicker
                                selectedDate={unlockDate}
                                selectedTime={unlockTime}
                                onDateChange={(date) => setUnlockDate(date)}
                                onTimeChange={(time) => setUnlockTime(time)}
                                minDate={new Date(Date.now() + 24 * 60 * 60 * 1000)}
                            />
                        ) : (
                            <div className="life-events-grid">
                                {LIFE_EVENTS.map((event) => (
                                    <button
                                        key={event.id}
                                        className={`event-btn ${lifeEvent === event.id ? 'active' : ''}`}
                                        onClick={() => setLifeEvent(event.id)}
                                    >
                                        <span className="event-icon">{event.icon}</span>
                                        <span className="event-label">{event.label}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {unlockType === 'date' && unlockDate && (
                            <p className="unlock-preview">
                                📅 {formatUnlockDisplay()}
                            </p>
                        )}

                        {unlockType === 'life_event' && lifeEvent && (
                            <p className="unlock-preview">
                                {LIFE_EVENTS.find(e => e.id === lifeEvent)?.icon} {LIFE_EVENTS.find(e => e.id === lifeEvent)?.description}
                            </p>
                        )}
                    </div>
                )}

                {/* Error/Success Messages */}
                {error && (
                    <div className="alert alert-error">
                        <span>{error}</span>
                        <button onClick={() => setError(null)}>
                            <X size={18} />
                        </button>
                    </div>
                )}

                {success && (
                    <div className="alert alert-success">
                        <span>{success}</span>
                    </div>
                )}

                {/* Editor Form */}
                <div className="letter-editor-form">
                    <div className="form-group">
                        <label htmlFor="title">Title <span style={{ color: '#ef4444' }}>*</span></label>
                        <input
                            type="text"
                            id="title"
                            className="title-input"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={`Dear ${recipient === 'future' ? 'Future' : 'Present'} Me...`}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="body">Your Letter</label>
                        <div className="rich-text-toolbar">
                            <button
                                type="button"
                                className="toolbar-btn"
                                onClick={() => applyFormatting('bold')}
                                title="Bold"
                            >
                                <Bold size={18} />
                            </button>
                            <button
                                type="button"
                                className="toolbar-btn"
                                onClick={() => applyFormatting('italic')}
                                title="Italic"
                            >
                                <Italic size={18} />
                            </button>
                            <button
                                type="button"
                                className="toolbar-btn"
                                onClick={() => applyFormatting('insertUnorderedList')}
                                title="Bullet List"
                            >
                                <List size={18} />
                            </button>
                            <button
                                type="button"
                                className="toolbar-btn"
                                onClick={() => applyFormatting('insertOrderedList')}
                                title="Numbered List"
                            >
                                <ListOrdered size={18} />
                            </button>
                        </div>
                        <div
                            id="body"
                            className="body-input rich-editor"
                            contentEditable
                            ref={bodyTextareaRef}
                            onInput={handleBodyChange}
                            suppressContentEditableWarning={true}
                            data-placeholder={`Start writing your letter to your ${recipient} self...`}
                            role="textbox"
                            aria-label="Letter content"
                            aria-multiline="true"
                        />
                        <div className="editor-stats">
                            <span>{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
                        </div>
                    </div>

                    {/* Tags */}
                    <div className="form-group tags-group">
                        <label>
                            <Tag size={16} />
                            Tags (optional)
                        </label>
                        <div className="tags-input-container">
                            <input
                                type="text"
                                className="tags-input"
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && tagInput.trim() !== '' && tags.length < 5) {
                                        e.preventDefault();
                                        setTags([...tags, tagInput.trim()]);
                                        setTagInput('');
                                    }
                                }}
                                placeholder="Add a tag..."
                                disabled={tags.length >= 5}
                            />
                        </div>
                        {tags.length > 0 && (
                            <div className="tags-list">
                                {tags.map((tag, index) => (
                                    <span key={index} className="tag">
                                        {tag}
                                        <button
                                            className="tag-remove-btn"
                                            onClick={() => setTags(tags.filter((_, i) => i !== index))}
                                        >
                                            <X size={14} />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Save Button */}
                    <div className="form-actions">
                        <button
                            className={`save-letter-btn ${showSealAnimation ? 'sealing' : ''}`}
                            onClick={handleSaveLetter}
                            disabled={saving || !canSubmit}
                        >
                            {saving ? (
                                <>
                                    <Loader size={20} className="spinner" />
                                    <span>Sealing...</span>
                                </>
                            ) : showSealAnimation ? (
                                <div className="seal-animation">
                                    <Mail size={24} className="letter-icon" />
                                </div>
                            ) : (
                                <>
                                    <Mail size={20} />
                                    <span>{recipient === 'future' ? '✉️ Seal & Send to Future Me' : '🌟 Save for Present Me'}</span>
                                </>
                            )}
                        </button>
                    </div>

                    <p className="reassurance-text">
                        This letter will be safely stored until the right moment.
                    </p>
                </div>
            </div>

            {/* Back Confirmation Modal */}
            <ConfirmModal
                isOpen={showBackConfirm}
                onClose={() => setShowBackConfirm(false)}
                onConfirm={confirmBack}
                title="Leave without saving?"
                message="Your letter hasn't been sealed yet. If you leave now, everything you've written will be lost."
                confirmText="Leave Anyway"
                cancelText="Keep Writing"
                type="warning"
                confirmButtonStyle="danger"
            />
        </div>
    );
};

export default LetterToMyself;

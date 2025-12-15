import {
    ArrowLeft,
    Bold,
    Calendar,
    Clock,
    Italic,
    List,
    ListOrdered,
    Loader,
    Package,
    Plus,
    Sparkles,
    Tag,
    X
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../../components/Navbar/Navbar.jsx';
import axiosInstance from '../../utils/axiosInstance';
import './TimeCapsule.scss';

const TimeCapsule = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const isTimeCapsuleMode = searchParams.get('mode') === 'time-capsule';

    // Form states
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [tags, setTags] = useState([]);
    const [tagInput, setTagInput] = useState('');

    // Time Capsule specific states
    const [unlockDate, setUnlockDate] = useState('');
    const [unlockTime, setUnlockTime] = useState('09:00');
    const [isDateSet, setIsDateSet] = useState(false);

    // UI states
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [showSealAnimation, setShowSealAnimation] = useState(false);

    // Auto-save states
    const [autoSaveStatus, setAutoSaveStatus] = useState('saved');
    const autoSaveTimerRef = useRef(null);
    const lastSavedDataRef = useRef({ title: '', body: '', tags: [] });

    const [userInfo, setUserInfo] = useState(null);
    const bodyTextareaRef = useRef(null);
    const lastBodyValueRef = useRef('');

    // Check if there's content
    const hasContent = useMemo(() => {
        const editor = bodyTextareaRef.current;
        const bodyText = editor ? (editor.textContent || editor.innerText || '').trim() : body.replace(/<[^>]*>/g, '').trim();
        return title.trim() !== '' || bodyText !== '';
    }, [title, body]);

    // Get text content from editor
    const getTextContent = () => {
        const editor = bodyTextareaRef.current;
        if (!editor) return '';
        return editor.textContent || editor.innerText || '';
    };

    // Calculate word count
    const wordCount = useMemo(() => {
        const text = getTextContent().trim();
        return text === '' ? 0 : text.split(/\s+/).filter(word => word.length > 0).length;
    }, [body]);

    // Handle body change
    const handleBodyChange = useCallback(() => {
        const editor = bodyTextareaRef.current;
        if (!editor) return;
        const newValue = editor.innerHTML;
        if (newValue !== lastBodyValueRef.current) {
            setBody(newValue);
            lastBodyValueRef.current = newValue;
        }
    }, []);

    // Formatting handlers
    const applyFormatting = useCallback((command) => {
        const editor = bodyTextareaRef.current;
        if (!editor) return;
        editor.focus();
        document.execCommand(command, false, null);
        handleBodyChange();
    }, [handleBodyChange]);

    // Fetch user info
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

    // Set default unlock date to 7 days from now
    useEffect(() => {
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() + 7);
        const formattedDate = defaultDate.toISOString().split('T')[0];
        setUnlockDate(formattedDate);
    }, []);

    // Handle date change
    const handleDateChange = (e) => {
        const selectedDate = e.target.value;
        setUnlockDate(selectedDate);
        setIsDateSet(true);

        // Validate date is in future
        const selected = new Date(selectedDate + 'T' + unlockTime);
        if (selected <= new Date()) {
            setError('Please choose a future date');
            setTimeout(() => setError(null), 3000);
            setIsDateSet(false);
        }
    };

    // Format unlock date for display
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

    // Save time capsule
    const handleSaveTimeCapsule = async () => {
        if (!body.trim()) {
            setError('Please write something for your future self');
            return;
        }

        if (!unlockDate) {
            setError('Please select when you\'d like to open this');
            return;
        }

        // Validate date is in future
        const unlockDateTime = new Date(unlockDate + 'T' + unlockTime);
        if (unlockDateTime <= new Date()) {
            setError('Choose a future date');
            return;
        }

        setSaving(true);
        setError(null);
        setShowSealAnimation(true);

        try {
            await axiosInstance.post('/time-capsule', {
                title: title || 'Time Capsule',
                body,
                tags,
                unlock_at: unlockDateTime.toISOString()
            });

            // Show success after seal animation
            setTimeout(() => {
                setSuccess('Your message has been safely sealed ✨');

                // Navigate after showing success
                setTimeout(() => {
                    navigate('/dashboard');
                }, 2000);
            }, 800);

        } catch (error) {
            console.error('Error saving time capsule:', error);
            setError(error.response?.data?.error || 'Failed to save time capsule');
            setShowSealAnimation(false);
        } finally {
            setSaving(false);
        }
    };

    // Handle back navigation
    const handleBack = () => {
        if (hasContent) {
            if (window.confirm('Are you sure? Your time capsule will not be saved.')) {
                navigate('/dashboard');
            }
        } else {
            navigate('/dashboard');
        }
    };

    // Auto-save for body content
    useEffect(() => {
        const hasChanges =
            title !== lastSavedDataRef.current.title ||
            body !== lastSavedDataRef.current.body ||
            JSON.stringify(tags) !== JSON.stringify(lastSavedDataRef.current.tags);

        if (hasChanges && hasContent) {
            setAutoSaveStatus('unsaved');
        }

        if (autoSaveTimerRef.current) {
            clearTimeout(autoSaveTimerRef.current);
        }

        return () => {
            if (autoSaveTimerRef.current) {
                clearTimeout(autoSaveTimerRef.current);
            }
        };
    }, [title, body, tags, hasContent]);

    return (
        <div className="time-capsule-page">
            <Navbar
                showAuthButtons={false}
                isAuthenticated={true}
                userProfileInfo={userInfo}
            />

            <div className="time-capsule-container">
                {/* Header */}
                <div className="tc-header">
                    <button className="back-btn" onClick={handleBack}>
                        <ArrowLeft size={20} />
                        <span>Back to Dashboard</span>
                    </button>
                    <h1>
                        <Package className="header-icon" size={28} />
                        Time Capsule
                    </h1>
                    <button
                        className="view-capsules-btn"
                        onClick={() => navigate('/dashboard/time-capsules')}
                    >
                        View My Capsules
                    </button>
                </div>

                {/* Time Capsule Settings Card */}
                <div className="tc-settings-card">
                    <div className="settings-header">
                        <Clock className="settings-icon" size={24} />
                        <h2>⏳ Time Capsule</h2>
                    </div>

                    <div className="settings-content">
                        <div className="date-time-row">
                            <div className="input-group">
                                <label>
                                    <Calendar size={16} />
                                    Open on
                                </label>
                                <input
                                    type="date"
                                    value={unlockDate}
                                    onChange={handleDateChange}
                                    min={getMinDate()}
                                    className="date-input"
                                />
                            </div>

                            <div className="input-group">
                                <label>
                                    <Clock size={16} />
                                    Time
                                </label>
                                <input
                                    type="time"
                                    value={unlockTime}
                                    onChange={(e) => setUnlockTime(e.target.value)}
                                    className="time-input"
                                />
                            </div>
                        </div>

                        <p className="settings-hint">
                            ℹ️ This entry will stay sealed until then.
                        </p>
                    </div>
                </div>

                {/* Date Badge */}
                {isDateSet && unlockDate && (
                    <div className="unlock-badge">
                        <Sparkles size={16} className="badge-icon" />
                        <span>⏳ {formatUnlockDisplay()}</span>
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
                <div className="tc-editor-form">
                    <div className="form-group">
                        <label htmlFor="title">Title (optional)</label>
                        <input
                            type="text"
                            id="title"
                            className="title-input"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Give your time capsule a name..."
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="body">Message to your future self</label>
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
                            data-placeholder="Dear future me..."
                            role="textbox"
                            aria-label="Time capsule message"
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
                            <button
                                className="add-tag-btn"
                                onClick={() => {
                                    if (tagInput.trim() !== '' && tags.length < 5) {
                                        setTags([...tags, tagInput.trim()]);
                                        setTagInput('');
                                    }
                                }}
                                disabled={!tagInput.trim() || tags.length >= 5}
                                type="button"
                            >
                                <Plus size={18} />
                            </button>
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
                            className={`save-capsule-btn ${showSealAnimation ? 'sealing' : ''}`}
                            onClick={handleSaveTimeCapsule}
                            disabled={saving || !hasContent}
                        >
                            {saving ? (
                                <>
                                    <Loader size={20} className="spinner" />
                                    <span>Sealing...</span>
                                </>
                            ) : showSealAnimation ? (
                                <div className="seal-animation">
                                    <Package size={24} className="capsule-icon" />
                                </div>
                            ) : (
                                <>
                                    <Package size={20} />
                                    <span>📦 Save Time Capsule</span>
                                </>
                            )}
                        </button>
                    </div>

                    {/* Reassuring message */}
                    <p className="reassurance-text">
                        We'll keep it safe until the right moment.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default TimeCapsule;

import { ArrowLeft, Calendar, Filter, Gift, Loader, Mail, MailOpen, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal.jsx';
import Navbar from '../../components/Navbar/Navbar.jsx';
import OpenedLetterModal from '../../components/OpenedLetterModal/OpenedLetterModal.jsx';
import SealedLetterModal from '../../components/SealedLetterModal/SealedLetterModal.jsx';
import axiosInstance from '../../utils/axiosInstance';
import './LettersList.scss';

const LettersList = () => {
    const navigate = useNavigate();
    const [letters, setLetters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('all');
    const [userInfo, setUserInfo] = useState(null);

    // Modal states
    const [selectedLetter, setSelectedLetter] = useState(null);
    const [showSealedModal, setShowSealedModal] = useState(false);
    const [showOpenedModal, setShowOpenedModal] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);

    // Fetch user info
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUserInfo(JSON.parse(storedUser));
        }
    }, []);

    // Fetch letters
    useEffect(() => {
        fetchLetters();
    }, [filter]);

    const fetchLetters = async () => {
        try {
            setLoading(true);
            const response = await axiosInstance.get(`/letters?filter=${filter}`);
            setLetters(response.data.data || []);
        } catch (err) {
            console.error('Error fetching letters:', err);
            setError('Failed to load letters');
        } finally {
            setLoading(false);
        }
    };

    // Handle letter click
    const handleLetterClick = async (letter) => {
        if (letter.is_sealed) {
            setSelectedLetter(letter);
            setShowSealedModal(true);
        } else {
            // Fetch full letter content
            try {
                const response = await axiosInstance.get(`/letters/${letter.id}`);
                setSelectedLetter(response.data.letter);
                setShowOpenedModal(true);
            } catch (err) {
                console.error('Error fetching letter:', err);
            }
        }
    };

    // Handle delete click - open confirm modal
    const handleDeleteClick = (letterId, e) => {
        e.stopPropagation();
        setDeleteConfirmId(letterId);
    };

    // Confirm delete
    const confirmDelete = async () => {
        if (!deleteConfirmId) return;
        try {
            await axiosInstance.delete(`/letters/${deleteConfirmId}`);
            setLetters(letters.filter(l => l.id !== deleteConfirmId));
        } catch (err) {
            console.error('Error deleting letter:', err);
        } finally {
            setDeleteConfirmId(null);
        }
    };

    // Format date
    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    // Get time remaining
    const getTimeRemaining = (unlockAt) => {
        const unlockDate = new Date(unlockAt);
        const now = new Date();
        const diffTime = unlockDate - now;

        if (diffTime <= 0) return 'Ready to open!';

        const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        if (days > 365) {
            const years = Math.floor(days / 365);
            return `${years} year${years > 1 ? 's' : ''} left`;
        }
        if (days > 30) {
            const months = Math.floor(days / 30);
            return `${months} month${months > 1 ? 's' : ''} left`;
        }
        return `${days} day${days !== 1 ? 's' : ''} left`;
    };

    // Get life event label
    const getLifeEventLabel = (event) => {
        const labels = {
            'birthday': '🎂 Birthday',
            'new_year': '🎆 New Year',
            'graduation': '🎓 Graduation',
            'got_job': '💼 Got a Job',
            'moved_city': '🏠 Moved City',
            'got_married': '💒 Got Married',
            'had_baby': '👶 Had a Baby',
            'milestone_entries': '📚 Entry Milestone'
        };
        return labels[event] || event;
    };

    return (
        <div className="letters-list-page">
            <Navbar
                showAuthButtons={false}
                isAuthenticated={true}
                userProfileInfo={userInfo}
            />

            <div className="letters-container">
                {/* Back to Dashboard */}
                <div className="page-header">
                    <button className="back-btn" onClick={() => navigate('/dashboard')}>
                        <ArrowLeft size={20} />
                        <span>Back to Dashboard</span>
                    </button>
                </div>

                {/* Header */}
                <div className="letters-header">
                    <h1>
                        <Mail size={28} />
                        My Letters
                    </h1>
                    <button
                        className="new-letter-btn"
                        onClick={() => navigate('/dashboard/letter/new')}
                    >
                        <Plus size={20} />
                        <span>Write Letter</span>
                    </button>
                </div>

                {/* Filter Tabs */}
                <div className="filter-tabs">
                    <button
                        className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
                        onClick={() => setFilter('all')}
                    >
                        <Filter size={16} />
                        All
                    </button>
                    <button
                        className={`filter-tab ${filter === 'sealed' ? 'active' : ''}`}
                        onClick={() => setFilter('sealed')}
                    >
                        <Mail size={16} />
                        Sealed
                    </button>
                    <button
                        className={`filter-tab ${filter === 'opened' ? 'active' : ''}`}
                        onClick={() => setFilter('opened')}
                    >
                        <MailOpen size={16} />
                        Opened
                    </button>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="loading-state">
                        <Loader size={32} className="spinner" />
                        <p>Loading letters...</p>
                    </div>
                )}

                {/* Error State */}
                {error && (
                    <div className="error-state">
                        <p>{error}</p>
                        <button onClick={fetchLetters}>Try Again</button>
                    </div>
                )}

                {/* Empty State */}
                {!loading && !error && letters.length === 0 && (
                    <div className="empty-state">
                        <Mail size={64} className="empty-icon" />
                        <h3>No letters yet</h3>
                        <p>Write your first letter to yourself!</p>
                        <button
                            className="write-first-btn"
                            onClick={() => navigate('/dashboard/letter/new')}
                        >
                            <Plus size={20} />
                            Write a Letter
                        </button>
                    </div>
                )}

                {/* Letters Grid */}
                {!loading && !error && letters.length > 0 && (
                    <div className="letters-grid">
                        {letters.map((letter) => (
                            <div
                                key={letter.id}
                                className={`letter-card ${(letter.is_sealed === 1 || letter.is_sealed === true) ? 'sealed' : 'opened'}`}
                                onClick={() => handleLetterClick(letter)}
                            >
                                {/* Envelope Icon */}
                                <div className="envelope-icon">
                                    {letter.is_sealed === 1 || letter.is_sealed === true ? (
                                        <Mail size={40} />
                                    ) : (
                                        <MailOpen size={40} />
                                    )}
                                    {(letter.is_sealed === 1 || letter.is_sealed === true) && <div className="wax-seal">🔒</div>}
                                </div>

                                {/* Letter Info */}
                                <div className="letter-info">
                                    <h3>{letter.title || `Dear ${letter.recipient === 'future' ? 'Future' : 'Present'} Me`}</h3>
                                    <p className="recipient-badge">
                                        To: {letter.recipient === 'future' ? '✨ Future Me' : '🌟 Present Me'}
                                    </p>

                                    {/* Unlock Info */}
                                    {(letter.is_sealed === 1 || letter.is_sealed === true) ? (
                                        <div className="unlock-info sealed">
                                            {letter.unlock_type === 'date' ? (
                                                <>
                                                    <Calendar size={14} />
                                                    <span>{getTimeRemaining(letter.unlock_at)}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Gift size={14} />
                                                    <span>{getLifeEventLabel(letter.life_event)}</span>
                                                </>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="unlock-info opened">
                                            <MailOpen size={14} />
                                            <span>Opened {formatDate(letter.opened_at)}</span>
                                        </div>
                                    )}

                                    <p className="created-date">
                                        Written {formatDate(letter.created_at)}
                                    </p>
                                </div>

                                {/* Delete Button */}
                                <button
                                    className="delete-btn"
                                    onClick={(e) => handleDeleteClick(letter.id, e)}
                                    title="Delete letter"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Sealed Letter Modal */}
            <SealedLetterModal
                isOpen={showSealedModal}
                onClose={() => {
                    setShowSealedModal(false);
                    setSelectedLetter(null);
                }}
                letter={selectedLetter}
            />

            {/* Opened Letter Modal */}
            <OpenedLetterModal
                isOpen={showOpenedModal}
                onClose={() => {
                    setShowOpenedModal(false);
                    setSelectedLetter(null);
                    fetchLetters(); // Refresh in case letter was just opened
                }}
                letter={selectedLetter}
            />

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                isOpen={!!deleteConfirmId}
                onClose={() => setDeleteConfirmId(null)}
                onConfirm={confirmDelete}
                title="Delete this letter?"
                message="This letter will be permanently deleted. This action cannot be undone."
                confirmText="Delete Letter"
                cancelText="Keep It"
                type="danger"
                confirmButtonStyle="danger"
            />
        </div>
    );
};

export default LettersList;

import {
    ArrowRight,
    Calendar,
    Clock,
    Package,
    Plus,
    Sparkles
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar/Navbar.jsx';
import SealedCapsuleModal from '../../components/SealedCapsuleModal/SealedCapsuleModal.jsx';
import axiosInstance from '../../utils/axiosInstance';
import './TimeCapsuleList.scss';

const TimeCapsuleList = () => {
    const navigate = useNavigate();
    const [capsules, setCapsules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [userInfo, setUserInfo] = useState(null);

    // Modal state
    const [showSealedModal, setShowSealedModal] = useState(false);
    const [selectedCapsule, setSelectedCapsule] = useState(null);

    // Fetch user info
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUserInfo(JSON.parse(storedUser));
        }
    }, []);

    // Fetch time capsules
    useEffect(() => {
        const fetchCapsules = async () => {
            try {
                setLoading(true);
                const response = await axiosInstance.get('/time-capsule');
                setCapsules(response.data.data || []);
            } catch (err) {
                console.error('Error fetching time capsules:', err);
                setError('Failed to load time capsules');
            } finally {
                setLoading(false);
            }
        };
        fetchCapsules();
    }, []);

    // Handle capsule click
    const handleCapsuleClick = (capsule) => {
        if (capsule.is_locked) {
            // Show sealed modal for locked capsules
            setSelectedCapsule(capsule);
            setShowSealedModal(true);
        } else {
            // Navigate to view unlocked capsule
            navigate(`/dashboard/time-capsule/${capsule.id}`);
        }
    };

    // Format date
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    // Format time
    const formatTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    // Get countdown text
    const getCountdown = (unlockDate) => {
        const now = new Date();
        const unlock = new Date(unlockDate);
        const diffTime = unlock - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));

        if (diffDays <= 0) return 'Ready to open';
        if (diffDays === 1) return 'Opens tomorrow';
        if (diffDays < 7) return `Opens in ${diffDays} days`;
        if (diffDays < 30) return `Opens in ${Math.ceil(diffDays / 7)} weeks`;
        return `Opens in ${Math.ceil(diffDays / 30)} months`;
    };

    // Check if capsule was recently unlocked (within 24 hours)
    const isRecentlyUnlocked = (unlockDate) => {
        const now = new Date();
        const unlock = new Date(unlockDate);
        const diffTime = now - unlock;
        const diffHours = diffTime / (1000 * 60 * 60);
        return diffHours >= 0 && diffHours < 24;
    };

    if (loading) {
        return (
            <div className="time-capsule-list-page">
                <Navbar isAuthenticated={true} userProfileInfo={userInfo} />
                <div className="tc-loading">
                    <Package size={48} className="loading-icon" />
                    <p>Loading your time capsules...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="time-capsule-list-page">
            <Navbar isAuthenticated={true} userProfileInfo={userInfo} />

            <div className="tc-list-container">
                {/* Header */}
                <div className="tc-list-header">
                    <div className="header-content">
                        <h1>
                            <Package size={28} className="header-icon" />
                            Time Capsules
                        </h1>
                        <p>Messages to your future self</p>
                    </div>
                    <button
                        className="create-btn"
                        onClick={() => navigate('/dashboard/time-capsule/new')}
                    >
                        <Plus size={20} />
                        <span>Create New</span>
                    </button>
                </div>

                {error && (
                    <div className="error-message">
                        <p>{error}</p>
                    </div>
                )}

                {/* Capsules List */}
                {capsules.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">
                            <Package size={64} />
                        </div>
                        <h2>📦 No Time Capsules Yet</h2>
                        <p>Write something today.<br />Open it when the time is right.</p>
                        <button
                            className="create-capsule-btn"
                            onClick={() => navigate('/dashboard/time-capsule/new')}
                        >
                            <Plus size={20} />
                            Create Time Capsule
                        </button>
                    </div>
                ) : (
                    <div className="capsules-grid">
                        {capsules.map((capsule) => (
                            <div
                                key={capsule.id}
                                className={`capsule-card ${capsule.is_locked ? 'locked' : 'unlocked'} ${!capsule.is_locked && isRecentlyUnlocked(capsule.unlock_at) ? 'recently-unlocked' : ''
                                    }`}
                                onClick={() => handleCapsuleClick(capsule)}
                            >
                                {/* Status badge */}
                                {!capsule.is_locked && isRecentlyUnlocked(capsule.unlock_at) && (
                                    <div className="ready-badge">
                                        <Sparkles size={14} />
                                        <span>Ready to Open</span>
                                    </div>
                                )}

                                {/* Icon */}
                                <div className="capsule-icon">
                                    {capsule.is_locked ? (
                                        <Clock size={24} />
                                    ) : (
                                        <Package size={24} />
                                    )}
                                </div>

                                {/* Content */}
                                <div className="capsule-content">
                                    <h3>{capsule.title || 'Time Capsule Entry'}</h3>

                                    {capsule.is_locked ? (
                                        <>
                                            <p className="capsule-preview">{capsule.preview}</p>
                                            <div className="capsule-meta">
                                                <span className="countdown">
                                                    <Clock size={14} />
                                                    {getCountdown(capsule.unlock_at)}
                                                </span>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <p className="capsule-snippet">
                                                {capsule.body?.replace(/<[^>]*>/g, '').substring(0, 100)}...
                                            </p>
                                            <div className="capsule-meta">
                                                <span className="opened-date">
                                                    <Calendar size={14} />
                                                    Opened {formatDate(capsule.unlock_at)}
                                                </span>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Arrow */}
                                <ArrowRight size={20} className="card-arrow" />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Sealed Capsule Modal */}
            <SealedCapsuleModal
                isOpen={showSealedModal}
                onClose={() => {
                    setShowSealedModal(false);
                    setSelectedCapsule(null);
                }}
                capsule={selectedCapsule}
            />
        </div>
    );
};

export default TimeCapsuleList;

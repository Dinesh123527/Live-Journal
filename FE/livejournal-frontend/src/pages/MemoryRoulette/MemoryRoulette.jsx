import { AnimatePresence, motion } from 'framer-motion';
import {
    ArrowLeft,
    Calendar,
    Clock,
    Dices,
    Loader2,
    Lock,
    RefreshCw,
    TrendingUp,
    Trophy
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar/Navbar';
import PinModal from '../../components/PinModal/PinModal';
import axiosInstance from '../../utils/axiosInstance';
import './MemoryRoulette.scss';

const FILTERS = [
    { id: 'random', label: 'Random Memory', icon: Dices, color: '#8b5cf6' },
    { id: 'week', label: '1 Week Ago', icon: Clock, color: '#06b6d4' },
    { id: 'month', label: '1 Month Ago', icon: Calendar, color: '#f59e0b' },
    { id: 'year', label: '1 Year Ago', icon: TrendingUp, color: '#ec4899' },
];

const REACTIONS = [
    { id: 'remember', label: 'I remember this!', emoji: '🔮', color: '#8b5cf6' },
    { id: 'grown', label: "I've grown", emoji: '🌱', color: '#22c55e' },
    { id: 'relevant', label: 'Still relevant', emoji: '✨', color: '#f59e0b' },
];

function MemoryRoulette() {
    const navigate = useNavigate();
    const [isSpinning, setIsSpinning] = useState(false);
    const [selectedFilter, setSelectedFilter] = useState('random');
    const [currentEntry, setCurrentEntry] = useState(null);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState(null);
    const [achievements, setAchievements] = useState([]);
    const [stats, setStats] = useState(null);
    const [sameDayEntries, setSameDayEntries] = useState([]);
    const [showSameDay, setShowSameDay] = useState(false);
    const [newAchievement, setNewAchievement] = useState(null);
    const [reactionSaving, setReactionSaving] = useState(false);
    const [userProfileInfo, setUserProfileInfo] = useState({ name: 'User', email: '' });

    // PIN protection state for private entries
    const [showPinModal, setShowPinModal] = useState(false);
    const [pinModalMode, setPinModalMode] = useState('verify');
    const [pendingPrivateEntry, setPendingPrivateEntry] = useState(null);
    const [entryUnlocked, setEntryUnlocked] = useState(false);

    // Fetch achievements, stats, and user info on mount
    useEffect(() => {
        fetchAchievements();
        fetchStats();
        fetchUserInfo();
    }, []);

    const fetchUserInfo = async () => {
        try {
            const res = await axiosInstance.get('/auth/me');
            if (res.data && res.data.user) {
                setUserProfileInfo({
                    name: res.data.user.name || 'User',
                    email: res.data.user.email || ''
                });
            }
        } catch (err) {
            console.error('Failed to fetch user info:', err);
        }
    };

    const fetchAchievements = async () => {
        try {
            const res = await axiosInstance.get('/memory-roulette/achievements');
            setAchievements(res.data.achievements || []);
        } catch (err) {
            console.error('Failed to fetch achievements:', err);
        }
    };

    const fetchStats = async () => {
        try {
            const res = await axiosInstance.get('/memory-roulette/stats');
            setStats(res.data);
        } catch (err) {
            console.error('Failed to fetch stats:', err);
        }
    };

    const spinRoulette = async () => {
        setIsSpinning(true);
        setError(null);
        setMessage(null);
        setCurrentEntry(null);
        setShowSameDay(false);
        setEntryUnlocked(false);
        setPendingPrivateEntry(null);

        // Simulate wheel spinning animation
        await new Promise(resolve => setTimeout(resolve, 2000));

        try {
            const res = await axiosInstance.get(`/memory-roulette/spin?filter=${selectedFilter}`);

            if (res.data.empty) {
                setMessage(res.data.message);
            } else {
                const entry = res.data.entry;

                // Check if entry is private (handle different value types)
                const isPrivate = entry.is_private === 1 || entry.is_private === true || entry.is_private === '1';

                if (isPrivate) {
                    // Store entry and show PIN modal
                    setPendingPrivateEntry(entry);
                    const pinKey = `journalPin_${JSON.parse(localStorage.getItem('user') || '{}').id}`;
                    const storedPin = localStorage.getItem(pinKey);
                    setPinModalMode(storedPin ? 'verify' : 'setup');
                    setShowPinModal(true);
                } else {
                    // Public entry - show directly
                    setCurrentEntry(entry);
                    setEntryUnlocked(true);
                }

                if (res.data.message) {
                    setMessage(res.data.message);
                }
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to spin roulette');
        } finally {
            setIsSpinning(false);
        }
    };

    const fetchSameDayLastYear = async () => {
        setShowSameDay(true);
        setError(null);
        setMessage(null);
        setCurrentEntry(null);

        try {
            const res = await axiosInstance.get('/memory-roulette/same-day-last-year');
            setSameDayEntries(res.data.entries || []);

            if (res.data.empty) {
                setMessage(res.data.message);
            }

            if (res.data.newAchievement) {
                setNewAchievement(res.data.newAchievement);
                setTimeout(() => setNewAchievement(null), 5000);
                fetchAchievements();
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch memories');
        }
    };

    const saveReaction = async (reaction) => {
        if (!currentEntry || reactionSaving) return;

        setReactionSaving(true);
        try {
            const res = await axiosInstance.post('/memory-roulette/reaction', {
                entryId: currentEntry.id,
                reaction
            });

            // Update entry with reaction
            setCurrentEntry(prev => ({ ...prev, existing_reaction: reaction }));

            // Check for new achievements
            if (res.data.newAchievements?.length > 0) {
                setNewAchievement(res.data.newAchievements[0]);
                setTimeout(() => setNewAchievement(null), 5000);
                fetchAchievements();
            }

            fetchStats();
        } catch (err) {
            console.error('Failed to save reaction:', err);
        } finally {
            setReactionSaving(false);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const getMoodEmoji = (mood) => {
        const moodEmojis = {
            happy: '😊', sad: '😢', angry: '😠', anxious: '😰',
            excited: '🤩', peaceful: '😌', grateful: '🙏', neutral: '😐',
            hopeful: '🌟', nostalgic: '💭', confident: '💪', tired: '😴'
        };
        return moodEmojis[mood?.toLowerCase()] || '📝';
    };

    const stripHtml = (html) => {
        const tmp = document.createElement('div');
        tmp.innerHTML = html || '';
        return tmp.textContent || tmp.innerText || '';
    };

    // Handle successful PIN verification for private entry
    const handlePinSuccess = () => {
        if (pendingPrivateEntry) {
            setCurrentEntry(pendingPrivateEntry);
            setEntryUnlocked(true);
            setPendingPrivateEntry(null);
        }
        setShowPinModal(false);
    };

    // Handle PIN modal close without verification
    const handlePinClose = () => {
        setShowPinModal(false);
        setPendingPrivateEntry(null);
        setMessage('PIN verification required to view this private memory.');
    };

    return (
        <div className="memory-roulette-page">
            <Navbar isAuthenticated={true} userProfileInfo={userProfileInfo} />

            <div className="roulette-content">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="roulette-header"
                >
                    <button className="back-btn" onClick={() => navigate('/dashboard')}>
                        <ArrowLeft size={20} />
                        <span>Back to Dashboard</span>
                    </button>

                    <div className="header-title">
                        <h1>🎰 Memory Roulette</h1>
                        <p>Spin to rediscover your past entries</p>
                    </div>

                    {stats && (
                        <div className="stats-badge">
                            <span className="stat-number">{stats.totalRevisited}</span>
                            <span className="stat-label">memories revisited</span>
                        </div>
                    )}
                </motion.div>

                {/* Filter Selection */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="filter-selection"
                >
                    {FILTERS.map((filter) => (
                        <button
                            key={filter.id}
                            className={`filter-btn ${selectedFilter === filter.id ? 'active' : ''}`}
                            onClick={() => setSelectedFilter(filter.id)}
                            style={{ '--filter-color': filter.color }}
                        >
                            <filter.icon size={18} />
                            <span>{filter.label}</span>
                        </button>
                    ))}
                </motion.div>

                {/* Spin Wheel Area */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="wheel-container"
                >
                    <div className={`wheel ${isSpinning ? 'spinning' : ''}`}>
                        <div className="wheel-inner">
                            {isSpinning ? (
                                <Loader2 className="spin-icon" size={48} />
                            ) : (
                                <Dices size={48} />
                            )}
                        </div>
                        <div className="wheel-segments">
                            {[...Array(8)].map((_, i) => (
                                <div key={i} className="segment" style={{ '--i': i }} />
                            ))}
                        </div>
                    </div>

                    <button
                        className="spin-btn"
                        onClick={spinRoulette}
                        disabled={isSpinning}
                    >
                        <RefreshCw size={20} className={isSpinning ? 'rotating' : ''} />
                        <span>{isSpinning ? 'Spinning...' : 'Spin the Wheel'}</span>
                    </button>

                    <button
                        className="same-day-btn"
                        onClick={fetchSameDayLastYear}
                    >
                        <Calendar size={18} />
                        <span>This Day in History</span>
                    </button>
                </motion.div>

                {/* Error/Message Display */}
                {(error || message) && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`message-box ${error ? 'error' : 'info'}`}
                    >
                        {error || message}
                    </motion.div>
                )}

                {/* Entry Display */}
                <AnimatePresence mode="wait">
                    {currentEntry && !showSameDay && (
                        <motion.div
                            key="entry"
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -30 }}
                            className="memory-card"
                        >
                            <div className="memory-header">
                                <div className="memory-mood">
                                    <span className="mood-emoji">{getMoodEmoji(currentEntry.mood_label)}</span>
                                </div>
                                <div className="memory-meta">
                                    <h2>
                                        {currentEntry.title || 'Untitled Entry'}
                                        {(currentEntry.is_private === 1 || currentEntry.is_private === true || currentEntry.is_private === '1') && (
                                            <span className="private-badge" title="Private Entry">
                                                <Lock size={14} />
                                            </span>
                                        )}
                                    </h2>
                                    <span className="memory-date">{formatDate(currentEntry.created_at)}</span>
                                </div>
                            </div>

                            <div className="memory-body">
                                <p>{stripHtml(currentEntry.body)}</p>
                            </div>

                            <div className="memory-actions">
                                <p className="reaction-prompt">How does this memory make you feel?</p>
                                <div className="reaction-buttons">
                                    {REACTIONS.map((reaction) => (
                                        <button
                                            key={reaction.id}
                                            className={`reaction-btn ${currentEntry.existing_reaction === reaction.id ? 'active' : ''}`}
                                            onClick={() => saveReaction(reaction.id)}
                                            disabled={reactionSaving}
                                            style={{ '--reaction-color': reaction.color }}
                                        >
                                            <span className="reaction-emoji">{reaction.emoji}</span>
                                            <span className="reaction-label">{reaction.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                className="view-full-btn"
                                onClick={() => navigate(`/dashboard/entry/${currentEntry.id}`)}
                            >
                                View Full Entry →
                            </button>
                        </motion.div>
                    )}

                    {/* Same Day Last Year Display */}
                    {showSameDay && sameDayEntries.length > 0 && (
                        <motion.div
                            key="sameday"
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -30 }}
                            className="same-day-section"
                        >
                            <h3>📅 This Day in History</h3>
                            <div className="same-day-entries">
                                {sameDayEntries.map((entry) => (
                                    <div key={entry.id} className="same-day-card">
                                        <div className="year-badge">{entry.entry_year}</div>
                                        <div className="entry-content">
                                            <h4>{entry.title || 'Untitled Entry'}</h4>
                                            <p>{stripHtml(entry.body).substring(0, 150)}...</p>
                                        </div>
                                        <button onClick={() => navigate(`/dashboard/entry/${entry.id}`)}>
                                            Read →
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* New Achievement Toast */}
                <AnimatePresence>
                    {newAchievement && (
                        <motion.div
                            initial={{ opacity: 0, y: 50, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 50, scale: 0.9 }}
                            className="achievement-toast"
                        >
                            <Trophy size={24} />
                            <div className="achievement-info">
                                <span className="achievement-title">Achievement Unlocked!</span>
                                <span className="achievement-name">
                                    {newAchievement.icon} {newAchievement.name}
                                </span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Achievements Section */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="achievements-section"
                >
                    <h3>
                        <Trophy size={20} />
                        <span>Achievements</span>
                        <span className="achievement-count">
                            {achievements.filter(a => a.unlocked).length}/{achievements.length}
                        </span>
                    </h3>

                    <div className="achievements-grid">
                        {achievements.map((achievement) => (
                            <div
                                key={achievement.type}
                                className={`achievement-badge ${achievement.unlocked ? 'unlocked' : 'locked'}`}
                            >
                                <span className="badge-icon">{achievement.icon}</span>
                                <span className="badge-name">{achievement.name}</span>
                                {!achievement.unlocked && (
                                    <span className="badge-hint">{achievement.description}</span>
                                )}
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* PIN Modal for private entries */}
            <PinModal
                isOpen={showPinModal}
                mode={pinModalMode}
                onSuccess={handlePinSuccess}
                onClose={handlePinClose}
            />
        </div>
    );
}

export default MemoryRoulette;

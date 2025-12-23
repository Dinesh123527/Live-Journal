import { AnimatePresence, motion } from 'framer-motion';
import {
    ArrowLeft,
    Droplets,
    Flame,
    Leaf,
    Share2,
    Sparkles,
    Trophy
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar/Navbar';
import axiosInstance from '../../utils/axiosInstance';
import './GratitudeGarden.scss';

// Rarity colors
const RARITY_COLORS = {
    common: '#9ca3af',
    uncommon: '#22c55e',
    rare: '#3b82f6',
    legendary: '#f59e0b'
};

// Category labels
const CATEGORY_LABELS = {
    happy: { label: 'Happy', color: '#fbbf24' },
    sad: { label: 'Calming', color: '#8b5cf6' },
    calm: { label: 'Peaceful', color: '#06b6d4' },
    excited: { label: 'Energetic', color: '#ec4899' },
    grateful: { label: 'Grateful', color: '#f59e0b' },
    neutral: { label: 'Steady', color: '#6b7280' }
};

function GratitudeGarden() {
    const navigate = useNavigate();
    const gardenRef = useRef(null);
    const [garden, setGarden] = useState(null);
    const [plants, setPlants] = useState([]);
    const [stats, setStats] = useState(null);
    const [achievements, setAchievements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [watering, setWatering] = useState(false);
    const [wateringAnimation, setWateringAnimation] = useState(false);
    const [newAchievement, setNewAchievement] = useState(null);
    const [userProfileInfo, setUserProfileInfo] = useState({ name: 'User', email: '' });
    const [selectedPlant, setSelectedPlant] = useState(null);

    useEffect(() => {
        fetchGarden();
        fetchAchievements();
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

    const fetchGarden = async () => {
        try {
            const res = await axiosInstance.get('/garden');
            setGarden(res.data.garden);
            setPlants(res.data.plants);
            setStats(res.data.stats);
        } catch (err) {
            console.error('Failed to fetch garden:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchAchievements = async () => {
        try {
            const res = await axiosInstance.get('/garden/achievements');
            setAchievements(res.data.achievements);
        } catch (err) {
            console.error('Failed to fetch achievements:', err);
        }
    };

    const waterGarden = async () => {
        if (watering) return;
        setWatering(true);
        setWateringAnimation(true);

        try {
            const res = await axiosInstance.post('/garden/water');

            if (res.data.alreadyWatered) {
                // Already watered today
                setWateringAnimation(false);
            } else {
                // Successfully watered
                setGarden(prev => ({
                    ...prev,
                    streak: res.data.streak,
                    longestStreak: res.data.longestStreak,
                    xp: res.data.totalXp,
                    needsWatering: false
                }));

                // Show achievement if unlocked
                if (res.data.achievements && res.data.achievements.length > 0) {
                    setNewAchievement(res.data.achievements[0]);
                    setTimeout(() => setNewAchievement(null), 5000);
                    fetchAchievements();
                }
            }

            // Stop animation after delay
            setTimeout(() => setWateringAnimation(false), 2000);
        } catch (err) {
            console.error('Failed to water garden:', err);
            setWateringAnimation(false);
        } finally {
            setWatering(false);
        }
    };

    const shareGarden = async () => {
        if (navigator.share && gardenRef.current) {
            try {
                const html2canvas = (await import('html2canvas')).default;
                const canvas = await html2canvas(gardenRef.current, {
                    scale: 2,
                    backgroundColor: '#1a1a2e'
                });
                canvas.toBlob(async (blob) => {
                    if (blob) {
                        const file = new File([blob], 'my-garden.png', { type: 'image/png' });
                        try {
                            await navigator.share({
                                files: [file],
                                title: 'My Gratitude Garden',
                                text: `My garden has ${plants.length} plants at level ${garden?.level}!`
                            });
                        } catch (shareErr) {
                            if (shareErr.name === 'AbortError') {
                                console.log('Share cancelled by user');
                            } else {
                                console.error('Share failed:', shareErr);
                            }
                        }
                    }
                });
            } catch (err) {
                console.error('Failed to capture garden:', err);
            }
        }
    };

    const getXpProgress = () => {
        if (!garden) return 0;
        const prevLevelXp = garden.level * 100 + (garden.level - 2) * 50;
        const currentLevelXp = garden.nextLevelXp;
        const xpInLevel = garden.xp - prevLevelXp;
        const xpNeeded = currentLevelXp - prevLevelXp;
        return Math.min((xpInLevel / xpNeeded) * 100, 100);
    };

    if (loading) {
        return (
            <div className="gratitude-garden-page">
                <Navbar isAuthenticated={true} userProfileInfo={userProfileInfo} />
                <div className="loading-container">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                        className="loading-icon"
                    >
                        <Leaf size={48} />
                    </motion.div>
                    <p>Growing your garden...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="gratitude-garden-page">
            <Navbar isAuthenticated={true} userProfileInfo={userProfileInfo} />

            <div className="garden-content">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="garden-header"
                >
                    <button className="back-btn" onClick={() => navigate('/dashboard')}>
                        <ArrowLeft size={20} />
                        <span>Back to Dashboard</span>
                    </button>

                    <div className="header-info">
                        <h1>
                            <Leaf className="header-icon" />
                            My Gratitude Garden
                        </h1>
                        <p>Watch your emotional journey bloom</p>
                    </div>

                    <div className="header-stats">
                        <div className="stat-item level">
                            <Sparkles size={18} />
                            <span>Level {garden?.level || 1}</span>
                        </div>
                        <div className="stat-item streak">
                            <Flame size={18} />
                            <span>{garden?.streak || 0} day streak</span>
                        </div>
                    </div>
                </motion.div>

                {/* XP Progress Bar */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="xp-bar-container"
                >
                    <div className="xp-info">
                        <span className="xp-label">Experience</span>
                        <span className="xp-value">{garden?.xp || 0} / {garden?.nextLevelXp || 150} XP</span>
                    </div>
                    <div className="xp-bar">
                        <motion.div
                            className="xp-fill"
                            initial={{ width: 0 }}
                            animate={{ width: `${getXpProgress()}%` }}
                            transition={{ duration: 1, delay: 0.3 }}
                        />
                    </div>
                </motion.div>

                {/* Garden Visualization */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className={`garden-container ${wateringAnimation ? 'watering' : ''}`}
                    ref={gardenRef}
                >
                    <div className="garden-title">
                        <span className="plant-count">{plants.length} Plants Growing</span>
                        <button
                            className="share-btn"
                            onClick={shareGarden}
                            title="Share Garden"
                        >
                            <Share2 size={18} />
                        </button>
                    </div>

                    <div className="garden-grid">
                        {plants.length === 0 ? (
                            <div className="empty-garden">
                                <Leaf size={64} />
                                <h3>Your garden awaits!</h3>
                                <p>Write journal entries to plant flowers based on your mood.</p>
                                <button
                                    className="start-btn"
                                    onClick={() => navigate('/dashboard/new-entry')}
                                >
                                    Write Your First Entry
                                </button>
                            </div>
                        ) : (
                            plants.map((plant, index) => (
                                <motion.div
                                    key={plant.id}
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: index * 0.02 }}
                                    className={`plant-item ${plant.rarity}`}
                                    onClick={() => setSelectedPlant(plant)}
                                    style={{ '--rarity-color': RARITY_COLORS[plant.rarity] }}
                                >
                                    <span className="plant-emoji">{plant.emoji}</span>
                                    {plant.rarity !== 'common' && (
                                        <span className="rarity-indicator" />
                                    )}
                                </motion.div>
                            ))
                        )}
                    </div>

                    {/* Watering Animation Overlay */}
                    <AnimatePresence>
                        {wateringAnimation && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="watering-overlay"
                            >
                                <div className="water-drops">
                                    {[...Array(20)].map((_, i) => (
                                        <motion.div
                                            key={i}
                                            className="drop"
                                            initial={{ y: -50, opacity: 0 }}
                                            animate={{
                                                y: 300,
                                                opacity: [0, 1, 1, 0],
                                            }}
                                            transition={{
                                                duration: 1.5,
                                                delay: i * 0.1,
                                                ease: 'easeIn'
                                            }}
                                            style={{ left: `${Math.random() * 100}%` }}
                                        >
                                            💧
                                        </motion.div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Water Button */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="water-section"
                >
                    <button
                        className={`water-btn ${garden?.needsWatering ? 'needs-water' : ''} ${watering ? 'watering' : ''}`}
                        onClick={waterGarden}
                        disabled={watering}
                    >
                        <Droplets className={watering ? 'animating' : ''} />
                        <span>{garden?.needsWatering ? 'Water Your Garden' : 'Water Garden'}</span>
                    </button>
                    {garden?.needsWatering && (
                        <p className="water-reminder">Your plants are thirsty! Water them to maintain your streak.</p>
                    )}
                </motion.div>

                {/* Stats Section */}
                {stats && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="stats-section"
                    >
                        <h3>Plant Collection</h3>
                        <div className="stats-grid">
                            {Object.entries(CATEGORY_LABELS).map(([key, { label, color }]) => (
                                <div
                                    key={key}
                                    className="stat-card"
                                    style={{ '--stat-color': color }}
                                >
                                    <span className="stat-count">{stats.byCategory[key] || 0}</span>
                                    <span className="stat-label">{label}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* Achievements Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="achievements-section"
                >
                    <h3>
                        <Trophy size={20} />
                        <span>Garden Achievements</span>
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

                {/* Achievement Toast */}
                <AnimatePresence>
                    {newAchievement && (
                        <motion.div
                            initial={{ y: 100, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 100, opacity: 0 }}
                            className="achievement-toast"
                        >
                            <span className="toast-icon">{newAchievement.icon}</span>
                            <div className="toast-content">
                                <span className="toast-title">Achievement Unlocked!</span>
                                <span className="toast-name">{newAchievement.name}</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Plant Detail Modal */}
                <AnimatePresence>
                    {selectedPlant && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="plant-modal-overlay"
                            onClick={() => setSelectedPlant(null)}
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="plant-modal"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="plant-modal-header" style={{ '--rarity-color': RARITY_COLORS[selectedPlant.rarity] }}>
                                    <span className="plant-emoji-large">{selectedPlant.emoji}</span>
                                </div>
                                <div className="plant-modal-body">
                                    <h3>{selectedPlant.name}</h3>
                                    <span className={`rarity-badge ${selectedPlant.rarity}`}>
                                        {selectedPlant.rarity}
                                    </span>
                                    <p className="plant-description">{selectedPlant.description}</p>
                                    <div className="plant-meta">
                                        <span className="category">
                                            {CATEGORY_LABELS[selectedPlant.category]?.label || selectedPlant.category}
                                        </span>
                                        <span className="planted-date">
                                            Planted {new Date(selectedPlant.planted_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                                <button className="close-modal-btn" onClick={() => setSelectedPlant(null)}>
                                    Close
                                </button>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

export default GratitudeGarden;

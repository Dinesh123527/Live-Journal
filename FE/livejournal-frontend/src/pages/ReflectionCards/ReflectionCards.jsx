import { motion } from 'framer-motion';
import {
    ArrowLeft,
    BarChart3,
    Calendar,
    Download,
    FileText,
    Flame,
    Heart,
    Quote,
    RefreshCw,
    Share2,
    Sparkles,
    TrendingUp,
    Type
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar/Navbar';
import axiosInstance from '../../utils/axiosInstance';
import './ReflectionCards.scss';

// Card template designs
const CARD_TEMPLATES = [
    { id: 'gradient-purple', bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
    { id: 'gradient-sunset', bg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
    { id: 'gradient-ocean', bg: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
    { id: 'gradient-forest', bg: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' },
    { id: 'gradient-night', bg: 'linear-gradient(135deg, #0c3483 0%, #a2b6df 100%)' },
];

function ReflectionCards() {
    const navigate = useNavigate();
    const cardRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [cardData, setCardData] = useState(null);
    const [activeCard, setActiveCard] = useState('weekly');
    const [selectedTemplate, setSelectedTemplate] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    const [userProfileInfo, setUserProfileInfo] = useState({ name: 'User', email: '' });

    useEffect(() => {
        fetchCardData();
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

    const fetchCardData = async () => {
        try {
            setLoading(true);
            const res = await axiosInstance.get('/reflection-cards/all');
            setCardData(res.data);
        } catch (err) {
            console.error('Failed to fetch card data:', err);
        } finally {
            setLoading(false);
        }
    };

    const refreshQuote = async () => {
        setRefreshing(true);
        try {
            const res = await axiosInstance.get('/reflection-cards/random-quote');
            if (res.data.quote) {
                setCardData(prev => ({
                    ...prev,
                    quote: {
                        text: res.data.quote,
                        entryId: res.data.entryId,
                        entryDate: res.data.entryDate,
                        mood: res.data.mood
                    }
                }));
            }
        } catch (err) {
            console.error('Failed to refresh quote:', err);
        } finally {
            setRefreshing(false);
        }
    };

    const downloadCard = async () => {
        // Use html2canvas if available, otherwise show a message
        if (cardRef.current) {
            try {
                const html2canvas = (await import('html2canvas')).default;
                const canvas = await html2canvas(cardRef.current, {
                    scale: 2,
                    backgroundColor: null,
                    useCORS: true
                });
                const link = document.createElement('a');
                link.download = `reflection-card-${Date.now()}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
            } catch (err) {
                console.error('Download failed:', err);
                alert('Please install html2canvas: npm install html2canvas');
            }
        }
    };

    const shareCard = async () => {
        if (navigator.share && cardRef.current) {
            try {
                const html2canvas = (await import('html2canvas')).default;
                const canvas = await html2canvas(cardRef.current, { scale: 2 });
                canvas.toBlob(async (blob) => {
                    if (blob) {
                        const file = new File([blob], 'reflection-card.png', { type: 'image/png' });
                        try {
                            await navigator.share({
                                files: [file],
                                title: 'My Journal Reflection',
                                text: 'Check out my journaling stats!'
                            });
                        } catch (shareErr) {
                            // User cancelled the share - this is expected behavior, not an error
                            if (shareErr.name === 'AbortError') {
                                console.log('Share cancelled by user');
                                return;
                            }
                            console.error('Share failed:', shareErr);
                        }
                    }
                });
            } catch (err) {
                console.error('Canvas generation failed:', err);
            }
        } else {
            downloadCard();
        }
    };

    const getMoodEmoji = (mood) => {
        const moodEmojis = {
            happy: '😊', sad: '😢', angry: '😠', anxious: '😰',
            excited: '🤩', peaceful: '😌', grateful: '🙏', neutral: '😐',
            hopeful: '🌟', nostalgic: '💭', confident: '💪', tired: '😴'
        };
        return moodEmojis[mood?.toLowerCase()] || '📝';
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="reflection-cards-page">
                <Navbar isAuthenticated={true} userProfileInfo={userProfileInfo} />
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Loading your reflection cards...</p>
                </div>
            </div>
        );
    }

    const stats = activeCard === 'weekly' ? cardData?.weekly : cardData?.monthly;
    const period = activeCard === 'weekly' ? 'This Week' : 'This Month';

    return (
        <div className="reflection-cards-page">
            <Navbar isAuthenticated={true} userProfileInfo={userProfileInfo} />

            <div className="cards-content">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="cards-header"
                >
                    <button className="back-btn" onClick={() => navigate('/dashboard')}>
                        <ArrowLeft size={20} />
                        <span>Back to Dashboard</span>
                    </button>

                    <div className="header-title">
                        <h1>✨ Reflection Cards</h1>
                        <p>Beautiful stats from your journaling journey</p>
                    </div>
                </motion.div>

                {/* Card Type Tabs */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="card-tabs"
                >
                    <button
                        className={`tab-btn ${activeCard === 'weekly' ? 'active' : ''}`}
                        onClick={() => setActiveCard('weekly')}
                    >
                        <Calendar size={18} />
                        <span>Weekly</span>
                    </button>
                    <button
                        className={`tab-btn ${activeCard === 'monthly' ? 'active' : ''}`}
                        onClick={() => setActiveCard('monthly')}
                    >
                        <BarChart3 size={18} />
                        <span>Monthly</span>
                    </button>
                    <button
                        className={`tab-btn ${activeCard === 'quote' ? 'active' : ''}`}
                        onClick={() => setActiveCard('quote')}
                    >
                        <Quote size={18} />
                        <span>Quote</span>
                    </button>
                    <button
                        className={`tab-btn ${activeCard === 'words' ? 'active' : ''}`}
                        onClick={() => setActiveCard('words')}
                    >
                        <Type size={18} />
                        <span>Top Words</span>
                    </button>
                </motion.div>

                {/* Template Selector */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="template-selector"
                >
                    {CARD_TEMPLATES.map((template, idx) => (
                        <button
                            key={template.id}
                            className={`template-btn ${selectedTemplate === idx ? 'active' : ''}`}
                            style={{ background: template.bg }}
                            onClick={() => setSelectedTemplate(idx)}
                        />
                    ))}
                </motion.div>

                {/* Card Preview */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="card-preview-container"
                >
                    <div
                        ref={cardRef}
                        className="reflection-card"
                        style={{ background: CARD_TEMPLATES[selectedTemplate].bg }}
                    >
                        {(activeCard === 'weekly' || activeCard === 'monthly') && stats && (
                            <div className="stats-card-content">
                                <div className="card-logo">
                                    <Sparkles size={24} />
                                    <span>Live Journal</span>
                                </div>

                                <h2 className="card-title">{period}</h2>

                                <div className="stats-grid">
                                    <div className="stat-item">
                                        <FileText size={28} />
                                        <span className="stat-value">{stats.entryCount}</span>
                                        <span className="stat-label">Entries</span>
                                    </div>
                                    <div className="stat-item">
                                        <Type size={28} />
                                        <span className="stat-value">{stats.wordCount.toLocaleString()}</span>
                                        <span className="stat-label">Words</span>
                                    </div>
                                    <div className="stat-item">
                                        <Calendar size={28} />
                                        <span className="stat-value">{stats.daysActive}</span>
                                        <span className="stat-label">Days Active</span>
                                    </div>
                                    {cardData.streak && (
                                        <div className="stat-item">
                                            <Flame size={28} />
                                            <span className="stat-value">{cardData.streak.current}</span>
                                            <span className="stat-label">Day Streak</span>
                                        </div>
                                    )}
                                </div>

                                {Object.keys(stats.moodBreakdown || {}).length > 0 && (
                                    <div className="mood-summary">
                                        <span className="mood-label">Moods:</span>
                                        <div className="mood-tags">
                                            {Object.entries(stats.moodBreakdown).slice(0, 4).map(([mood, count]) => (
                                                <span key={mood} className="mood-tag">
                                                    {getMoodEmoji(mood)} {mood}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="card-footer">
                                    <span>{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                                </div>
                            </div>
                        )}

                        {activeCard === 'quote' && (
                            <div className="quote-card-content">
                                <div className="card-logo">
                                    <Heart size={24} />
                                    <span>From My Journal</span>
                                </div>

                                <Quote size={40} className="quote-icon" />

                                {cardData?.quote ? (
                                    <>
                                        <p className="quote-text">{cardData.quote.text}</p>
                                        <div className="quote-meta">
                                            <span className="quote-date">{formatDate(cardData.quote.entryDate)}</span>
                                            {cardData.quote.mood && (
                                                <span className="quote-mood">{getMoodEmoji(cardData.quote.mood)}</span>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <p className="no-quote">Write more entries to see quotes!</p>
                                )}

                                <div className="card-footer">
                                    <span>Live Journal</span>
                                </div>
                            </div>
                        )}

                        {activeCard === 'words' && (
                            <div className="words-card-content">
                                <div className="card-logo">
                                    <TrendingUp size={24} />
                                    <span>My Top Words</span>
                                </div>

                                <h2 className="card-title">This Month</h2>

                                {cardData?.topWords?.length > 0 ? (
                                    <div className="word-cloud">
                                        {cardData.topWords.map((item, idx) => (
                                            <span
                                                key={item.word}
                                                className="word-item"
                                                style={{
                                                    fontSize: `${Math.max(0.8, 1.5 - idx * 0.1)}rem`,
                                                    opacity: Math.max(0.6, 1 - idx * 0.05)
                                                }}
                                            >
                                                {item.word}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="no-words">Write more to see your top words!</p>
                                )}

                                <div className="card-footer">
                                    <span>Live Journal</span>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Action Buttons */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="card-actions"
                >
                    {activeCard === 'quote' && (
                        <button className="action-btn refresh" onClick={refreshQuote} disabled={refreshing}>
                            <RefreshCw size={18} className={refreshing ? 'spinning' : ''} />
                            <span>New Quote</span>
                        </button>
                    )}
                    <button className="action-btn download" onClick={downloadCard}>
                        <Download size={18} />
                        <span>Download</span>
                    </button>
                    <button className="action-btn share" onClick={shareCard}>
                        <Share2 size={18} />
                        <span>Share</span>
                    </button>
                </motion.div>
            </div>
        </div>
    );
}

export default ReflectionCards;

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Heart, Home, LogIn, MessageSquare, Send, Sparkles, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar/Navbar';
import axiosInstance from '../../utils/axiosInstance';
import ScrollProgressBar from '../../components/ScrollProgressBar/ScrollProgressBar.jsx';
import './Logout.scss';

const Logout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [rating, setRating] = useState(0);
    const [hoveredRating, setHoveredRating] = useState(0);
    const [feedback, setFeedback] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Get user info from navigation state
    const userInfo = location.state?.userInfo || null;

    // Check if user came from a valid logout action
    useEffect(() => {
        if (!location.state?.fromLogout) {
            navigate('/unauthorized', { replace: true });
        }
    }, [location.state, navigate]);

    const ratingEmojis = {
        1: { emoji: '😞', label: 'Not great', color: '#ef4444' },
        2: { emoji: '😕', label: 'Could be better', color: '#f97316' },
        3: { emoji: '🙂', label: 'It\'s okay', color: '#eab308' },
        4: { emoji: '😊', label: 'Pretty good!', color: '#22c55e' },
        5: { emoji: '🤩', label: 'Loved it!', color: '#8b5cf6' }
    };

    const currentRating = hoveredRating || rating;

    const handleSubmit = async () => {
        if (rating > 0 && !isSubmitting) {
            setIsSubmitting(true);

            try {
                await axiosInstance.post('/feedback', {
                    rating,
                    feedback,
                    username: userInfo?.username || 'Anonymous',
                    email: userInfo?.email || null
                });
            } catch (error) {
                console.error('Failed to send feedback:', error);
            }

            setSubmitted(true);
            setShowConfetti(true);
            setIsSubmitting(false);

            setTimeout(() => setShowConfetti(false), 3000);
        }
    };

    const confettiParticles = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 0.5,
        duration: 2 + Math.random() * 2,
        size: 8 + Math.random() * 8,
        color: ['#8b5cf6', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#ec4899'][Math.floor(Math.random() * 6)]
    }));

    return (
        <div className="logout-page">
            <Navbar />
            <ScrollProgressBar />
            <div className="background-decoration">
                <div className="gradient-orb orb-1" />
                <div className="gradient-orb orb-2" />
                <div className="gradient-orb orb-3" />
            </div>

            <AnimatePresence>
                {showConfetti && (
                    <div className="confetti-container">
                        {confettiParticles.map((particle) => (
                            <motion.div
                                key={particle.id}
                                className="confetti-particle"
                                initial={{
                                    x: `${particle.x}vw`,
                                    y: -20,
                                    opacity: 1,
                                    rotate: 0,
                                    scale: 1
                                }}
                                animate={{
                                    y: '100vh',
                                    opacity: 0,
                                    rotate: 360 * (Math.random() > 0.5 ? 1 : -1),
                                    scale: 0.5
                                }}
                                exit={{ opacity: 0 }}
                                transition={{
                                    duration: particle.duration,
                                    delay: particle.delay,
                                    ease: 'easeOut'
                                }}
                                style={{
                                    width: particle.size,
                                    height: particle.size,
                                    backgroundColor: particle.color,
                                    borderRadius: Math.random() > 0.5 ? '50%' : '2px'
                                }}
                            />
                        ))}
                    </div>
                )}
            </AnimatePresence>

            <div className="logout-content">
                <motion.div
                    className="logout-card"
                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                >
                    {/* Floating Icons */}
                    <div className="floating-icons">
                        <motion.span
                            className="float-icon icon-1"
                            animate={{ y: [-10, 10, -10], rotate: [-5, 5, -5] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        >
                            👋
                        </motion.span>
                        <motion.span
                            className="float-icon icon-2"
                            animate={{ y: [10, -10, 10], rotate: [5, -5, 5] }}
                            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                        >
                            ✨
                        </motion.span>
                        <motion.span
                            className="float-icon icon-3"
                            animate={{ y: [-5, 15, -5], rotate: [-3, 3, -3] }}
                            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
                        >
                            💜
                        </motion.span>
                    </div>

                    {/* Hero Section */}
                    <motion.div
                        className="hero-section"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                    >
                        <div className="hero-badge">
                            <Sparkles size={16} />
                            <span>See you soon!</span>
                        </div>
                        <h1>Thanks for journaling with us!</h1>
                        <p>We hope Live Journal helped you capture your thoughts and reflect on your journey.</p>
                    </motion.div>

                    {!submitted ? (
                        <>
                            {/* Rating Section */}
                            <motion.div
                                className="rating-section"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3, duration: 0.5 }}
                            >
                                <h2>How was your experience?</h2>

                                <div className="star-rating">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <motion.button
                                            key={star}
                                            className={`star-btn ${star <= currentRating ? 'active' : ''}`}
                                            onClick={() => setRating(star)}
                                            onMouseEnter={() => setHoveredRating(star)}
                                            onMouseLeave={() => setHoveredRating(0)}
                                            whileHover={{ scale: 1.2 }}
                                            whileTap={{ scale: 0.9 }}
                                            style={{
                                                color: star <= currentRating ? ratingEmojis[currentRating]?.color : undefined
                                            }}
                                        >
                                            <Star
                                                size={36}
                                                fill={star <= currentRating ? 'currentColor' : 'none'}
                                            />
                                        </motion.button>
                                    ))}
                                </div>

                                {/* Emoji Reaction */}
                                <AnimatePresence mode="wait">
                                    {currentRating > 0 && (
                                        <motion.div
                                            key={currentRating}
                                            className="rating-reaction"
                                            initial={{ opacity: 0, scale: 0.5, y: 10 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.5, y: -10 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <span className="reaction-emoji">{ratingEmojis[currentRating].emoji}</span>
                                            <span
                                                className="reaction-label"
                                                style={{ color: ratingEmojis[currentRating].color }}
                                            >
                                                {ratingEmojis[currentRating].label}
                                            </span>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>

                            {/* Feedback Section */}
                            <motion.div
                                className="feedback-section"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4, duration: 0.5 }}
                            >
                                <div className="feedback-header">
                                    <MessageSquare size={18} />
                                    <span>Any thoughts to share? (Optional)</span>
                                </div>
                                <textarea
                                    placeholder="Tell us what you loved or how we can improve..."
                                    value={feedback}
                                    onChange={(e) => setFeedback(e.target.value)}
                                    maxLength={500}
                                />
                                <div className="char-count">{feedback.length}/500</div>
                            </motion.div>

                            {/* Submit Button */}
                            <motion.button
                                className={`submit-btn ${rating > 0 && !isSubmitting ? 'active' : ''}`}
                                onClick={handleSubmit}
                                disabled={rating === 0 || isSubmitting}
                                whileHover={rating > 0 && !isSubmitting ? { scale: 1.02 } : {}}
                                whileTap={rating > 0 && !isSubmitting ? { scale: 0.98 } : {}}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5, duration: 0.5 }}
                            >
                                <Send size={18} />
                                <span>{isSubmitting ? 'Sending...' : 'Submit Feedback'}</span>
                            </motion.button>
                        </>
                    ) : (
                        /* Thank You State */
                        <motion.div
                            className="thank-you-section"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5 }}
                        >
                            <motion.div
                                className="thank-you-icon"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                            >
                                <Heart size={48} fill="currentColor" />
                            </motion.div>
                            <h2>Thank you for your feedback!</h2>
                            <p>Your input helps us make Live Journal even better.</p>
                        </motion.div>
                    )}

                    {/* Action Buttons */}
                    <motion.div
                        className="action-buttons"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: submitted ? 0.3 : 0.6, duration: 0.5 }}
                    >
                        <button
                            className="action-btn primary"
                            onClick={() => navigate('/login')}
                        >
                            <LogIn size={18} />
                            <span>Log back in</span>
                            <ArrowRight size={16} className="arrow" />
                        </button>
                        <button
                            className="action-btn secondary"
                            onClick={() => navigate('/')}
                        >
                            <Home size={18} />
                            <span>Explore Live Journal</span>
                        </button>
                    </motion.div>
                </motion.div>

                {/* Footer */}
                <motion.p
                    className="logout-footer"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8, duration: 0.5 }}
                >
                    You've been successfully logged out. Your data is safe with us. 🔒
                </motion.p>
            </div>
        </div>
    );
};

export default Logout;

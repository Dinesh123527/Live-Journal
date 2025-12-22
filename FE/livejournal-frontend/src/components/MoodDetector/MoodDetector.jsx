import { Brain, Check, ChevronDown, Loader, RefreshCw } from 'lucide-react';
import PropTypes from 'prop-types';
import { useCallback, useEffect, useRef, useState } from 'react';
import axiosInstance from '../../utils/axiosInstance';
import './MoodDetector.scss';

const moodConfig = {
    happy: { emoji: '😊', color: '#22c55e', gradient: 'linear-gradient(135deg, #22c55e, #16a34a)' },
    sad: { emoji: '😢', color: '#3b82f6', gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)' },
    anxious: { emoji: '😰', color: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)' },
    angry: { emoji: '😠', color: '#ef4444', gradient: 'linear-gradient(135deg, #ef4444, #dc2626)' },
    calm: { emoji: '😌', color: '#06b6d4', gradient: 'linear-gradient(135deg, #06b6d4, #0891b2)' },
    stressed: { emoji: '😫', color: '#f97316', gradient: 'linear-gradient(135deg, #f97316, #ea580c)' },
    neutral: { emoji: '😐', color: '#8b5cf6', gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }
};

const allMoods = [
    { value: 'happy', label: 'Happy', emoji: '😊' },
    { value: 'sad', label: 'Sad', emoji: '😢' },
    { value: 'anxious', label: 'Anxious', emoji: '😰' },
    { value: 'angry', label: 'Angry', emoji: '😠' },
    { value: 'calm', label: 'Calm', emoji: '😌' },
    { value: 'stressed', label: 'Stressed', emoji: '😫' },
    { value: 'neutral', label: 'Neutral', emoji: '😐' }
];

const MoodDetector = ({
    text,
    onMoodDetected,
    currentMood,
    disabled = false,
    debounceMs = 2000
}) => {
    const [detecting, setDetecting] = useState(false);
    const [detectedMood, setDetectedMood] = useState(null);
    const [showOverrideMenu, setShowOverrideMenu] = useState(false);
    const [isAccepted, setIsAccepted] = useState(false);
    const debounceTimerRef = useRef(null);
    const lastDetectedTextRef = useRef('');
    const overrideMenuRef = useRef(null);

    // Detect mood from text
    const detectMood = useCallback(async (textToAnalyze) => {
        if (!textToAnalyze || textToAnalyze.trim().length < 20) {
            return;
        }

        // Skip if same text already detected
        if (textToAnalyze.trim() === lastDetectedTextRef.current.trim()) {
            return;
        }

        setDetecting(true);
        try {
            const response = await axiosInstance.post('/ai/detect-mood', {
                text: textToAnalyze
            });

            if (response.data && response.data.mood_label) {
                lastDetectedTextRef.current = textToAnalyze;
                setDetectedMood(response.data);
                setIsAccepted(false);
            }
        } catch (err) {
            console.error('Mood detection error:', err);
        } finally {
            setDetecting(false);
        }
    }, []);

    // Debounced text change detection
    useEffect(() => {
        if (disabled || isAccepted) return;

        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        // Only detect if text is long enough
        if (text && text.trim().length >= 20) {
            debounceTimerRef.current = setTimeout(() => {
                detectMood(text);
            }, debounceMs);
        }

        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, [text, detectMood, debounceMs, disabled, isAccepted]);

    // Close override menu on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (overrideMenuRef.current && !overrideMenuRef.current.contains(event.target)) {
                setShowOverrideMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Accept detected mood
    const handleAccept = () => {
        if (detectedMood && onMoodDetected) {
            onMoodDetected(detectedMood.mood_label, detectedMood.mood_score);
            setIsAccepted(true);
        }
    };

    // Override with different mood
    const handleOverride = (mood) => {
        if (onMoodDetected) {
            onMoodDetected(mood.value, 0.8);
        }
        setDetectedMood({
            mood_label: mood.value,
            mood_score: 0.8,
            confidence: 1,
            emoji: mood.emoji,
            description: `Manually set to ${mood.label}`
        });
        setIsAccepted(true);
        setShowOverrideMenu(false);
    };

    // Re-detect mood
    const handleRedetect = () => {
        lastDetectedTextRef.current = '';
        setIsAccepted(false);
        setDetectedMood(null);
        if (text && text.trim().length >= 20) {
            detectMood(text);
        }
    };

    // Don't render if no text or disabled
    if (!text || text.trim().length < 20 || disabled) {
        return null;
    }

    const config = detectedMood ? moodConfig[detectedMood.mood_label] || moodConfig.neutral : moodConfig.neutral;
    const confidencePercent = detectedMood ? Math.round((detectedMood.confidence || 0.5) * 100) : 0;

    return (
        <div className={`mood-detector ${detecting ? 'detecting' : ''} ${isAccepted ? 'accepted' : ''}`}>
            <div className="mood-detector-content">
                {detecting ? (
                    <div className="mood-detecting">
                        <Loader className="spinner" size={18} />
                        <span>Analyzing mood...</span>
                    </div>
                ) : detectedMood ? (
                    <>
                        <div className="mood-result">
                            <div
                                className="mood-emoji"
                                style={{ background: config.gradient }}
                            >
                                <span>{detectedMood.emoji || config.emoji}</span>
                            </div>
                            <div className="mood-info">
                                <div className="mood-label-row">
                                    <Brain size={14} />
                                    <span className="mood-label">{detectedMood.mood_label}</span>
                                    {isAccepted && <span className="accepted-badge">Accepted</span>}
                                </div>
                                <div className="mood-confidence">
                                    <div className="confidence-bar">
                                        <div
                                            className="confidence-fill"
                                            style={{ width: `${confidencePercent}%`, background: config.color }}
                                        />
                                    </div>
                                    <span className="confidence-text">{confidencePercent}% confident</span>
                                </div>
                            </div>
                        </div>

                        <div className="mood-actions">
                            {!isAccepted ? (
                                <>
                                    <button
                                        className="mood-action-btn accept"
                                        onClick={handleAccept}
                                        title="Accept detected mood"
                                    >
                                        <Check size={14} />
                                        <span>Accept</span>
                                    </button>
                                    <div className="override-dropdown" ref={overrideMenuRef}>
                                        <button
                                            className="mood-action-btn override"
                                            onClick={() => setShowOverrideMenu(!showOverrideMenu)}
                                            title="Choose different mood"
                                        >
                                            <span>Change</span>
                                            <ChevronDown size={12} />
                                        </button>
                                        {showOverrideMenu && (
                                            <div className="override-menu">
                                                {allMoods.map((mood) => (
                                                    <button
                                                        key={mood.value}
                                                        className="override-option"
                                                        onClick={() => handleOverride(mood)}
                                                    >
                                                        <span className="override-emoji">{mood.emoji}</span>
                                                        <span className="override-label">{mood.label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <button
                                    className="mood-action-btn redetect"
                                    onClick={handleRedetect}
                                    title="Re-analyze mood"
                                >
                                    <RefreshCw size={14} />
                                    <span>Re-analyze</span>
                                </button>
                            )}
                        </div>
                    </>
                ) : null}
            </div>
        </div>
    );
};

MoodDetector.propTypes = {
    text: PropTypes.string,
    onMoodDetected: PropTypes.func,
    currentMood: PropTypes.string,
    disabled: PropTypes.bool,
    debounceMs: PropTypes.number
};

export default MoodDetector;

import { Lightbulb, Loader, RefreshCw, Sparkles, X } from 'lucide-react';
import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';
import axiosInstance from '../../utils/axiosInstance';
import './WritingPromptsPanel.scss';

const categoryConfig = {
    gratitude: { icon: '🙏', label: 'Gratitude', color: '#22c55e' },
    reflection: { icon: '🔮', label: 'Reflection', color: '#8b5cf6' },
    goals: { icon: '🎯', label: 'Goals', color: '#f59e0b' },
    emotions: { icon: '💭', label: 'Emotions', color: '#ec4899' },
    relationships: { icon: '❤️', label: 'Relationships', color: '#ef4444' },
    creativity: { icon: '🎨', label: 'Creativity', color: '#06b6d4' },
    mindfulness: { icon: '🧘', label: 'Mindfulness', color: '#14b8a6' },
    challenges: { icon: '💪', label: 'Challenges', color: '#f97316' }
};

const WritingPromptsPanel = ({
    onSelectPrompt,
    isVisible = true,
    onClose,
    initialCategory = null
}) => {
    const [prompts, setPrompts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(initialCategory);
    const [error, setError] = useState(null);

    // Fetch available categories
    const fetchCategories = useCallback(async () => {
        try {
            const response = await axiosInstance.get('/ai/prompt-categories');
            if (response.data && response.data.categories) {
                setCategories(response.data.categories);
            }
        } catch (err) {
            console.error('Failed to fetch categories:', err);
            // Use default categories
            setCategories(Object.keys(categoryConfig));
        }
    }, []);

    // Fetch writing prompts
    const fetchPrompts = useCallback(async (refresh = false) => {
        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams();
            if (selectedCategory) params.append('category', selectedCategory);
            params.append('count', '5');
            if (refresh) params.append('refresh', 'true');

            const response = await axiosInstance.get(`/ai/prompts?${params.toString()}`);

            if (response.data && response.data.prompts) {
                setPrompts(response.data.prompts);
            }
        } catch (err) {
            console.error('Failed to fetch prompts:', err);
            setError('Failed to load writing prompts');
            // Set fallback prompts
            setPrompts([
                { text: "What's on your mind today?", category: 'reflection', id: 'fb1' },
                { text: "What are you grateful for right now?", category: 'gratitude', id: 'fb2' },
                { text: "How are you feeling at this moment?", category: 'emotions', id: 'fb3' }
            ]);
        } finally {
            setLoading(false);
        }
    }, [selectedCategory]);

    // Initial load
    useEffect(() => {
        fetchCategories();
        fetchPrompts();
    }, [fetchCategories, fetchPrompts]);

    // Refresh when category changes
    useEffect(() => {
        if (categories.length > 0) {
            fetchPrompts(true);
        }
    }, [selectedCategory]);

    // Handle prompt selection
    const handleSelectPrompt = (prompt) => {
        if (onSelectPrompt) {
            onSelectPrompt(prompt.text, prompt.category);
        }
    };

    // Handle refresh
    const handleRefresh = () => {
        fetchPrompts(true);
    };

    if (!isVisible) return null;

    return (
        <div className="writing-prompts-panel">
            <div className="prompts-panel-header">
                <div className="prompts-title">
                    <Sparkles size={18} />
                    <span>AI Writing Prompts</span>
                </div>
                <div className="prompts-header-actions">
                    <button
                        className="refresh-btn"
                        onClick={handleRefresh}
                        disabled={loading}
                        title="Get new prompts"
                    >
                        <RefreshCw size={16} className={loading ? 'spinning' : ''} />
                    </button>
                    {onClose && (
                        <button
                            className="close-btn"
                            onClick={onClose}
                            title="Close"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
            </div>

            {categories.length > 0 && (
                <div className="category-tabs">
                    <button
                        className={`category-tab ${!selectedCategory ? 'active' : ''}`}
                        onClick={() => setSelectedCategory(null)}
                    >
                        <span className="tab-icon">✨</span>
                        <span className="tab-label">All</span>
                    </button>
                    {categories.slice(0, 6).map((cat) => {
                        const config = categoryConfig[cat] || { icon: '📝', label: cat, color: '#8b5cf6' };
                        return (
                            <button
                                key={cat}
                                className={`category-tab ${selectedCategory === cat ? 'active' : ''}`}
                                onClick={() => setSelectedCategory(cat)}
                                style={{ '--tab-color': config.color }}
                            >
                                <span className="tab-icon">{config.icon}</span>
                                <span className="tab-label">{config.label}</span>
                            </button>
                        );
                    })}
                </div>
            )}

            <div className="prompts-content">
                {loading ? (
                    <div className="prompts-loading">
                        <Loader size={24} className="spinner" />
                        <span>Generating personalized prompts...</span>
                    </div>
                ) : error ? (
                    <div className="prompts-error">
                        <span>{error}</span>
                        <button onClick={handleRefresh}>Try Again</button>
                    </div>
                ) : (
                    <div className="prompts-list">
                        {prompts.map((prompt, index) => {
                            const config = categoryConfig[prompt.category] || { icon: '📝', color: '#8b5cf6' };
                            return (
                                <button
                                    key={prompt.id || index}
                                    className="prompt-card"
                                    onClick={() => handleSelectPrompt(prompt)}
                                    style={{
                                        '--prompt-color': config.color,
                                        animationDelay: `${index * 0.1}s`
                                    }}
                                >
                                    <div className="prompt-icon">{config.icon}</div>
                                    <div className="prompt-text">{prompt.text}</div>
                                    <div className="prompt-arrow">
                                        <Lightbulb size={16} />
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="prompts-footer">
                <span className="powered-by">
                    <Sparkles size={12} />
                    Powered by TensorFlow ML
                </span>
            </div>
        </div>
    );
};

WritingPromptsPanel.propTypes = {
    onSelectPrompt: PropTypes.func,
    isVisible: PropTypes.bool,
    onClose: PropTypes.func,
    initialCategory: PropTypes.string
};

export default WritingPromptsPanel;

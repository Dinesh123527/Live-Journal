import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Lightbulb,
  Flame,
  Award,
  Calendar,
  ArrowLeft,
  Save,
  Loader,
  Sparkles,
  TrendingUp,
  Tag,
  ChevronDown,
  ChevronUp,
  Edit3,
  Check,
  X,
  Plus,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../../components/Navbar/Navbar.jsx';
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal.jsx';
import axiosInstance from '../../utils/axiosInstance';
import './Learning.scss';

const Learning = () => {
  const navigate = useNavigate();
  const textareaRef = useRef(null);

  // User info
  const [username, setUsername] = useState('User');
  const [userEmail, setUserEmail] = useState('');

  // Loading states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Today's learning states
  const [todayLearning, setTodayLearning] = useState(null);
  const [hasLearningToday, setHasLearningToday] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Delete confirmation modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Form states
  const [learningText, setLearningText] = useState('');
  const [selectedMood, setSelectedMood] = useState(null);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState([]);
  const MAX_TAGS = 5;

  // Streak data
  const [streakData, setStreakData] = useState({
    current_streak: 0,
    longest_streak: 0,
    last_date: null
  });

  // Past learnings
  const [pastLearnings, setPastLearnings] = useState([]);
  const [expandedItems, setExpandedItems] = useState({});

  // Mood options
  const moodOptions = [
    { label: 'Happy', emoji: '😊', score: 0.9 },
    { label: 'Calm', emoji: '😌', score: 0.7 },
    { label: 'Okay', emoji: '🙂', score: 0.5 },
    { label: 'Stressed', emoji: '😣', score: 0.3 },
    { label: 'Low', emoji: '😞', score: 0.1 }
  ];

  // Category colors
  const categoryColors = {
    tech: { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: 'rgba(59, 130, 246, 0.3)' },
    work: { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: 'rgba(16, 185, 129, 0.3)' },
    relationships: { bg: 'rgba(236, 72, 153, 0.15)', color: '#ec4899', border: 'rgba(236, 72, 153, 0.3)' },
    mindset: { bg: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6', border: 'rgba(139, 92, 246, 0.3)' },
    health: { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.3)' },
    general: { bg: 'rgba(107, 114, 128, 0.15)', color: '#6b7280', border: 'rgba(107, 114, 128, 0.3)' }
  };

  // Fetch all data
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);

      const [userResponse, todayResponse, streakResponse, learningsResponse] = await Promise.all([
        axiosInstance.get('/auth/me'),
        axiosInstance.get('/learning/today'),
        axiosInstance.get('/learning/streak'),
        axiosInstance.get('/learning?limit=50')
      ]);

      // Set user info
      if (userResponse.data?.user) {
        setUsername(userResponse.data.user.name || 'User');
        setUserEmail(userResponse.data.user.email || '');
      }

      // Set today's learning
      if (todayResponse.data) {
        setHasLearningToday(todayResponse.data.hasLearning);
        if (todayResponse.data.learning) {
          setTodayLearning(todayResponse.data.learning);
          setLearningText(todayResponse.data.learning.text || '');
          setTags(parseTags(todayResponse.data.learning.tags));
          // Find matching mood
          const matchingMood = moodOptions.find(m => m.label.toLowerCase() === todayResponse.data.learning.mood_label?.toLowerCase());
          setSelectedMood(matchingMood || null);
        }
      }

      // Set streak data
      if (streakResponse.data) {
        setStreakData({
          current_streak: streakResponse.data.current_streak || 0,
          longest_streak: streakResponse.data.longest_streak || 0,
          last_date: streakResponse.data.last_date || null
        });
      }

      // Set past learnings
      if (learningsResponse.data?.items) {
        setPastLearnings(learningsResponse.data.items);
      }

    } catch (err) {
      console.error('Failed to fetch learning data:', err);
    } finally {
      setLoading(false);
    }
  }, [moodOptions]);

  // Handle save learning
  const handleSaveLearning = async () => {
    if (!learningText.trim()) return;

    try {
      setSaving(true);

      const payload = {
        text: learningText.trim(),
        mood_label: selectedMood?.label || null,
        mood_score: selectedMood?.score || null,
        tags: tags
      };

      const response = await axiosInstance.post('/learning', payload);

      if (response.data?.ok) {
        setTodayLearning(response.data.learning);
        setHasLearningToday(true);
        setIsEditing(false);

        // Refresh streak and learnings
        const [streakResponse, learningsResponse] = await Promise.all([
          axiosInstance.get('/learning/streak'),
          axiosInstance.get('/learning?limit=50')
        ]);

        if (streakResponse.data) {
          setStreakData({
            current_streak: streakResponse.data.current_streak || 0,
            longest_streak: streakResponse.data.longest_streak || 0,
            last_date: streakResponse.data.last_date || null
          });
        }

        if (learningsResponse.data?.items) {
          setPastLearnings(learningsResponse.data.items);
        }
      }
    } catch (err) {
      console.error('Failed to save learning:', err);
    } finally {
      setSaving(false);
    }
  };

  // Handle delete learning
  const handleDeleteLearning = async () => {
    if (!todayLearning?.id) return;

    try {
      setDeleting(true);

      const response = await axiosInstance.delete(`/learning/${todayLearning.id}`);

      if (response.data?.ok) {
        setTodayLearning(null);
        setHasLearningToday(false);

        // Refresh streak and learnings
        const [streakResponse, learningsResponse] = await Promise.all([
          axiosInstance.get('/learning/streak'),
          axiosInstance.get('/learning?limit=50')
        ]);

        if (streakResponse.data) {
          setStreakData({
            current_streak: streakResponse.data.current_streak || 0,
            longest_streak: streakResponse.data.longest_streak || 0,
            last_date: streakResponse.data.last_date || null
          });
        }

        if (learningsResponse.data?.items) {
          setPastLearnings(learningsResponse.data.items);
        }
      }
    } catch (err) {
      console.error('Failed to delete learning:', err);
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  // Helper to parse tags
  const parseTags = (tags) => {
    if (!tags) return [];
    if (Array.isArray(tags)) return tags;
    if (typeof tags === 'string') {
      try {
        const parsed = JSON.parse(tags);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        return tags.split(',').map(t => t.trim()).filter(Boolean);
      }
    }
    return [];
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Get mood emoji by label
  const getMoodEmoji = (moodLabel) => {
    const mood = moodOptions.find(m => m.label.toLowerCase() === moodLabel?.toLowerCase());
    return mood?.emoji || '🙂';
  };

  // Toggle expanded item
  const toggleExpanded = (id) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Get category style
  const getCategoryStyle = (category) => {
    return categoryColors[category?.toLowerCase()] || categoryColors.general;
  };

  // Start editing
  const startEditing = () => {
    setIsEditing(true);
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  };

  // Cancel editing
  const cancelEditing = () => {
    setIsEditing(false);
    if (todayLearning) {
      setLearningText(todayLearning.text || '');
      setTags(parseTags(todayLearning.tags));
      setTagInput('');
      const matchingMood = moodOptions.find(m => m.label.toLowerCase() === todayLearning.mood_label?.toLowerCase());
      setSelectedMood(matchingMood || null);
    } else {
      setLearningText('');
      setTags([]);
      setTagInput('');
      setSelectedMood(null);
    }
  };

  // Add tag handler
  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && tags.length < MAX_TAGS && !tags.includes(trimmedTag)) {
      setTags(prev => [...prev, trimmedTag]);
      setTagInput('');
    }
  };

  // Handle key press for tag input
  const handleTagKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  // Remove tag handler
  const handleRemoveTag = (indexToRemove) => {
    setTags(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const userProfileInfo = {
    name: username,
    email: userEmail,
  };

  if (loading) {
    return (
      <div className="learning-page">
        <Navbar isAuthenticated={true} userProfileInfo={userProfileInfo} />
        <div className="learning-loading">
          <Loader className="spinner" size={48} />
          <p>Loading your learning journey...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="learning-page">
      <Navbar isAuthenticated={true} userProfileInfo={userProfileInfo} />

      <div className="learning-content">
        {/* Back Button */}
        <motion.button
          className="pro-back-btn"
          onClick={() => navigate('/dashboard')}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <span className="back-btn-glow"></span>
          <span className="back-btn-particles">
            <span className="particle particle-1"></span>
            <span className="particle particle-2"></span>
            <span className="particle particle-3"></span>
            <span className="particle particle-4"></span>
          </span>
          <span className="back-btn-icon-wrapper">
            <ArrowLeft size={20} className="back-icon" />
          </span>
          <span className="back-btn-text-wrapper">
            <span className="back-btn-text">Back to Dashboard</span>
            <span className="back-btn-text-shadow">Back to Dashboard</span>
          </span>
          <span className="back-btn-shine"></span>
        </motion.button>

        {/* Header */}
        <motion.div
          className="learning-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="header-icon">
            <Lightbulb size={48} />
          </div>
          <h1>Learning Moments</h1>
          <p>Capture one key insight each day to fuel your growth</p>
        </motion.div>

        {/* Streak & Insights Bar */}
        <motion.div
          className="streak-insights-bar"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="streak-card">
            <div className="streak-icon">
              <Flame size={28} />
            </div>
            <div className="streak-info">
              <span className="streak-number">{streakData.current_streak}</span>
              <span className="streak-label">Day Streak</span>
            </div>
            <div className="streak-glow"></div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <Award size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-number">{streakData.longest_streak}</span>
              <span className="stat-label">Best Streak</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <Calendar size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-number">{pastLearnings.length}</span>
              <span className="stat-label">Total Learnings</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="streak-progress">
            <div className="progress-label">
              <span>Weekly Progress</span>
              <span>{Math.min(streakData.current_streak, 7)}/7 days</span>
            </div>
            <div className="progress-bar">
              <motion.div
                className="progress-fill"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((streakData.current_streak / 7) * 100, 100)}%` }}
                transition={{ duration: 1, delay: 0.5 }}
              />
            </div>
          </div>
        </motion.div>

        {/* Today's Reflection Editor */}
        <motion.div
          className="today-reflection-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="card-header">
            <div className="header-content">
              <Sparkles size={24} className="header-icon-sparkle" />
              <div>
                <h2>What did you learn today?</h2>
                <p>Capture one meaningful insight from your day</p>
              </div>
            </div>
            {hasLearningToday && !isEditing && (
              <div className="status-badge captured">
                <Check size={16} />
                <span>Captured</span>
              </div>
            )}
          </div>

          <AnimatePresence mode="wait">
            {(!hasLearningToday || isEditing) ? (
              <motion.div
                className="editor-container"
                key="editor"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <textarea
                  ref={textareaRef}
                  className="learning-textarea"
                  placeholder="e.g., Asking for help made my work easier and less stressful..."
                  value={learningText}
                  onChange={(e) => setLearningText(e.target.value)}
                  maxLength={500}
                />
                <div className="char-count">{learningText.length}/500</div>

                {/* Mood Selector */}
                <div className="mood-selector">
                  <label>How did this learning make you feel?</label>
                  <div className="mood-chips">
                    {moodOptions.map((mood) => (
                      <button
                        key={mood.label}
                        className={`mood-chip ${selectedMood?.label === mood.label ? 'selected' : ''}`}
                        onClick={() => setSelectedMood(mood)}
                      >
                        <span className="mood-emoji">{mood.emoji}</span>
                        <span className="mood-label">{mood.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tags Input */}
                <div className="tags-input-container">
                  <div className="tags-label-row">
                    <label>
                      <Tag size={16} />
                      Tags (optional)
                    </label>
                    <span className={`tags-count ${tags.length >= MAX_TAGS ? 'limit-reached' : ''}`}>
                      {tags.length}/{MAX_TAGS}
                    </span>
                  </div>
                  <div className="tags-input-wrapper">
                    <input
                      type="text"
                      className="tags-input"
                      placeholder={tags.length >= MAX_TAGS ? "Max tags reached" : "Type a tag and press Enter or click +"}
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleTagKeyPress}
                      disabled={tags.length >= MAX_TAGS}
                    />
                    <button
                      className="add-tag-btn"
                      onClick={handleAddTag}
                      disabled={!tagInput.trim() || tags.length >= MAX_TAGS}
                      title="Add tag"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                  {tags.length > 0 && (
                    <div className="tags-list">
                      {tags.map((tag, idx) => (
                        <div key={idx} className="tag-item">
                          <span className="tag-label">#{tag}</span>
                          <button
                            className="remove-tag-btn"
                            onClick={() => handleRemoveTag(idx)}
                            title="Remove tag"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="editor-actions">
                  <p className="hint-text">
                    <Lightbulb size={14} />
                    Just one learning a day builds your growth streak
                  </p>
                  <div className="action-buttons">
                    {isEditing && (
                      <button className="cancel-btn" onClick={cancelEditing}>
                        <X size={18} />
                        Cancel
                      </button>
                    )}
                    <button
                      className="save-btn"
                      onClick={handleSaveLearning}
                      disabled={!learningText.trim() || saving}
                    >
                      {saving ? (
                        <>
                          <Loader size={18} className="spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save size={18} />
                          {hasLearningToday ? 'Update' : 'Save'}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                className="captured-view"
                key="captured"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="learning-display">
                  <p className="learning-text">"{todayLearning?.text}"</p>
                  <div className="learning-meta">
                    {todayLearning?.mood_label && (
                      <span className="mood-tag">
                        {getMoodEmoji(todayLearning.mood_label)} {todayLearning.mood_label}
                      </span>
                    )}
                    {todayLearning?.category && (
                      <span
                        className="category-tag"
                        style={{
                          background: getCategoryStyle(todayLearning.category).bg,
                          color: getCategoryStyle(todayLearning.category).color,
                          borderColor: getCategoryStyle(todayLearning.category).border
                        }}
                      >
                        {todayLearning.category}
                      </span>
                    )}
                    {parseTags(todayLearning?.tags).map((tag, idx) => (
                      <span key={idx} className="tag">#{tag}</span>
                    ))}
                  </div>
                </div>
                <div className="captured-actions">
                  <button className="edit-btn" onClick={startEditing}>
                    <Edit3 size={18} />
                    Edit
                  </button>
                  <button
                    className="delete-btn-premium"
                    onClick={() => setShowDeleteModal(true)}
                    disabled={deleting}
                  >
                    <span className="delete-btn-glow"></span>
                    <span className="delete-btn-content">
                      {deleting ? (
                        <Loader size={18} className="spin" />
                      ) : (
                        <Trash2 size={18} />
                      )}
                      <span>Delete</span>
                    </span>
                    <span className="delete-btn-shine"></span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Past Learnings Timeline */}
        <motion.div
          className="timeline-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <div className="section-header">
            <div className="header-content">
              <TrendingUp size={24} />
              <h2>Your Learning Journey</h2>
            </div>
            <span className="count-badge">{pastLearnings.length} learnings</span>
          </div>

          <div className="timeline-list">
            {pastLearnings.length > 0 ? (
              pastLearnings.map((learning, index) => (
                <motion.div
                  key={learning.id}
                  className="timeline-item"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <div className="timeline-marker">
                    <div className="marker-dot"></div>
                    {index < pastLearnings.length - 1 && <div className="marker-line"></div>}
                  </div>

                  <div className="timeline-content">
                    <div className="timeline-header">
                      <div className="date-mood">
                        <span className="date">{formatDate(learning.date)}</span>
                        {learning.mood_label && (
                          <span className="mood">{getMoodEmoji(learning.mood_label)}</span>
                        )}
                      </div>
                      {learning.category && (
                        <span
                          className="category-chip"
                          style={{
                            background: getCategoryStyle(learning.category).bg,
                            color: getCategoryStyle(learning.category).color,
                            borderColor: getCategoryStyle(learning.category).border
                          }}
                        >
                          {learning.category}
                        </span>
                      )}
                    </div>

                    <p className={`learning-text ${expandedItems[learning.id] ? 'expanded' : ''}`}>
                      {learning.text}
                    </p>

                    {learning.text?.length > 150 && (
                      <button
                        className="expand-btn"
                        onClick={() => toggleExpanded(learning.id)}
                      >
                        {expandedItems[learning.id] ? (
                          <>
                            <ChevronUp size={16} />
                            Show less
                          </>
                        ) : (
                          <>
                            <ChevronDown size={16} />
                            Read more
                          </>
                        )}
                      </button>
                    )}

                    {parseTags(learning.tags).length > 0 && (
                      <div className="timeline-tags">
                        {parseTags(learning.tags).map((tag, idx) => (
                          <span key={idx} className="tag">#{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="empty-timeline">
                <Lightbulb size={64} className="empty-icon" />
                <h3>Start Your Learning Journey</h3>
                <p>Capture your first learning above to begin tracking your growth</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteLearning}
          title="Delete Learning Entry"
          message="Are you sure you want to delete this learning entry? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          loading={deleting}
        />
      </div>
    </div>
  );
};

export default Learning;


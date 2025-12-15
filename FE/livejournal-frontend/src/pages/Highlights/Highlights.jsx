import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Star,
  TrendingUp,
  Tag,
  Calendar,
  Sparkles,
  Lock,
  Globe,
  ArrowRight,
  Loader,
  BookOpen,
  ArrowLeft
} from 'lucide-react';
import Navbar from '../../components/Navbar/Navbar.jsx';
import axiosInstance from '../../utils/axiosInstance';
import { truncateHtmlContent } from '../../utils/helpers';
import './Highlights.scss';

const Highlights = () => {
  const navigate = useNavigate();

  // User info
  const [username, setUsername] = useState('User');
  const [userEmail, setUserEmail] = useState('');

  // Data states
  const [loading, setLoading] = useState(true);
  const [pinnedEntries, setPinnedEntries] = useState([]);
  const [happiestDays, setHappiestDays] = useState([]);
  const [topTags, setTopTags] = useState([]);
  const [aiInsight, setAiInsight] = useState('');

  // Fetch all highlights data
  useEffect(() => {
    const fetchHighlights = async () => {
      try {
        setLoading(true);

        const [userResponse, entriesResponse, moodResponse] = await Promise.all([
          axiosInstance.get('/auth/me'),
          axiosInstance.get('/entries/highlights'),
          axiosInstance.get('/analytics/mood-highlights')
        ]);

        // Set user info
        if (userResponse.data && userResponse.data.user) {
          setUsername(userResponse.data.user.name || 'User');
          setUserEmail(userResponse.data.user.email || '');
        }

        // Set pinned entries
        if (entriesResponse.data && entriesResponse.data.entries) {
          setPinnedEntries(entriesResponse.data.entries);
        }

        // Set mood highlights
        if (moodResponse.data && moodResponse.data.data) {
          const { happiest_days, top_positive_tags, ai_insight } = moodResponse.data.data;
          setHappiestDays(happiest_days || []);
          setTopTags(top_positive_tags || []);
          setAiInsight(ai_insight || '');
        }

      } catch (err) {
        console.error('Failed to fetch highlights:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHighlights();
  }, []);

  // Helper functions
  const getMoodEmoji = (moodLabel) => {
    const moodEmojis = {
      happy: '😊',
      sad: '😢',
      angry: '😠',
      stressed: '😰',
      excited: '🤩',
      calm: '😌',
      anxious: '😟',
      neutral: '😐',
      joyful: '😄',
      content: '🙂',
    };
    return moodEmojis[moodLabel?.toLowerCase()] || '😊';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatShortDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

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

  const userProfileInfo = {
    name: username,
    email: userEmail,
  };

  if (loading) {
    return (
      <div className="highlights-page">
        <Navbar isAuthenticated={true} userProfileInfo={userProfileInfo} />
        <div className="highlights-loading">
          <Loader className="spinner" size={48} />
          <p>Loading your highlights...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="highlights-page">
      <Navbar isAuthenticated={true} userProfileInfo={userProfileInfo} />

      <div className="highlights-content">
        {/* Pro-Level Animated Back Button */}
        <button className="pro-back-btn" onClick={() => navigate('/dashboard')}>
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
        </button>

        {/* Header */}
        <div className="highlights-header">
          <div className="header-icon">
            <Star size={48} />
          </div>
          <h1>Your Highlights</h1>
          <p>The best moments from your journaling journey</p>
        </div>

        {/* AI Insight Banner */}
        {aiInsight && (
          <div className="ai-insight-banner">
            <Sparkles size={24} className="insight-icon" />
            <div className="insight-content">
              <h3>✨ AI Insight</h3>
              <p>{aiInsight}</p>
            </div>
          </div>
        )}

        {/* Quick Stats Grid */}
        <div className="quick-stats-grid">
          {/* Happiest Day Card */}
          {happiestDays.length > 0 && (
            <div className="stat-card happiest-day-card">
              <div className="stat-header">
                <Calendar size={20} />
                <h3>Happiest Day Recently</h3>
              </div>
              <div className="stat-content">
                <div className="day-info">
                  <span className="day-emoji">🌟</span>
                  <div className="day-details">
                    <p className="day-date">{formatDate(happiestDays[0].date)}</p>
                    <div className="day-metrics">
                      <span className="mood-score">
                        {Math.round((happiestDays[0].avg_mood_score || 0) * 100)}% mood
                      </span>
                      <span className="entries-count">
                        {happiestDays[0].entries_count} {happiestDays[0].entries_count === 1 ? 'entry' : 'entries'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Top Positive Tag Card */}
          {topTags.length > 0 && (
            <div className="stat-card top-tag-card">
              <div className="stat-header">
                <Tag size={20} />
                <h3>Your Happiest Tag</h3>
              </div>
              <div className="stat-content">
                <div className="tag-info">
                  <span className="tag-emoji">🏆</span>
                  <div className="tag-details">
                    <p className="tag-name">#{topTags[0].tag}</p>
                    <div className="tag-metrics">
                      <span className="mood-score">
                        {Math.round((topTags[0].avg_mood_score || 0) * 100)}% average mood
                      </span>
                      <span className="usage-count">
                        {topTags[0].usage_count} {topTags[0].usage_count === 1 ? 'time' : 'times'}
                      </span>
                    </div>
                    <p className="tag-caption">You feel best when writing about this!</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pinned/Favorite Entries Section */}
        <div className="pinned-section">
          <div className="section-header">
            <h2>
              <Star size={24} />
              Pinned Memories
            </h2>
            <p>Your favorite moments, always at your fingertips</p>
          </div>

          {pinnedEntries.length > 0 ? (
            <div className="pinned-entries-grid">
              {pinnedEntries.map(entry => (
                <div
                  key={entry.id}
                  className={`pinned-entry-card ${entry.is_private === 1 ? 'private' : 'public'}`}
                  onClick={() => navigate(`/dashboard/entry/${entry.id}`)}
                >
                  <div className="entry-header">
                    <div className="mood-display">
                      <span className="mood-emoji">{getMoodEmoji(entry.mood_label)}</span>
                      <span className="mood-score">{Math.round((entry.mood_score || 0) * 100)}%</span>
                    </div>
                    {entry.is_private === 1 ? (
                      <Lock size={16} className="privacy-icon" />
                    ) : (
                      <Globe size={16} className="privacy-icon" />
                    )}
                  </div>

                  <div className="entry-content">
                    <h3>{entry.title || 'Untitled Entry'}</h3>
                    <p className="entry-body">{truncateHtmlContent(entry.body, 150)}</p>
                  </div>

                  <div className="entry-footer">
                    <span className="entry-date">{formatShortDate(entry.created_at)}</span>
                    {parseTags(entry.tags).length > 0 && (
                      <div className="entry-tags">
                        {parseTags(entry.tags).slice(0, 3).map((tag, idx) => (
                          <span key={idx} className="tag">#{tag}</span>
                        ))}
                        {parseTags(entry.tags).length > 3 && (
                          <span className="more-tags">+{parseTags(entry.tags).length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="entry-action">
                    <span>Read more</span>
                    <ArrowRight size={16} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-pinned-entries">
              <div className="date-info">
                <p className="full-date">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                <p className="year">{new Date().getFullYear()}</p>
              </div>
              <h3>No pinned entries yet</h3>
              <p>Pin your favorite entries to see them here</p>
              <button
                className="browse-btn"
                onClick={() => navigate('/dashboard/entries')}
              >
                <BookOpen size={18} />
                Browse Entries
              </button>
            </div>
          )}
        </div>

        {/* More Happy Days Section */}
        {happiestDays.length > 1 && (
          <div className="happy-days-section">
            <div className="section-header">
              <h2>
                <TrendingUp size={24} />
                More Happy Days
              </h2>
            </div>
            <div className="happy-days-list">
              {happiestDays.slice(1, 5).map((day, index) => (
                <div key={index} className="happy-day-item">
                  <div className="day-rank">#{index + 2}</div>
                  <div className="day-content">
                    <p className="day-date">{formatDate(day.date)}</p>
                    <div className="day-stats">
                      <span className="mood-badge">
                        {Math.round((day.avg_mood_score || 0) * 100)}% mood
                      </span>
                      <span className="entries-badge">
                        {day.entries_count} {day.entries_count === 1 ? 'entry' : 'entries'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* More Top Tags */}
        {topTags.length > 1 && (
          <div className="top-tags-section">
            <div className="section-header">
              <h2>
                <Tag size={24} />
                Your Best Tags
              </h2>
              <p>Topics that bring you the most joy</p>
            </div>
            <div className="top-tags-grid">
              {topTags.slice(1, 7).map((tag, index) => (
                <div key={index} className="top-tag-item">
                  <div className="tag-rank">#{index + 2}</div>
                  <div className="tag-content">
                    <h4>#{tag.tag}</h4>
                    <div className="tag-stats">
                      <span className="mood-indicator" style={{
                        width: `${(tag.avg_mood_score || 0) * 100}%`,
                        background: 'linear-gradient(135deg, var(--marvel-primary), var(--marvel-secondary))'
                      }}></span>
                      <span className="mood-value">{Math.round((tag.avg_mood_score || 0) * 100)}%</span>
                    </div>
                    <p className="usage-text">Used {tag.usage_count} {tag.usage_count === 1 ? 'time' : 'times'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Highlights;

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Sparkles,
  TrendingUp,
  Calendar,
  FileText,
  Edit3,
  Zap,
  Award,
  Star,
  ArrowRight,
  Flame,
  Lock,
  Globe
} from 'lucide-react';
import Cookies from 'js-cookie';
import Navbar from '../../components/Navbar/Navbar.jsx';
import PullToRefresh from '../../components/PullToRefresh/PullToRefresh.jsx';
import PinModal from '../../components/PinModal/PinModal.jsx';
import axiosInstance from '../../utils/axiosInstance';
import { formatName } from '../../utils/helpers';
import './Dashboard.scss';

const Dashboard = () => {
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // PIN modal states
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinModalMode, setPinModalMode] = useState('verify');
  const [pendingPrivateEntry, setPendingPrivateEntry] = useState(null);
  const [showPinSetupPrompt, setShowPinSetupPrompt] = useState(false);

  // Dashboard data states
  const [username, setUsername] = useState('User');
  const [displayName, setDisplayName] = useState('User');
  const [streaks, setStreaks] = useState({ current_streak: 0, longest_streak: 0, last_written_date: null });
  const [latestDraft, setLatestDraft] = useState(null);
  const [todayMood, setTodayMood] = useState(null);
  const [recentEntries, setRecentEntries] = useState([]);
  const [moodTrend, setMoodTrend] = useState([]);
  const [pinnedEntries, setPinnedEntries] = useState([]);

  // Fetch all dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Parallelize all API calls for better performance
      const [
        userResponse,
        streaksResponse,
        draftResponse,
        todayResponse,
        entriesResponse,
        trendResponse,
        pinnedResponse
      ] = await Promise.all([
        axiosInstance.get('/auth/me'),
        axiosInstance.get('/analytics/streaks'),
        axiosInstance.get('/drafts/latest'),
        axiosInstance.get('/analytics/today'),
        axiosInstance.get('/entries?limit=5'),
        axiosInstance.get('/analytics/trend?range=7d'),
        axiosInstance.get('/entries/pinned?limit=3')
      ]);

      // Set user info
      if (userResponse.data && userResponse.data.user) {
        const userName = userResponse.data.user.name || 'User';
        setUsername(userName);
        setDisplayName(formatName(userName, 25));
      }

      // Set streaks
      if (streaksResponse.data && streaksResponse.data.data) {
        setStreaks(streaksResponse.data.data);
      }

      // Set latest draft
      if (draftResponse.data && draftResponse.data.draft) {
        setLatestDraft(draftResponse.data.draft);
      }

      // Set today's mood
      if (todayResponse.data && todayResponse.data.data) {
        setTodayMood(todayResponse.data.data);
      }

      // Set recent entries
      if (entriesResponse.data && entriesResponse.data.data) {
        setRecentEntries(entriesResponse.data.data);
      }

      // Set mood trend
      if (trendResponse.data && trendResponse.data.data) {
        setMoodTrend(trendResponse.data.data);
      }

      // Set pinned entries
      if (pinnedResponse.data && pinnedResponse.data.data) {
        setPinnedEntries(pinnedResponse.data.data);
      }

    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [refreshKey]);

  // Check PIN status on dashboard load
  useEffect(() => {
    const checkPinStatus = () => {
      const storedPin = localStorage.getItem('journalPin');
      const pinSetupDismissed = sessionStorage.getItem('pinSetupDismissed');

      // If no PIN is set and user hasn't dismissed the prompt this session
      if (!storedPin && !pinSetupDismissed) {
        // Show setup prompt after dashboard loads
        setTimeout(() => {
          setShowPinSetupPrompt(true);
        }, 1000);
      }
    };

    checkPinStatus();
  }, []);

  const handleSetupPin = () => {
    setShowPinSetupPrompt(false);
    setPinModalMode('setup');
    setShowPinModal(true);
  };

  const handleDismissPinSetup = () => {
    setShowPinSetupPrompt(false);
    // Remember dismissal for this session
    sessionStorage.setItem('pinSetupDismissed', 'true');
  };

  const handleRefresh = async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
    setRefreshKey(prev => prev + 1);
  };

  // Helper function to get mood emoji
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

  // Helper to format date
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

  // Helper to parse tags safely
  const parseTags = (tags) => {
    if (!tags) return [];

    // If it's already an array, return it
    if (Array.isArray(tags)) return tags;

    // If it's a string, try to parse it
    if (typeof tags === 'string') {
      try {
        // Try parsing as JSON first
        const parsed = JSON.parse(tags);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // If JSON parse fails, split by comma
        return tags.split(',').map(t => t.trim()).filter(Boolean);
      }
    }

    return [];
  };

  // Helper to truncate text
  const truncateText = (text, maxLength) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Handle entry click - check if private and if PIN is needed
  const handleEntryClick = (entry) => {
    // If entry is public (is_private = 0), navigate directly
    if (entry.is_private === 0) {
      navigate(`/dashboard/entry/${entry.id}`);
      return;
    }

    // Entry is private - ALWAYS ask for PIN (no session check)
    // Check if PIN exists (user-specific)
    const pinKey = `journalPin_${JSON.parse(localStorage.getItem('user') || '{}').id}`;
    const storedPin = localStorage.getItem(pinKey);

    setPinModalMode(storedPin ? 'verify' : 'setup');
    setPendingPrivateEntry(entry);
    setShowPinModal(true);
  };

  // Handle successful PIN verification
  const handlePinSuccess = () => {
    if (pendingPrivateEntry) {
      navigate(`/dashboard/entry/${pendingPrivateEntry.id}`);
      setPendingPrivateEntry(null);
    }
  };

  // Create user profile info object
  const userProfileInfo = {
    name: username,
  };

  if (loading) {
    return (
      <div className="dashboard-page">
        <Navbar isAuthenticated={true} userProfileInfo={userProfileInfo} />
        <div className="dashboard-loading">
          <div className="loading-spinner"></div>
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-page">
        <Navbar isAuthenticated={true} userProfileInfo={userProfileInfo} />
        <div className="dashboard-error">
          <p>{error}</p>
          <button onClick={() => setRefreshKey(prev => prev + 1)}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <Navbar isAuthenticated={true} userProfileInfo={userProfileInfo} />
      <PullToRefresh onRefresh={handleRefresh} />

      <div className="dashboard-content">
        {/* Dashboard Header with Streak */}
        <div className="dashboard-header">
          <div className="header-greeting">
            <h1>Welcome back, <span className="user-name">{displayName}</span>! 👋</h1>
            <p>Let's continue your journaling journey</p>
          </div>

          {/* Streak Card */}
          <div className="streak-card">
            <div className="streak-icon">
              <Flame size={32} />
            </div>
            <div className="streak-info">
              <div className="streak-current">
                <span className="streak-number">{streaks.current_streak}</span>
                <span className="streak-label">Day Streak</span>
              </div>
              <div className="streak-longest">
                <Award size={16} />
                <span>Best: {streaks.longest_streak} days</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="quick-actions">
          <button className="action-btn primary" onClick={() => navigate('/dashboard/new-entry')}>
            <Edit3 size={20} />
            <span>New Entry</span>
          </button>
          <button className="action-btn secondary" onClick={() => navigate('/dashboard/new-entry?mode=voice')}>
            <Zap size={20} />
            <span>Start Voice Journal</span>
          </button>
          <button className="action-btn tertiary" onClick={() => navigate('/dashboard/search')}>
            <Sparkles size={20} />
            <span>Search</span>
          </button>
        </div>

        {latestDraft && (
          <div className="draft-resume-card" onClick={() => navigate(`/dashboard/edit-draft/${latestDraft.id}`)}>
            <div className="draft-header">
              <div className="draft-icon">
                <FileText size={24} />
              </div>
              <div className="draft-info">
                <h3>Continue your draft</h3>
                <p className="draft-time">Last edited {formatDate(latestDraft.updated_at)}</p>
              </div>
            </div>
            <div className="draft-preview">
              <h4>{latestDraft.title || 'Untitled Draft'}</h4>
              <p>{truncateText(latestDraft.body, 150)}</p>
            </div>
            <div className="draft-action">
              <span>Continue writing</span>
              <ArrowRight size={18} />
            </div>
          </div>
        )}

        <div className="dashboard-grid">
          {/* Today's Mood Card */}
          <div className="today-mood-card">
            <div className="card-header">
              <h3>
                <Calendar size={20} />
                Today's Mood
              </h3>
            </div>
            <div className="mood-content">
              {todayMood && todayMood.entry_count > 0 ? (
                <>
                  <div className="mood-score">
                    <div className="score-circle" style={{
                      background: `conic-gradient(var(--marvel-primary) ${(todayMood.avg_mood_score || 0) * 100}%, var(--card-border) 0)`
                    }}>
                      <span>{Math.round((todayMood.avg_mood_score || 0) * 100)}%</span>
                    </div>
                  </div>
                  <div className="mood-summary">
                    <p className="entries-count">{todayMood.entry_count} {todayMood.entry_count === 1 ? 'entry' : 'entries'} today</p>
                    {todayMood.mood_counts && (
                      <div className="mood-breakdown">
                        {Object.entries(todayMood.mood_counts).map(([mood, count]) => (
                          <span key={mood} className="mood-tag">
                            {getMoodEmoji(mood)} {mood} ({count})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="no-mood-data">
                  <p>No entries yet today</p>
                  <button className="start-writing-btn" onClick={() => navigate('/dashboard/new-entry')}>
                    Start Writing
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 7-Day Mood Trend Mini Chart */}
          <div className="mood-trend-card">
            <div className="card-header">
              <h3>
                <TrendingUp size={20} />
                7-Day Trend
              </h3>
            </div>
            <div className="trend-content">
              {moodTrend && moodTrend.length > 0 ? (
                <div className="trend-chart">
                  {moodTrend.map((day, index) => (
                    <div key={index} className="trend-bar">
                      <div
                        className="bar-fill"
                        style={{
                          height: `${(day.avg_mood_score || 0) * 100}%`,
                          background: `linear-gradient(to top, var(--marvel-primary), var(--marvel-secondary))`
                        }}
                      ></div>
                      <span className="bar-label">{new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-trend-data">
                  <p>Not enough data yet</p>
                  <p className="hint">Write more entries to see your mood trend</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Entries Section */}
        <div className="recent-entries-section">
          <div className="section-header">
            <h2>
              <BookOpen size={24} />
              Recent Entries
            </h2>
            <button className="view-all-btn" onClick={() => navigate('/dashboard/entries')}>
              View All
            </button>
          </div>
          <div className="entries-list">
            {recentEntries && recentEntries.length > 0 ? (
              recentEntries.map(entry => (
                <div
                  key={entry.id}
                  className={`entry-item ${entry.is_private === 1 ? 'private-entry' : 'public-entry'}`}
                  onClick={() => handleEntryClick(entry)}
                >
                  <div className="entry-mood">
                    {entry.is_private === 1 ? (
                      <span className="mood-emoji locked">🔒</span>
                    ) : (
                      <span className="mood-emoji">{getMoodEmoji(entry.mood_label)}</span>
                    )}
                  </div>
                  <div className="entry-content">
                    <div className="entry-title-row">
                      <h4>{entry.is_private === 1 ? '🔒 Private Entry' : (entry.title || 'Untitled Entry')}</h4>
                      {entry.is_private === 1 ? (
                        <Lock size={16} className="privacy-icon private" />
                      ) : (
                        <Globe size={16} className="privacy-icon public" />
                      )}
                    </div>
                    {entry.is_private === 1 ? (
                      <p className="locked-content">
                        <Lock size={14} />
                        <span>This entry is locked. Click to unlock and view.</span>
                      </p>
                    ) : (
                      <p>{truncateText(entry.body, 120)}</p>
                    )}
                    <div className="entry-meta">
                      <span className="entry-date">{formatDate(entry.created_at)}</span>
                      {entry.is_private === 0 && parseTags(entry.tags).length > 0 && (
                        <div className="entry-tags">
                          {parseTags(entry.tags).slice(0, 2).map((tag, idx) => (
                            <span key={idx} className="tag">#{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <ArrowRight size={20} className="entry-arrow" />
                </div>
              ))
            ) : (
              <div className="no-entries">
                <BookOpen size={48} />
                <p>No entries yet</p>
                <button onClick={() => navigate('/dashboard/new-entry')}>Create Your First Entry</button>
              </div>
            )}
          </div>
        </div>

        {/* Highlights Section (Pinned Entries) */}
        {pinnedEntries && pinnedEntries.length > 0 && (
          <div className="highlights-section">
            <div className="section-header">
              <h2>
                <Star size={24} />
                Your Highlights
              </h2>
              <button className="view-all-btn" onClick={() => navigate('/app/highlights')}>
                View All
              </button>
            </div>
            <div className="highlights-grid">
              {pinnedEntries.map(entry => (
                <div
                  key={entry.id}
                  className="highlight-card"
                  onClick={() => navigate(`/dashboard/entry/${entry.id}`)}
                >
                  <div className="highlight-mood">
                    <span className="mood-emoji-large">{getMoodEmoji(entry.mood_label)}</span>
                    <span className="mood-score">{Math.round((entry.mood_score || 0) * 100)}%</span>
                  </div>
                  <h4>{entry.title || 'Untitled Entry'}</h4>
                  <p>{truncateText(entry.body, 80)}</p>
                  <span className="highlight-date">{formatDate(entry.created_at)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PIN Modal for private entries */}
        {showPinModal && (
          <PinModal
            isOpen={showPinModal}
            mode={pinModalMode}
            onClose={() => {
              setShowPinModal(false);
              setPendingPrivateEntry(null);
            }}
            onSuccess={() => {
              handlePinSuccess();
              setShowPinModal(false);
            }}
          />
        )}

        {/* PIN Setup Prompt */}
        {showPinSetupPrompt && (
          <div className="pin-setup-prompt">
            <p>To access private entries, please set up a PIN.</p>
            <div className="prompt-actions">
              <button className="btn-setup" onClick={handleSetupPin}>Set Up PIN</button>
              <button className="btn-dismiss" onClick={handleDismissPinSetup}>Maybe Later</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

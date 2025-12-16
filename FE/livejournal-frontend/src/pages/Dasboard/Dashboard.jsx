import {
  ArrowRight,
  Award,
  Bell,
  BookOpen,
  Calendar,
  Edit3,
  FileText,
  Flame,
  Globe,
  Lightbulb,
  Lock,
  Mail,
  Mic,
  Package,
  Sparkles,
  Star,
  TrendingUp,
  X,
  Zap
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar/Navbar.jsx';
import PinModal from '../../components/PinModal/PinModal.jsx';
import PullToRefresh from '../../components/PullToRefresh/PullToRefresh.jsx';
import ScrollProgressBar from '../../components/ScrollProgressBar/ScrollProgressBar.jsx';
import { useVapiJournal } from '../../hooks/useVapiJournal';
import axiosInstance from '../../utils/axiosInstance';
import { formatName, truncateHtmlContent } from '../../utils/helpers';
import './Dashboard.scss';

const Dashboard = () => {
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinModalMode, setPinModalMode] = useState('verify');
  const [pendingPrivateEntry, setPendingPrivateEntry] = useState(null);
  const [showPinSetupPrompt, setShowPinSetupPrompt] = useState(false);
  const [username, setUsername] = useState('User');
  const [userEmail, setUserEmail] = useState('');
  const [displayName, setDisplayName] = useState('User');
  const [streaks, setStreaks] = useState({ current_streak: 0, longest_streak: 0, last_written_date: null });
  const [latestDraft, setLatestDraft] = useState(null);
  const [todayMood, setTodayMood] = useState(null);
  const [recentEntries, setRecentEntries] = useState([]);
  const [moodTrend, setMoodTrend] = useState([]);
  const [pinnedEntries, setPinnedEntries] = useState([]);
  const [upcomingReminders, setUpcomingReminders] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [todayLearning, setTodayLearning] = useState(null);
  const [hasLearningToday, setHasLearningToday] = useState(false);
  const [learningStreak, setLearningStreak] = useState({ current_streak: 0, longest_streak: 0 });
  const [lifeChapters, setLifeChapters] = useState([]);
  const {
    startRecording,
    stopRecording,
    isRecording,
    transcript,
    clearTranscript,
    error: vapiError
  } = useVapiJournal();
  const [showAssistant, setShowAssistant] = useState(false);
  const [assistantResponse, setAssistantResponse] = useState('');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);

      const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const fromDate = formatDate(today);
      const toDate = formatDate(nextWeek);

      // Parallelize all API calls for better performance
      const [
        userResponse,
        streaksResponse,
        draftResponse,
        todayResponse,
        entriesResponse,
        trendResponse,
        pinnedResponse,
        remindersResponse,
        eventsResponse,
        learningTodayResponse,
        learningStreakResponse,
        chaptersResponse
      ] = await Promise.all([
        axiosInstance.get('/auth/me'),
        axiosInstance.get('/analytics/streaks'),
        axiosInstance.get('/drafts/latest'),
        axiosInstance.get('/analytics/today'),
        axiosInstance.get('/entries?limit=5'),
        axiosInstance.get('/analytics/trend?range=7d'),
        axiosInstance.get('/entries/pinned?limit=3'),
        axiosInstance.get('/reminders/upcoming?days=7'),
        axiosInstance.get(`/events?from=${fromDate}&to=${toDate}`),
        axiosInstance.get('/learning/today').catch(() => ({ data: { hasLearning: false, learning: null } })),
        axiosInstance.get('/learning/streak').catch(() => ({ data: { current_streak: 0, longest_streak: 0 } })),
        axiosInstance.get('/life-chapters').catch(() => ({ data: { data: [] } }))
      ]);

      // Set user info
      if (userResponse.data && userResponse.data.user) {
        const userName = userResponse.data.user.name || 'User';
        const email = userResponse.data.user.email || '';
        setUsername(userName);
        setUserEmail(email);
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

      // Set upcoming reminders
      if (remindersResponse.data && remindersResponse.data.reminders) {
        setUpcomingReminders(remindersResponse.data.reminders);
      }

      // Set upcoming events
      if (eventsResponse.data && eventsResponse.data.events) {
        setUpcomingEvents(eventsResponse.data.events);
      }

      // Set today's learning data
      if (learningTodayResponse.data) {
        setTodayLearning(learningTodayResponse.data.learning);
        setHasLearningToday(learningTodayResponse.data.hasLearning);
      }

      // Set learning streak
      if (learningStreakResponse.data && learningStreakResponse.data.current_streak !== undefined) {
        setLearningStreak(learningStreakResponse.data);
      }

      // Set life chapters
      if (chaptersResponse.data && chaptersResponse.data.data) {
        setLifeChapters(chaptersResponse.data.data);
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
    email: userEmail,
  };

  // Parse voice commands for dashboard actions
  useEffect(() => {
    if (transcript && showAssistant) {
      parseAssistantCommand(transcript);
    }
  }, [transcript, showAssistant]);

  const parseAssistantCommand = (text) => {
    const lowerText = text.toLowerCase();

    // Navigation commands
    if (lowerText.includes('create') && (lowerText.includes('entry') || lowerText.includes('journal'))) {
      setAssistantResponse('Opening new entry editor...');
      setTimeout(() => navigate('/dashboard/new-entry'), 1000);
    } else if (lowerText.includes('voice journal') || lowerText.includes('voice entry')) {
      setAssistantResponse('Starting voice journal...');
      setTimeout(() => navigate('/dashboard/new-entry?mode=voice'), 1000);
    } else if (lowerText.includes('search') || lowerText.includes('find entries')) {
      setAssistantResponse('Opening search...');
      setTimeout(() => navigate('/dashboard/search'), 1000);
    } else if (lowerText.includes('calendar') || lowerText.includes('events')) {
      setAssistantResponse('Opening calendar...');
      setTimeout(() => navigate('/dashboard/calendar'), 1000);
    } else if (lowerText.includes('highlights') || lowerText.includes('pinned')) {
      setAssistantResponse('Opening highlights...');
      setTimeout(() => navigate('/app/highlights'), 1000);
    } else if (lowerText.includes('all entries') || lowerText.includes('view entries')) {
      setAssistantResponse('Showing all entries...');
      setTimeout(() => navigate('/dashboard/entries'), 1000);
    }

    // Information queries
    else if (lowerText.includes('streak') || lowerText.includes('how many days')) {
      setAssistantResponse(`Your current streak is ${streaks.current_streak} days! Keep it up! Your best streak is ${streaks.longest_streak} days.`);
    } else if (lowerText.includes('mood today') || lowerText.includes('how am i feeling')) {
      if (todayMood && todayMood.entry_count > 0) {
        const moodScore = Math.round((todayMood.avg_mood_score || 0) * 100);
        setAssistantResponse(`Your mood today is ${moodScore}% positive. You've written ${todayMood.entry_count} ${todayMood.entry_count === 1 ? 'entry' : 'entries'} today.`);
      } else {
        setAssistantResponse("You haven't recorded any mood today. Would you like to create an entry?");
      }
    } else if (lowerText.includes('recent entries') || lowerText.includes('latest')) {
      if (recentEntries && recentEntries.length > 0) {
        setAssistantResponse(`You have ${recentEntries.length} recent entries. Your latest entry is "${recentEntries[0].title || 'Untitled'}".`);
      } else {
        setAssistantResponse("You don't have any entries yet. Let's create your first one!");
      }
    } else if (lowerText.includes('draft')) {
      if (latestDraft) {
        setAssistantResponse(`You have a draft titled "${latestDraft.title || 'Untitled'}". Would you like to continue working on it?`);
      } else {
        setAssistantResponse("You don't have any drafts at the moment.");
      }
    } else if (lowerText.includes('reminders') || lowerText.includes('upcoming')) {
      if (upcomingReminders && upcomingReminders.length > 0) {
        setAssistantResponse(`You have ${upcomingReminders.length} upcoming ${upcomingReminders.length === 1 ? 'reminder' : 'reminders'}.`);
      } else {
        setAssistantResponse("You don't have any upcoming reminders.");
      }
    }

    // Help command
    else if (lowerText.includes('help') || lowerText.includes('what can you do')) {
      setAssistantResponse('I can help you navigate your journal! Try saying: "Create new entry", "Show my streak", "What\'s my mood today", "Open search", "Go to calendar", or "Show highlights".');
    }
  };

  const toggleAssistant = async () => {
    if (showAssistant) {
      stopRecording();
      setShowAssistant(false);
      setAssistantResponse('');
      clearTranscript();
    } else {
      setShowAssistant(true);
      setAssistantResponse('Hi! I\'m your AI journal assistant. How can I help you today?');
      clearTranscript();
      await startRecording();
    }
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
      <ScrollProgressBar />
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
            <span>Voice Journal</span>
          </button>
          <button className="action-btn tertiary" onClick={() => navigate('/dashboard/search')}>
            <Sparkles size={20} />
            <span>Search</span>
          </button>
          <button
            className="action-btn time-capsule-btn"
            onClick={() => navigate('/dashboard/time-capsule/new')}
            title="Write something for your future self"
          >
            <Package size={20} />
            <span>Time Capsule</span>
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
              <p>{truncateHtmlContent(latestDraft.body, 150)}</p>
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

          {/* Calendar & Events Card */}
          <div className="calendar-reminders-card" onClick={() => navigate('/calendar')}>
            <div className="card-header">
              <h3>
                <Calendar size={20} />
                Calendar & Events
              </h3>
            </div>
            <div className="calendar-content">
              {(upcomingReminders && upcomingReminders.length > 0) || (upcomingEvents && upcomingEvents.length > 0) ? (
                <div className="calendar-items-container">
                  {/* Show Events */}
                  {upcomingEvents && upcomingEvents.length > 0 && (
                    <div className="events-section">
                      <div className="section-badge">
                        <Calendar size={16} />
                        <span className="badge-count">{upcomingEvents.length}</span>
                      </div>
                      <div className="items-list">
                        {upcomingEvents.slice(0, 2).map((event, idx) => {
                          // Parse the start_datetime from backend
                          const eventDate = new Date(event.start_datetime);
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const eventDateOnly = new Date(eventDate);
                          eventDateOnly.setHours(0, 0, 0, 0);
                          const tomorrow = new Date(today);
                          tomorrow.setDate(tomorrow.getDate() + 1);

                          const isToday = eventDateOnly.getTime() === today.getTime();
                          const isTomorrow = eventDateOnly.getTime() === tomorrow.getTime();

                          return (
                            <div key={idx} className="calendar-item event-item">
                              <div className="item-icon">
                                <div className="date-badge">
                                  <span className="day">{eventDate.getDate()}</span>
                                  <span className="month">{eventDate.toLocaleDateString('en-US', { month: 'short' })}</span>
                                </div>
                              </div>
                              <div className="item-content">
                                <h4 className="item-title">{event.title}</h4>
                                <p className="item-time">
                                  {isToday ? '📍 Today' : isTomorrow ? '📍 Tomorrow' : `📍 ${eventDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`}
                                  {!event.all_day && ` • ${eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`}
                                </p>
                                {event.description && (
                                  <p className="item-description">{truncateText(event.description, 60)}</p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        {upcomingEvents.length > 2 && (
                          <p className="more-items">+{upcomingEvents.length - 2} more {upcomingEvents.length - 2 === 1 ? 'event' : 'events'}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Show Reminders */}
                  {upcomingReminders && upcomingReminders.length > 0 && (
                    <div className="reminders-section">
                      <div className="section-badge">
                        <Bell size={16} />
                        <span className="badge-count">{upcomingReminders.length}</span>
                      </div>
                      <div className="items-list">
                        {upcomingReminders.slice(0, 2).map((reminder, idx) => {
                          const reminderDate = new Date(reminder.remind_at);
                          const isToday = reminderDate.toDateString() === new Date().toDateString();
                          const isTomorrow = reminderDate.toDateString() === new Date(Date.now() + 86400000).toDateString();

                          return (
                            <div key={idx} className="calendar-item reminder-item">
                              <div className="item-icon">
                                <Bell size={18} className="bell-icon" />
                              </div>
                              <div className="item-content">
                                <h4 className="item-title">{reminder.title}</h4>
                                <p className="item-time">
                                  🔔 {isToday ? 'Today' : isTomorrow ? 'Tomorrow' : reminderDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                  {' • ' + reminderDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                        {upcomingReminders.length > 2 && (
                          <p className="more-items">+{upcomingReminders.length - 2} more {upcomingReminders.length - 2 === 1 ? 'reminder' : 'reminders'}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="no-calendar-data">
                  <div className="date-info">
                    <p className="full-date">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                    <p className="year">{new Date().getFullYear()}</p>
                  </div>
                  <p className="no-events-text">No upcoming events or reminders</p>
                  <p className="hint">Tap to view calendar & create events</p>
                </div>
              )}
            </div>
            <div className="card-action">
              <span>Open Calendar</span>
              <ArrowRight size={18} />
            </div>
          </div>

          {/* Learning Moment Card */}
          <div className="learning-moment-card" onClick={() => navigate('/learning')}>
            <div className="card-header">
              <h3>
                <Lightbulb size={20} />
                Learning Moment
              </h3>
              {hasLearningToday && (
                <span className="captured-badge">✓ Captured</span>
              )}
            </div>
            <div className="learning-content">
              {hasLearningToday && todayLearning ? (
                <div className="learning-preview">
                  <p className="learning-text">"{truncateText(todayLearning.text, 80)}"</p>
                  <div className="learning-meta">
                    {todayLearning.mood_label && (
                      <span className="mood-indicator">{getMoodEmoji(todayLearning.mood_label)}</span>
                    )}
                    {learningStreak.current_streak > 0 && (
                      <span className="streak-mini">
                        <Flame size={14} />
                        {learningStreak.current_streak} day streak
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="no-learning-data">
                  <div className="prompt-icon">💡</div>
                  <p className="prompt-text">What's one thing you learned today?</p>
                  <p className="hint">Capture it in 1-2 lines</p>
                </div>
              )}
            </div>
            <div className="card-action">
              <span>{hasLearningToday ? 'View Learnings' : 'Add Learning'}</span>
              <ArrowRight size={18} />
            </div>
          </div>

          {/* Life Chapters Card */}
          <div className="life-chapters-card" onClick={() => navigate('/dashboard/life-chapters')}>
            <div className="card-header">
              <h3>
                <BookOpen size={20} />
                Life Chapters
              </h3>
            </div>
            <div className="chapters-content">
              {lifeChapters && lifeChapters.length > 0 ? (
                <div className="chapters-data">
                  <div className="chapters-stats">
                    <div className="stat-item">
                      <span className="stat-value">{lifeChapters.filter(ch => ch.is_active).length}</span>
                      <span className="stat-label">Active</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-value">{lifeChapters.length}</span>
                      <span className="stat-label">Total</span>
                    </div>
                  </div>
                  {lifeChapters.filter(ch => ch.is_active).slice(0, 1).map(chapter => (
                    <div key={chapter.id} className="active-chapter-preview">
                      <span className="chapter-icon">{chapter.icon || '📖'}</span>
                      <span className="chapter-name">{chapter.title}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-chapters-data">
                  <div className="prompt-icon">📖</div>
                  <p className="prompt-text">Your life, in meaningful phases</p>
                  <p className="hint">Group moments into chapters</p>
                </div>
              )}
            </div>
            <div className="card-action">
              <span>{lifeChapters && lifeChapters.length > 0 ? 'View Chapters' : 'Start Writing'}</span>
              <ArrowRight size={18} />
            </div>
          </div>

          {/* Letter to Myself Card */}
          <div className="letter-to-myself-card" onClick={() => navigate('/dashboard/letters')}>
            <div className="card-header">
              <h3>
                <Mail size={20} />
                Letter to Myself
              </h3>
            </div>
            <div className="letter-content">
              <div className="no-letter-data">
                <div className="prompt-icon">✉️</div>
                <p className="prompt-text">Write to your future self</p>
                <p className="hint">Seal it for later or a life event</p>
              </div>
            </div>
            <div className="card-action">
              <span>View Letters</span>
              <ArrowRight size={18} />
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

        {/* AI Journal Assistant Button */}
        <div className="ai-assistant-container">
          <button className="ai-assistant-btn" onClick={toggleAssistant}>
            {showAssistant ? <X size={24} /> : <Mic size={24} />}
          </button>
          {showAssistant && (
            <div className="ai-assistant-response">
              <p>{assistantResponse}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

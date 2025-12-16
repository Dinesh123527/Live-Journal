import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Calendar,
  Globe,
  Loader,
  Lock,
  Search,
  Tag
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar/Navbar.jsx';
import PinModal from '../../components/PinModal/PinModal.jsx';
import PullToRefresh from '../../components/PullToRefresh/PullToRefresh.jsx';
import axiosInstance from '../../utils/axiosInstance';
import { truncateHtmlContent } from '../../utils/helpers';
import './EntriesList.scss';

const EntriesList = () => {
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [error, setError] = useState(null);
  const [username, setUsername] = useState('User');
  const [userEmail, setUserEmail] = useState('');

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMood, setSelectedMood] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [privacyFilter, setPrivacyFilter] = useState('all'); // 'all', 'public', 'private'

  // PIN modal states
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinModalMode, setPinModalMode] = useState('verify');
  const [pendingPrivateEntry, setPendingPrivateEntry] = useState(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Fetch user info
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await axiosInstance.get('/auth/me');
        if (response.data && response.data.user) {
          setUsername(response.data.user.name || 'User');
          setUserEmail(response.data.user.email || '');
        }
      } catch (err) {
        console.error('Failed to fetch user info:', err);
      }
    };
    fetchUserInfo();
  }, []);

  // Fetch entries
  const fetchEntries = async (pageNum = 1) => {
    try {
      setLoading(true);
      setError(null);

      const params = { page: pageNum, limit: 20 };
      if (selectedMood) params.mood = selectedMood;
      if (selectedTag) params.tag = selectedTag;
      if (searchQuery) params.q = searchQuery;

      const response = await axiosInstance.get('/entries', { params });
      const newEntries = response.data.data || [];

      if (pageNum === 1) {
        setFilteredEntries(newEntries);
      } else {
        setFilteredEntries(prev => [...prev, ...newEntries]);
      }

      setHasMore(newEntries.length === 20);
    } catch (err) {
      console.error('Failed to fetch entries:', err);
      setError('Failed to load entries. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setFilteredEntries([]);
    fetchEntries(1);
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey, selectedMood, selectedTag, searchQuery, privacyFilter]);

  const handleRefresh = async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
    setRefreshKey(prev => prev + 1);
  };

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchEntries(nextPage);
  };

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

  // Handle entry click - ALWAYS ask for PIN for private entries
  const handleEntryClick = (entry) => {
    if (entry.is_private === 0) {
      navigate(`/dashboard/entry/${entry.id}`);
      return;
    }

    // Entry is private - ALWAYS ask for PIN (no session check)
    const pinKey = `journalPin_${JSON.parse(localStorage.getItem('user') || '{}').id}`;
    const storedPin = localStorage.getItem(pinKey);

    setPinModalMode(storedPin ? 'verify' : 'setup');
    setPendingPrivateEntry(entry);
    setShowPinModal(true);
  };

  const handlePinSuccess = () => {
    if (pendingPrivateEntry) {
      navigate(`/dashboard/entry/${pendingPrivateEntry.id}`);
      setPendingPrivateEntry(null);
    }
  };

  const userProfileInfo = {
    name: username,
    email: userEmail,
  };

  if (loading && page === 1) {
    return (
      <div className="entries-list-page">
        <Navbar isAuthenticated={true} userProfileInfo={userProfileInfo} />
        <div className="entries-loading">
          <Loader className="spinner" size={48} />
          <p>Loading entries...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="entries-list-page">
      <Navbar isAuthenticated={true} userProfileInfo={userProfileInfo} />
      <PullToRefresh onRefresh={handleRefresh} />

      <div className="entries-container">
        {/* Back Button */}
        <button className="enhanced-back-btn" onClick={() => navigate('/dashboard')}>
          <span className="back-btn-icon">
            <ArrowLeft size={20} />
          </span>
          <span className="back-btn-text">Back to Dashboard</span>
          <span className="back-btn-ripple"></span>
        </button>

        {/* Header */}
        <div className="entries-header">
          <div className="header-title">
            <BookOpen size={32} />
            <div>
              <h1>All Entries</h1>
              <p>{filteredEntries.length} {filteredEntries.length === 1 ? 'entry' : 'entries'} found</p>
            </div>
          </div>
        </div>

        {/* Privacy Tabs */}
        <div className="privacy-tabs">
          <button
            className={`privacy-tab ${privacyFilter === 'all' ? 'active' : ''}`}
            onClick={() => setPrivacyFilter('all')}
          >
            <BookOpen size={16} />
            <span>All</span>
          </button>
          <button
            className={`privacy-tab ${privacyFilter === 'public' ? 'active' : ''}`}
            onClick={() => setPrivacyFilter('public')}
          >
            <Globe size={16} />
            <span>Public</span>
          </button>
          <button
            className={`privacy-tab ${privacyFilter === 'private' ? 'active' : ''}`}
            onClick={() => setPrivacyFilter('private')}
          >
            <Lock size={16} />
            <span>Private</span>
          </button>
        </div>

        {/* Mood Filter Tabs */}
        <div className="mood-tabs">
          <button className={`mood-tab ${selectedMood === '' ? 'active' : ''}`} onClick={() => setSelectedMood('')}>
            <span>All</span>
          </button>
          <button className={`mood-tab ${selectedMood === 'happy' ? 'active' : ''}`} onClick={() => setSelectedMood('happy')}>
            <span>😊</span>
          </button>
          <button className={`mood-tab ${selectedMood === 'sad' ? 'active' : ''}`} onClick={() => setSelectedMood('sad')}>
            <span>😢</span>
          </button>
          <button className={`mood-tab ${selectedMood === 'excited' ? 'active' : ''}`} onClick={() => setSelectedMood('excited')}>
            <span>🤩</span>
          </button>
          <button className={`mood-tab ${selectedMood === 'calm' ? 'active' : ''}`} onClick={() => setSelectedMood('calm')}>
            <span>😌</span>
          </button>
          <button className={`mood-tab ${selectedMood === 'stressed' ? 'active' : ''}`} onClick={() => setSelectedMood('stressed')}>
            <span>😰</span>
          </button>
          <button className={`mood-tab ${selectedMood === 'anxious' ? 'active' : ''}`} onClick={() => setSelectedMood('anxious')}>
            <span>😟</span>
          </button>
          <button className={`mood-tab ${selectedMood === 'angry' ? 'active' : ''}`} onClick={() => setSelectedMood('angry')}>
            <span>😠</span>
          </button>
          <button className={`mood-tab ${selectedMood === 'neutral' ? 'active' : ''}`} onClick={() => setSelectedMood('neutral')}>
            <span>😐</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="search-section">
          <div className="search-group">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search entries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            {(searchQuery || selectedMood || privacyFilter !== 'all') && (
              <button
                className="clear-filters-btn"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedMood('');
                  setSelectedTag('');
                  setPrivacyFilter('all');
                }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Entries List */}
        <div className="entries-list">
          {error && (
            <div className="entries-error">
              <p>{error}</p>
              <button onClick={() => fetchEntries(1)}>Retry</button>
            </div>
          )}

          {!error && filteredEntries.length === 0 && (
            <div className="no-entries">
              <BookOpen size={64} />
              <h3>No entries found</h3>
              <p>Start writing to see your entries here</p>
              <button onClick={() => navigate('/dashboard/new-entry')}>
                Create New Entry
              </button>
            </div>
          )}

          {filteredEntries
            .filter(entry => {
              if (privacyFilter === 'public') return entry.is_private === 0;
              if (privacyFilter === 'private') return entry.is_private === 1;
              return true;
            })
            .map((entry) => (
              <div
                key={entry.id}
                className={`entry-card ${entry.is_private === 1 ? 'private-entry locked' : 'public-entry'}`}
                onClick={() => handleEntryClick(entry)}
              >
                <div className="entry-header">
                  <div className="entry-mood">
                    {entry.is_private === 1 ? (
                      <span className="mood-emoji locked">🔒</span>
                    ) : (
                      <span className="mood-emoji">{getMoodEmoji(entry.mood_label)}</span>
                    )}
                  </div>
                  <div className="entry-meta-top">
                    <div className="entry-date">
                      <Calendar size={14} />
                      <span>{formatDate(entry.created_at)}</span>
                    </div>
                    <div className="privacy-indicator">
                      {entry.is_private === 1 ? (
                        <Lock size={14} className="private" />
                      ) : (
                        <Globe size={14} className="public" />
                      )}
                    </div>
                  </div>
                </div>

                <div className="entry-content">
                  {entry.is_private === 1 ? (
                    <>
                      <h3>🔒 Private Entry</h3>
                      <div className="locked-preview">
                        <Lock size={24} />
                        <p>This entry is private and protected.</p>
                        <span className="unlock-hint">Click to unlock and view content</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <h3>{entry.title || 'Untitled Entry'}</h3>
                      <p>{truncateHtmlContent(entry.body, 200)}</p>
                    </>
                  )}
                </div>

                {entry.is_private === 0 && parseTags(entry.tags).length > 0 && (
                  <div className="entry-tags">
                    <Tag size={14} />
                    {parseTags(entry.tags).slice(0, 3).map((tag, idx) => (
                      <span key={idx} className="tag">#{tag}</span>
                    ))}
                    {parseTags(entry.tags).length > 3 && (
                      <span className="tag-more">+{parseTags(entry.tags).length - 3}</span>
                    )}
                  </div>
                )}

                <div className="entry-footer">
                  <span className="read-more">
                    {entry.is_private === 1 ? 'Unlock to read' : 'Read more'}
                    <ArrowRight size={16} />
                  </span>
                </div>
              </div>
            ))}

          {hasMore && !loading && (
            <button className="load-more-btn" onClick={loadMore}>
              Load More
            </button>
          )}

          {loading && page > 1 && (
            <div className="loading-more">
              <Loader className="spinner" size={24} />
              <span>Loading more entries...</span>
            </div>
          )}
        </div>
      </div>

      {/* PIN Modal */}
      {
        showPinModal && (
          <PinModal
            isOpen={showPinModal}
            mode={pinModalMode}
            onClose={() => setShowPinModal(false)}
            onSuccess={() => {
              handlePinSuccess();
              setShowPinModal(false);
            }}
          />
        )
      }
    </div >
  );
};

export default EntriesList;

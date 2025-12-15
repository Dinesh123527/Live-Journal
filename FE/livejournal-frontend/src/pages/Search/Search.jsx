import {
  ArrowLeft,
  ArrowUpDown,
  BookOpen,
  Calendar,
  Filter,
  Globe,
  Loader,
  Lock,
  Mic,
  MicOff,
  Search as SearchIcon,
  Tag,
  TrendingUp,
  X
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar/Navbar.jsx';
import { useVapiJournal } from '../../hooks/useVapiJournal';
import axiosInstance from '../../utils/axiosInstance';
import './Search.scss';

const Search = () => {
  const navigate = useNavigate();

  // User info
  const [username, setUsername] = useState('User');
  const [userEmail, setUserEmail] = useState('user@example.com');

  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [mood, setMood] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [order, setOrder] = useState('DESC');

  // Results states
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);

  // Available tags
  const [availableTags, setAvailableTags] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // VAPI Voice Search states
  const {
    startRecording,
    stopRecording,
    isRecording,
    transcript,
    clearTranscript,
    error: vapiError
  } = useVapiJournal();

  const [voiceSearchActive, setVoiceSearchActive] = useState(false);

  // Mood options
  const moodOptions = [
    { value: '', label: 'All Moods' },
    { value: 'happy', label: '😊 Happy' },
    { value: 'joyful', label: '😄 Joyful' },
    { value: 'excited', label: '🤩 Excited' },
    { value: 'content', label: '🙂 Content' },
    { value: 'calm', label: '😌 Calm' },
    { value: 'neutral', label: '😐 Neutral' },
    { value: 'anxious', label: '😟 Anxious' },
    { value: 'stressed', label: '😰 Stressed' },
    { value: 'sad', label: '😢 Sad' },
    { value: 'angry', label: '😠 Angry' }
  ];

  // Sort options
  const sortOptions = [
    { value: 'created_at-DESC', label: 'Newest First', sortBy: 'created_at', order: 'DESC' },
    { value: 'created_at-ASC', label: 'Oldest First', sortBy: 'created_at', order: 'ASC' },
    { value: 'mood_score-DESC', label: 'Mood: High to Low', sortBy: 'mood_score', order: 'DESC' },
    { value: 'mood_score-ASC', label: 'Mood: Low to High', sortBy: 'mood_score', order: 'ASC' }
  ];

  // Fetch user info
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await axiosInstance.get('/auth/me');
        if (response.data && response.data.user) {
          setUsername(response.data.user.name || 'User');
          setUserEmail(response.data.user.email || 'user@example.com');
        }
      } catch (err) {
        console.error('Failed to fetch user info:', err);
      }
    };
    fetchUserInfo();
  }, []);

  // Fetch available tags
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const response = await axiosInstance.get('/analytics/tags');
        if (response.data && response.data.data) {
          const tags = response.data.data.map(t => t.tag);
          setAvailableTags(tags);
        }
      } catch (err) {
        console.error('Failed to fetch tags:', err);
      }
    };
    fetchTags();
  }, []);

  // Search function
  const performSearch = useCallback(async () => {
    try {
      setLoading(true);

      const params = {
        page,
        pageSize
      };

      if (searchQuery.trim()) params.q = searchQuery.trim();
      if (mood) params.mood = mood;
      if (selectedTags.length > 0) params.tags = selectedTags.join(',');
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (sortBy) params.sortBy = sortBy;
      if (order) params.order = order;

      const response = await axiosInstance.get('/search', { params });

      if (response.data) {
        setResults(response.data.data || []);
        setTotalResults(response.data.meta?.total || 0);
        setHasSearched(true);
      }
    } catch (err) {
      console.error('Search failed:', err);
      setResults([]);
      setTotalResults(0);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, mood, selectedTags, dateFrom, dateTo, sortBy, order, page]);

  // Auto-search when filters change
  useEffect(() => {
    if (hasSearched) {
      const timer = setTimeout(() => {
        performSearch();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [mood, selectedTags, dateFrom, dateTo, sortBy, order, page, hasSearched, performSearch]);

  // Handle search submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    performSearch();
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    if (hasSearched && e.target.value.trim() === '') {
      setPage(1);
      performSearch();
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setMood('');
    setSelectedTags([]);
    setDateFrom('');
    setDateTo('');
    setSortBy('created_at');
    setOrder('DESC');
    setPage(1);
    setResults([]);
    setHasSearched(false);
  };

  // Handle tag toggle
  const toggleTag = (tag) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  // Handle sort change
  const handleSortChange = (value) => {
    const option = sortOptions.find(o => o.value === value);
    if (option) {
      setSortBy(option.sortBy);
      setOrder(option.order);
    }
  };

  // Format date for display
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

  // Get mood emoji
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

  // Parse tags
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

  // Truncate text
  const truncateText = (text, maxLength) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Parse voice commands for search
  useEffect(() => {
    if (transcript && voiceSearchActive) {
      parseVoiceSearchCommand(transcript);
    }
  }, [transcript, voiceSearchActive]);

  const parseVoiceSearchCommand = (text) => {
    const lowerText = text.toLowerCase();

    // Extract search query
    if (lowerText.includes('search for') || lowerText.includes('find')) {
      const searchMatch = text.match(/(?:search for|find)\s+(.+?)(?:\s+(?:tagged|with mood|from|in|$))/i);
      if (searchMatch && searchMatch[1]) {
        setSearchQuery(searchMatch[1].trim());
      }
    }

    // Extract mood filter
    const moodKeywords = ['happy', 'sad', 'angry', 'stressed', 'excited', 'calm', 'anxious', 'neutral', 'joyful', 'content'];
    moodKeywords.forEach(moodKeyword => {
      if (lowerText.includes(moodKeyword)) {
        setMood(moodKeyword);
      }
    });

    // Extract tags
    if (lowerText.includes('tagged') || lowerText.includes('with tag')) {
      const tagMatch = text.match(/(?:tagged|with tag)\s+(.+?)(?:\s+(?:from|in|$))/i);
      if (tagMatch && tagMatch[1]) {
        const tags = tagMatch[1].split(/(?:and|,)\s*/).map(t => t.trim()).filter(Boolean);
        setSelectedTags(tags);
      }
    }

    // Extract date ranges
    if (lowerText.includes('last week')) {
      const today = new Date();
      const lastWeek = new Date(today);
      lastWeek.setDate(today.getDate() - 7);
      setDateFrom(lastWeek.toISOString().split('T')[0]);
      setDateTo(today.toISOString().split('T')[0]);
    } else if (lowerText.includes('last month')) {
      const today = new Date();
      const lastMonth = new Date(today);
      lastMonth.setMonth(today.getMonth() - 1);
      setDateFrom(lastMonth.toISOString().split('T')[0]);
      setDateTo(today.toISOString().split('T')[0]);
    } else if (lowerText.includes('today')) {
      const today = new Date().toISOString().split('T')[0];
      setDateFrom(today);
      setDateTo(today);
    } else if (lowerText.includes('yesterday')) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      setDateFrom(yesterdayStr);
      setDateTo(yesterdayStr);
    }

    // Trigger search if we have commands
    if (lowerText.includes('search') || lowerText.includes('find')) {
      setTimeout(() => {
        setPage(1);
        performSearch();
      }, 500);
    }
  };

  const toggleVoiceSearch = async () => {
    if (isRecording) {
      stopRecording();
      setVoiceSearchActive(false);
    } else {
      clearTranscript();
      setVoiceSearchActive(true);
      await startRecording();
    }
  };

  const userProfileInfo = { name: username, email: userEmail };

  return (
    <div className="search-page">
      <Navbar isAuthenticated={true} userProfileInfo={userProfileInfo} />

      <div className="search-content">
        {/* Back Button Header - Like EntryEditor */}
        <div className="search-top-header">
          <button className="back-btn" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={18} />
            <span>Back to Dashboard</span>
          </button>
        </div>

        {/* Header */}
        <div className="search-header">
          <h1>Search Your Journal</h1>
          <p>Find entries by content, mood, tags, or date</p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="search-bar-container">
          <div className="search-input-wrapper">
            <SearchIcon size={20} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search your journal..."
              value={searchQuery}
              onChange={handleSearchChange}
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => {
                  setSearchQuery('');
                  if (hasSearched) {
                    setPage(1);
                    performSearch();
                  }
                }}
              >
                <X size={18} />
              </button>
            )}
          </div>
          <button type="submit" className="search-submit-btn">
            Search
          </button>
        </form>

        {/* Action Buttons Row: Filters + Voice Search */}
        <div className="search-actions-row">
          {/* Filters Button */}
          <div className="filters-toggle">
            <button
              className={`toggle-filters-btn ${showFilters ? 'active' : ''}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter size={18} />
              <span>Filters</span>
              {(mood || selectedTags.length > 0 || dateFrom || dateTo) && (
                <span className="active-filters-count">
                  {[mood, ...selectedTags, dateFrom, dateTo].filter(Boolean).length}
                </span>
              )}
            </button>

            {(mood || selectedTags.length > 0 || dateFrom || dateTo || searchQuery) && (
              <button className="clear-all-btn" onClick={clearFilters}>
                <X size={16} />
                <span>Clear All</span>
              </button>
            )}
          </div>

          <button
            className={`voice-search-btn ${isRecording ? 'recording' : ''}`}
            onClick={toggleVoiceSearch}
            title={isRecording ? 'Stop Voice Search' : 'Start Voice Search'}
          >
            {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
            <span>{isRecording ? 'Stop Search' : 'Voice Search'}</span>
          </button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="filters-panel">
            {/* Mood Filter */}
            <div className="filter-group">
              <label>
                <TrendingUp size={16} />
                <span>Mood</span>
              </label>
              <div className="mood-chips">
                {moodOptions.map(option => (
                  <button
                    key={option.value}
                    className={`mood-chip ${mood === option.value ? 'active' : ''}`}
                    onClick={() => setMood(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tags Filter */}
            <div className="filter-group">
              <label>
                <Tag size={16} />
                <span>Tags</span>
              </label>
              {availableTags.length > 0 ? (
                <div className="tags-chips">
                  {availableTags.slice(0, 20).map(tag => (
                    <button
                      key={tag}
                      className={`tag-chip ${selectedTags.includes(tag) ? 'active' : ''}`}
                      onClick={() => toggleTag(tag)}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="no-tags-hint">No tags yet. Add tags to your entries to filter by them.</p>
              )}
            </div>

            {/* Date Range Filter */}
            <div className="filter-group date-range-group">
              <label>
                <Calendar size={16} />
                <span>Date Range</span>
              </label>

              {/* Quick Date Presets */}
              <div className="date-presets">
                <button
                  className={`preset-btn ${!dateFrom && !dateTo ? 'active' : ''}`}
                  onClick={() => {
                    setDateFrom('');
                    setDateTo('');
                  }}
                >
                  All Time
                </button>
                <button
                  className={`preset-btn ${(() => {
                    const today = new Date().toISOString().split('T')[0];
                    return dateFrom === today && dateTo === today;
                  })() ? 'active' : ''}`}
                  onClick={() => {
                    const today = new Date().toISOString().split('T')[0];
                    setDateFrom(today);
                    setDateTo(today);
                  }}
                >
                  Today
                </button>
                <button
                  className={`preset-btn ${(() => {
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    const yesterdayStr = yesterday.toISOString().split('T')[0];
                    return dateFrom === yesterdayStr && dateTo === yesterdayStr;
                  })() ? 'active' : ''}`}
                  onClick={() => {
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    const yesterdayStr = yesterday.toISOString().split('T')[0];
                    setDateFrom(yesterdayStr);
                    setDateTo(yesterdayStr);
                  }}
                >
                  Yesterday
                </button>
                <button
                  className={`preset-btn ${(() => {
                    const today = new Date();
                    const lastWeek = new Date(today);
                    lastWeek.setDate(today.getDate() - 7);
                    const fromStr = lastWeek.toISOString().split('T')[0];
                    const toStr = today.toISOString().split('T')[0];
                    return dateFrom === fromStr && dateTo === toStr;
                  })() ? 'active' : ''}`}
                  onClick={() => {
                    const today = new Date();
                    const lastWeek = new Date(today);
                    lastWeek.setDate(today.getDate() - 7);
                    setDateFrom(lastWeek.toISOString().split('T')[0]);
                    setDateTo(today.toISOString().split('T')[0]);
                  }}
                >
                  Last 7 Days
                </button>
                <button
                  className={`preset-btn ${(() => {
                    const today = new Date();
                    const lastMonth = new Date(today);
                    lastMonth.setDate(today.getDate() - 30);
                    const fromStr = lastMonth.toISOString().split('T')[0];
                    const toStr = today.toISOString().split('T')[0];
                    return dateFrom === fromStr && dateTo === toStr;
                  })() ? 'active' : ''}`}
                  onClick={() => {
                    const today = new Date();
                    const lastMonth = new Date(today);
                    lastMonth.setDate(today.getDate() - 30);
                    setDateFrom(lastMonth.toISOString().split('T')[0]);
                    setDateTo(today.toISOString().split('T')[0]);
                  }}
                >
                  Last 30 Days
                </button>
                <button
                  className={`preset-btn ${(() => {
                    const today = new Date();
                    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                    const fromStr = startOfMonth.toISOString().split('T')[0];
                    const toStr = today.toISOString().split('T')[0];
                    return dateFrom === fromStr && dateTo === toStr;
                  })() ? 'active' : ''}`}
                  onClick={() => {
                    const today = new Date();
                    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                    setDateFrom(startOfMonth.toISOString().split('T')[0]);
                    setDateTo(today.toISOString().split('T')[0]);
                  }}
                >
                  This Month
                </button>
              </div>

              {/* Custom Date Range */}
              <div className="custom-date-range">
                <div className="date-input-wrapper">
                  <div className="date-input-group">
                    <div
                      className="date-input-container"
                      onClick={(e) => {
                        // If clicking on the container, focus the input to open calendar
                        if (e.target.classList.contains('date-input-container')) {
                          e.currentTarget.querySelector('input').showPicker?.();
                        }
                      }}
                    >
                      <Calendar size={14} className="date-icon" />
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        max={dateTo || new Date().toISOString().split('T')[0]}
                        className="enhanced-date-input"
                        placeholder="Start date"
                      />
                    </div>
                  </div>

                  <div className="date-separator">
                    <div className="separator-line"></div>
                    <span className="separator-icon">→</span>
                    <div className="separator-line"></div>
                  </div>

                  <div className="date-input-group">
                    <div
                      className="date-input-container"
                      onClick={(e) => {
                        // If clicking on the container, focus the input to open calendar
                        if (e.target.classList.contains('date-input-container')) {
                          e.currentTarget.querySelector('input').showPicker?.();
                        }
                      }}
                    >
                      <Calendar size={14} className="date-icon" />
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        min={dateFrom}
                        max={new Date().toISOString().split('T')[0]}
                        className="enhanced-date-input"
                        placeholder="End date"
                      />
                    </div>
                  </div>
                </div>

                {/* Date Range Info */}
                {dateFrom && dateTo && (
                  <div className="date-range-info">
                    <span className="range-badge">
                      {(() => {
                        const from = new Date(dateFrom);
                        const to = new Date(dateTo);
                        const diffTime = Math.abs(to - from);
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                        return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} selected`;
                      })()}
                    </span>
                    <button
                      className="clear-dates-btn"
                      onClick={() => {
                        setDateFrom('');
                        setDateTo('');
                      }}
                      title="Clear dates"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Sort Filter */}
            <div className="filter-group">
              <label>
                <ArrowUpDown size={16} />
                <span>Sort By</span>
              </label>
              <select
                value={`${sortBy}-${order}`}
                onChange={(e) => handleSortChange(e.target.value)}
                className="sort-select"
              >
                {sortOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Results Summary */}
        {hasSearched && (
          <div className="results-summary">
            <p>
              {loading ? (
                'Searching...'
              ) : (
                <>
                  Found <strong>{totalResults}</strong> {totalResults === 1 ? 'entry' : 'entries'}
                  {searchQuery && ` for "${searchQuery}"`}
                </>
              )}
            </p>
          </div>
        )}

        {/* Results List */}
        <div className="search-results">
          {loading ? (
            <div className="loading-state">
              <Loader className="spinner" size={48} />
              <p>Searching your journal...</p>
            </div>
          ) : results.length > 0 ? (
            <>
              <div className="results-list">
                {results.map(entry => (
                  <div
                    key={entry.id}
                    className={`result-item ${entry.is_private === 1 ? 'private-entry' : 'public-entry'}`}
                    onClick={() => navigate(`/dashboard/entry/${entry.id}`)}
                  >
                    <div className="result-mood">
                      <span className="mood-emoji">{getMoodEmoji(entry.mood_label)}</span>
                    </div>
                    <div className="result-content">
                      <div className="result-title-row">
                        <h4>{entry.title || 'Untitled Entry'}</h4>
                        {entry.is_private === 1 ? (
                          <Lock size={16} className="privacy-icon private" />
                        ) : (
                          <Globe size={16} className="privacy-icon public" />
                        )}
                      </div>
                      <p className="result-body">{truncateText(entry.body, 200)}</p>
                      <div className="result-meta">
                        <span className="result-date">{formatDate(entry.created_at)}</span>
                        {entry.mood_label && (
                          <span className="result-mood-label">
                            {getMoodEmoji(entry.mood_label)} {entry.mood_label}
                          </span>
                        )}
                        {parseTags(entry.tags).length > 0 && (
                          <div className="result-tags">
                            {parseTags(entry.tags).slice(0, 3).map((tag, idx) => (
                              <span key={idx} className="tag">#{tag}</span>
                            ))}
                            {parseTags(entry.tags).length > 3 && (
                              <span className="more-tags">+{parseTags(entry.tags).length - 3}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalResults > pageSize && (
                <div className="pagination">
                  <button
                    className="page-btn"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </button>
                  <span className="page-info">
                    Page {page} of {Math.ceil(totalResults / pageSize)}
                  </span>
                  <button
                    className="page-btn"
                    onClick={() => setPage(p => p + 1)}
                    disabled={page >= Math.ceil(totalResults / pageSize)}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          ) : hasSearched ? (
            <div className="empty-state">
              <BookOpen size={64} />
              <h3>No entries found</h3>
              <p>Try adjusting your search terms or filters</p>
              <button className="clear-filters-btn" onClick={clearFilters}>
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="initial-state">
              <SearchIcon size={64} />
              <h3>Start Searching</h3>
              <p>Enter keywords, select filters, and press Enter or click Search</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Search;


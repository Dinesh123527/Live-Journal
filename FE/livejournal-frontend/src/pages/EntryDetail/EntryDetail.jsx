import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Tag,
  Lock,
  Globe,
  Edit,
  Trash2,
  Loader,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import Navbar from '../../components/Navbar/Navbar.jsx';
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal.jsx';
import axiosInstance from '../../utils/axiosInstance';
import './EntryDetail.scss';

const EntryDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [entry, setEntry] = useState(null);
  const [error, setError] = useState(null);
  const [username, setUsername] = useState('User');
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Fetch user info
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await axiosInstance.get('/auth/me');
        if (response.data && response.data.user) {
          setUsername(response.data.user.name || 'User');
        }
      } catch (err) {
        console.error('Failed to fetch user info:', err);
      }
    };
    fetchUserInfo();
  }, []);

  // Fetch entry
  useEffect(() => {
    const fetchEntry = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await axiosInstance.get(`/entries/${id}`);
        setEntry(response.data);
      } catch (err) {
        console.error('Failed to fetch entry:', err);
        setError('Failed to load entry. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchEntry();
    }
  }, [id]);

  const handleDelete = async () => {
    try {
      setDeleting(true);
      setError(null);

      await axiosInstance.delete(`/entries/${id}`);

      // Show success message briefly before navigating
      setTimeout(() => {
        navigate('/dashboard/entries', {
          state: { message: 'Entry deleted successfully' }
        });
      }, 500);
    } catch (err) {
      console.error('Failed to delete entry:', err);
      setError('Failed to delete entry. Please try again.');
      setDeleting(false);
    }
  };

  const handleEdit = () => {
    // Navigate to entry editor with entry data for editing
    navigate(`/dashboard/edit-entry/${id}`, {
      state: { entry }
    });
  };

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
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  const userProfileInfo = { name: username };

  if (loading) {
    return (
      <div className="entry-detail-page">
        <Navbar isAuthenticated={true} userProfileInfo={userProfileInfo} />
        <div className="entry-loading">
          <Loader className="spinner" size={48} />
          <p>Loading entry...</p>
        </div>
      </div>
    );
  }

  if (error || !entry) {
    return (
      <div className="entry-detail-page">
        <Navbar isAuthenticated={true} userProfileInfo={userProfileInfo} />
        <div className="entry-error">
          <p>{error || 'Entry not found'}</p>
          <button onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <div className="entry-detail-page">
      <Navbar isAuthenticated={true} userProfileInfo={userProfileInfo} />

      <div className="entry-detail-container">
        {/* Header */}
        <div className="entry-header">
          <button className="back-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>

          <div className="header-actions">
            <button
              className="edit-btn"
              onClick={handleEdit}
              disabled={deleting}
            >
              <Edit size={18} />
              <span>Edit</span>
            </button>
            <button
              className="delete-btn"
              onClick={() => setConfirmOpen(true)}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader className="spinner" size={18} />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 size={18} />
                  <span>Delete</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="error-alert">
            <AlertCircle size={20} />
            <span>{error}</span>
            <button onClick={() => setError(null)}>×</button>
          </div>
        )}

        {/* Entry Content */}
        <div className="entry-content-card">
          {/* Mood & Privacy */}
          <div className="entry-top">
            <div className="mood-section">
              <div className="mood-emoji-large">
                {getMoodEmoji(entry.mood_label)}
              </div>
              <div className="mood-info">
                <span className="mood-label">{entry.mood_label || 'Unknown'}</span>
                {entry.mood_score !== null && (
                  <div className="mood-score-bar">
                    <div
                      className="score-fill"
                      style={{ width: `${(entry.mood_score || 0) * 100}%` }}
                    ></div>
                  </div>
                )}
                {entry.mood_score !== null && (
                  <span className="mood-score-text">
                    {Math.round((entry.mood_score || 0) * 100)}% positive
                  </span>
                )}
              </div>
            </div>

            <div className="privacy-badge">
              {entry.is_private === 1 ? (
                <>
                  <Lock size={16} />
                  <span>Private</span>
                </>
              ) : (
                <>
                  <Globe size={16} />
                  <span>Public</span>
                </>
              )}
            </div>
          </div>

          {/* Title */}
          <h1 className="entry-title">{entry.title || 'Untitled Entry'}</h1>

          {/* Meta Information */}
          <div className="entry-meta">
            <div className="meta-item">
              <Calendar size={16} />
              <span>{formatDate(entry.created_at)}</span>
            </div>
            {entry.updated_at !== entry.created_at && (
              <div className="meta-item">
                <Sparkles size={16} />
                <span>Updated {formatDate(entry.updated_at)}</span>
              </div>
            )}
          </div>

          {/* Tags */}
          {parseTags(entry.tags).length > 0 && (
            <div className="entry-tags">
              <Tag size={16} />
              <div className="tags-list">
                {parseTags(entry.tags).map((tag, idx) => (
                  <span key={idx} className="tag">#{tag}</span>
                ))}
              </div>
            </div>
          )}

          {/* Body */}
          <div className="entry-body">
            {entry.body.split('\n').map((paragraph, idx) => (
              <p key={idx}>{paragraph}</p>
            ))}
          </div>
        </div>

        {/* Confirm Delete Modal */}
        <ConfirmModal
          isOpen={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          onConfirm={handleDelete}
          title="Delete Entry?"
          message="Are you sure you want to delete this entry? This action cannot be undone and all your content will be permanently deleted."
          type="danger"
          confirmText="Delete"
          confirmButtonStyle="danger"
        />
      </div>
    </div>
  );
};

export default EntryDetail;

import { ArrowLeft, BookOpen, Edit3, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal.jsx';
import Navbar from '../../components/Navbar/Navbar.jsx';
import axiosInstance from '../../utils/axiosInstance';
import './LifeChapters.scss';

const LifeChapters = () => {
    const navigate = useNavigate();
    const [chapters, setChapters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [editingChapter, setEditingChapter] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
    const [showCloseConfirm, setShowCloseConfirm] = useState(null);
    const [isViewOnly, setIsViewOnly] = useState(false);
    const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'ongoing', 'completed'
    const [userInfo, setUserInfo] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        start_date: '',
        end_date: '',
        is_ongoing: true
    });

    useEffect(() => {
        fetchChapters();
        fetchUserInfo();
    }, []);

    const fetchUserInfo = () => {
        try {
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                setUserInfo(JSON.parse(storedUser));
            }
        } catch (error) {
            console.error('Error fetching user info:', error);
        }
    };

    const fetchChapters = async () => {
        try {
            setLoading(true);
            const response = await axiosInstance.get('/life-chapters');
            if (response.data?.data) {
                setChapters(response.data.data);
            }
        } catch (err) {
            console.error('Error fetching chapters:', err);
            setError('Failed to load chapters');
        } finally {
            setLoading(false);
        }
    };

    const formatDateRange = (startDate, endDate) => {
        if (!startDate) return '';

        const start = new Date(startDate);
        const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        if (!endDate) {
            return `${startStr} – Present`;
        }

        const end = new Date(endDate);
        const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        return `${startStr} – ${endStr}`;
    };

    const openCreateModal = () => {
        setEditingChapter(null);
        setFormData({
            title: '',
            description: '',
            start_date: new Date().toISOString().split('T')[0],
            end_date: '',
            is_ongoing: true
        });
        setShowModal(true);
    };

    const openEditModal = (chapter, viewOnly = false) => {
        setEditingChapter(chapter);
        setIsViewOnly(viewOnly);

        // Parse date using local timezone since user enters dates in local time
        // This correctly handles dates stored as UTC by converting back to user's local date
        const parseDate = (dateStr) => {
            if (!dateStr) return '';
            const date = new Date(dateStr);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        setFormData({
            title: chapter.title,
            description: chapter.description || '',
            start_date: parseDate(chapter.start_date),
            end_date: parseDate(chapter.end_date),
            is_ongoing: !chapter.end_date
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const payload = {
                title: formData.title,
                description: formData.description || null,
                start_date: formData.start_date || null,
                end_date: formData.is_ongoing ? null : formData.end_date || null,
                is_active: formData.is_ongoing ? 1 : 0
            };

            if (editingChapter) {
                await axiosInstance.put(`/life-chapters/${editingChapter.id}`, payload);
            } else {
                await axiosInstance.post('/life-chapters', payload);
            }

            setShowModal(false);
            fetchChapters();
        } catch (err) {
            console.error('Error saving chapter:', err);
            setError(err.response?.data?.error || 'Failed to save chapter');
        }
    };

    const handleDelete = async (chapterId) => {
        try {
            await axiosInstance.delete(`/life-chapters/${chapterId}`);
            setShowDeleteConfirm(null);
            fetchChapters();
        } catch (err) {
            console.error('Error deleting chapter:', err);
            setError('Failed to delete chapter');
        }
    };

    const handleCloseChapter = async (chapterId) => {
        try {
            await axiosInstance.post(`/life-chapters/${chapterId}/close`);
            fetchChapters();
        } catch (err) {
            console.error('Error closing chapter:', err);
            setError('Failed to close chapter');
        }
    };

    return (
        <div className="life-chapters-page">
            <Navbar isAuthenticated={true} userProfileInfo={userInfo} />

            <div className="life-chapters-container">
                {/* Header */}
                <div className="page-header">
                    <button className="back-btn" onClick={() => navigate('/dashboard')}>
                        <ArrowLeft size={20} />
                        <span>Back to Dashboard</span>
                    </button>
                </div>

                <div className="title-section">
                    <div className="title-content">
                        <BookOpen size={32} className="title-icon" />
                        <div>
                            <h1>Life Chapters</h1>
                            <p>Your journey, told in chapters</p>
                        </div>
                    </div>
                    <button className="new-chapter-btn" onClick={openCreateModal}>
                        <Plus size={20} />
                        <span>New Chapter</span>
                    </button>
                </div>

                {/* Filter Tabs */}
                {!loading && chapters.length > 0 && (
                    <div className="filter-tabs">
                        <button
                            className={`filter-tab ${activeFilter === 'all' ? 'active' : ''}`}
                            onClick={() => setActiveFilter('all')}
                        >
                            All
                            <span className="tab-count">{chapters.length}</span>
                        </button>
                        <button
                            className={`filter-tab ${activeFilter === 'ongoing' ? 'active' : ''}`}
                            onClick={() => setActiveFilter('ongoing')}
                        >
                            Ongoing
                            <span className="tab-count">
                                {chapters.filter(c => c.is_active === 1 || (!c.end_date)).length}
                            </span>
                        </button>
                        <button
                            className={`filter-tab ${activeFilter === 'completed' ? 'active' : ''}`}
                            onClick={() => setActiveFilter('completed')}
                        >
                            Completed
                            <span className="tab-count">
                                {chapters.filter(c => c.is_active === 0 && c.end_date).length}
                            </span>
                        </button>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="alert alert-error">
                        <span>{error}</span>
                        <button onClick={() => setError(null)}>
                            <X size={18} />
                        </button>
                    </div>
                )}

                {/* Loading State */}
                {loading && (
                    <div className="loading-state">
                        <div className="loading-spinner"></div>
                        <p>Loading chapters...</p>
                    </div>
                )}

                {/* Empty State */}
                {!loading && chapters.length === 0 && (
                    <div className="empty-state">
                        <div className="empty-icon">📖</div>
                        <h2>Life is made of chapters.</h2>
                        <p>You don't need to label everything.<br />Just start where you are.</p>
                        <button className="create-first-btn" onClick={openCreateModal}>
                            <Plus size={20} />
                            Create First Chapter
                        </button>
                    </div>
                )}

                {/* Chapters Grid */}
                {!loading && chapters.length > 0 && (
                    <div className="chapters-grid">
                        {chapters
                            .filter(chapter => {
                                if (activeFilter === 'all') return true;
                                const isOngoing = chapter.is_active === 1 || !chapter.end_date;
                                if (activeFilter === 'ongoing') return isOngoing;
                                if (activeFilter === 'completed') return !isOngoing;
                                return true;
                            })
                            .map((chapter) => {
                                // Chapter is active if: is_active flag is 1 AND (no end date OR end date is today or later)
                                const isChapterActive = () => {
                                    // If backend marked it as inactive, it's inactive
                                    if (chapter.is_active === 0) return false;
                                    // If no end date, it's ongoing/active
                                    if (!chapter.end_date) return true;
                                    // If end date is today or future, still active
                                    const endDate = new Date(chapter.end_date);
                                    const today = new Date();
                                    today.setHours(0, 0, 0, 0);
                                    return endDate >= today;
                                };
                                const active = isChapterActive();

                                return (
                                    <div
                                        key={chapter.id}
                                        className={`chapter-card ${active ? 'active' : 'past'}`}
                                    >
                                        <div className="chapter-header">
                                            <span className="chapter-icon">📘</span>
                                            {active ? (
                                                <span className="active-badge">Active</span>
                                            ) : (
                                                <span className="inactive-badge">Inactive</span>
                                            )}
                                        </div>

                                        <h3 className="chapter-title">{chapter.title}</h3>
                                        <p className="chapter-date">{formatDateRange(chapter.start_date, chapter.end_date)}</p>

                                        {chapter.description && (
                                            <p className="chapter-description">
                                                {chapter.description.length > 100
                                                    ? chapter.description.substring(0, 100) + '...'
                                                    : chapter.description}
                                            </p>
                                        )}

                                        <div className="chapter-actions">
                                            <button
                                                className="action-btn view-btn"
                                                onClick={() => openEditModal(chapter, !active)}
                                            >
                                                View
                                            </button>
                                            {active && (
                                                <button
                                                    className="action-btn edit-btn"
                                                    onClick={() => openEditModal(chapter, false)}
                                                >
                                                    <Edit3 size={16} />
                                                </button>
                                            )}
                                            {active && (
                                                <button
                                                    className="action-btn close-btn"
                                                    onClick={() => setShowCloseConfirm(chapter.id)}
                                                    title="Close this chapter"
                                                >
                                                    Close
                                                </button>
                                            )}
                                            <button
                                                className="action-btn delete-btn"
                                                onClick={() => setShowDeleteConfirm(chapter.id)}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="chapter-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>
                                <BookOpen size={24} />
                                {isViewOnly ? 'View Chapter' : (editingChapter ? 'Edit Chapter' : 'New Life Chapter')}
                            </h2>
                            <button className="close-modal-btn" onClick={() => setShowModal(false)}>
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label htmlFor="title">Chapter Title {!isViewOnly && '*'}</label>
                                <input
                                    type="text"
                                    id="title"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="e.g., Finding My Direction"
                                    required={!isViewOnly}
                                    disabled={isViewOnly}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="description">Description {isViewOnly ? '' : '(optional)'}</label>
                                <textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="What is this chapter about?"
                                    rows={3}
                                    disabled={isViewOnly}
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="start_date">Start Date</label>
                                    <input
                                        type="date"
                                        id="start_date"
                                        value={formData.start_date}
                                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                        disabled={isViewOnly}
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="end_date">End Date</label>
                                    <input
                                        type="date"
                                        id="end_date"
                                        value={formData.end_date}
                                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                        disabled={isViewOnly || formData.is_ongoing}
                                    />
                                </div>
                            </div>

                            {!isViewOnly && (
                                <div className="form-group checkbox-group">
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={formData.is_ongoing}
                                            onChange={(e) => setFormData({ ...formData, is_ongoing: e.target.checked })}
                                        />
                                        <span>Ongoing (no end date)</span>
                                    </label>
                                </div>
                            )}

                            {!isViewOnly && (
                                <p className="form-hint">
                                    Life chapters don't need to be perfect.<br />
                                    They just help you see patterns.
                                </p>
                            )}

                            <div className="form-actions">
                                <button type="button" className="cancel-btn" onClick={() => setShowModal(false)}>
                                    {isViewOnly ? 'Close' : 'Cancel'}
                                </button>
                                {!isViewOnly && (
                                    <button
                                        type="submit"
                                        className="save-btn"
                                        disabled={!formData.title.trim()}
                                    >
                                        {editingChapter ? 'Save Changes' : 'Create Chapter'}
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                isOpen={!!showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(null)}
                onConfirm={() => handleDelete(showDeleteConfirm)}
                title={`Delete "${chapters.find(c => c.id === showDeleteConfirm)?.title || 'Chapter'}"?`}
                message="This will remove the chapter from your journey. Your journal entries will remain safe and accessible."
                confirmText="Delete Chapter"
                cancelText="Keep It"
                type="danger"
                confirmButtonStyle="danger"
            />

            {/* Close Chapter Confirmation Modal */}
            <ConfirmModal
                isOpen={!!showCloseConfirm}
                onClose={() => setShowCloseConfirm(null)}
                onConfirm={() => {
                    handleCloseChapter(showCloseConfirm);
                    setShowCloseConfirm(null);
                }}
                title={`Close "${chapters.find(c => c.id === showCloseConfirm)?.title || 'Chapter'}"?`}
                message="Closing this chapter marks the end of this phase. You can always start a new chapter when you're ready."
                confirmText="Close Chapter"
                cancelText="Not Yet"
                type="warning"
                confirmButtonStyle="primary"
            />
        </div>
    );
};

export default LifeChapters;

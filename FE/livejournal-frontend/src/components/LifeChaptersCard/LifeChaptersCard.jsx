import { ArrowRight, BookOpen } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';
import './LifeChaptersCard.scss';

const LifeChaptersCard = () => {
    const navigate = useNavigate();
    const [activeChapter, setActiveChapter] = useState(null);
    const [loading, setLoading] = useState(true);
    const [entryCount, setEntryCount] = useState(0);

    useEffect(() => {
        const fetchActiveChapter = async () => {
            try {
                const response = await axiosInstance.get('/life-chapters');
                if (response.data?.data) {
                    const chapters = response.data.data;
                    const active = chapters.find(c => c.is_active === 1);
                    setActiveChapter(active || null);

                    // Count total entries for active chapter (placeholder - can enhance later)
                    if (active) {
                        setEntryCount(active.entry_count || 0);
                    }
                }
            } catch (error) {
                console.error('Error fetching life chapters:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchActiveChapter();
    }, []);

    const formatDateRange = (startDate, endDate) => {
        if (!startDate) return '';

        const start = new Date(startDate);
        const startStr = start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

        if (!endDate) {
            return `${startStr} – Present`;
        }

        const end = new Date(endDate);
        const endStr = end.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        return `${startStr} – ${endStr}`;
    };

    if (loading) {
        return (
            <div className="life-chapters-card loading">
                <div className="card-shimmer"></div>
            </div>
        );
    }

    return (
        <div
            className={`life-chapters-card ${activeChapter ? 'has-chapter' : 'empty-state'}`}
            onClick={() => navigate('/dashboard/life-chapters')}
        >
            <div className="card-header">
                <h3>
                    <BookOpen size={20} />
                    Life Chapters
                </h3>
                {activeChapter && (
                    <span className="active-badge">Active</span>
                )}
            </div>

            <div className="card-content">
                {activeChapter ? (
                    <div className="chapter-preview">
                        <div className="chapter-icon">📖</div>
                        <div className="chapter-info">
                            <h4 className="chapter-title">{activeChapter.title}</h4>
                            <p className="chapter-date">{formatDateRange(activeChapter.start_date, activeChapter.end_date)}</p>
                            {activeChapter.description && (
                                <p className="chapter-description">
                                    {activeChapter.description.length > 60
                                        ? activeChapter.description.substring(0, 60) + '...'
                                        : activeChapter.description}
                                </p>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="empty-chapter-state">
                        <div className="empty-icon">📖</div>
                        <p className="empty-title">Start Your First Life Chapter</p>
                        <p className="empty-hint">
                            Life chapters help you group moments into meaningful phases.
                        </p>
                        <p className="empty-note">You can always change or end it later.</p>
                    </div>
                )}
            </div>

            <div className="card-action">
                <span>{activeChapter ? 'View Chapters' : 'Create First Chapter'}</span>
                <ArrowRight size={18} />
            </div>
        </div>
    );
};

export default LifeChaptersCard;

import Cookies from 'js-cookie';
import { ArrowRight, Bell, BookOpen, Calendar, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar/Navbar.jsx';
import ScrollProgressBar from '../../components/ScrollProgressBar/ScrollProgressBar.jsx';
import axiosInstance from '../../utils/axiosInstance';
import { formatName } from '../../utils/helpers';
import './Welcome.scss';

const Welcome = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [currentText, setCurrentText] = useState('');
  const [aiGreeting, setAiGreeting] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);
  const [timeBasedGreeting, setTimeBasedGreeting] = useState('Hello');

  // New state for stats
  const [stats, setStats] = useState({
    totalEntries: 0,
    upcomingEvents: 0,
    activeReminders: 0,
    isLoadingStats: true
  });

  // Function to get time-based greeting
  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 12) {
      return 'Good Morning';
    } else if (hour >= 12 && hour < 17) {
      return 'Good Afternoon';
    } else if (hour >= 17 && hour < 22) {
      return 'Good Evening';
    } else {
      return 'Good Night';
    }
  };

  useEffect(() => {
    // Set initial time-based greeting
    setTimeBasedGreeting(getTimeBasedGreeting());

    // Update greeting every minute
    const greetingInterval = setInterval(() => {
      setTimeBasedGreeting(getTimeBasedGreeting());
    }, 60000); // Update every minute

    return () => clearInterval(greetingInterval);
  }, []);

  useEffect(() => {
    const token = Cookies.get('accessToken');
    if (!token) {
      navigate('/login');
      return;
    }

    // Fetch user info and AI greeting from backend
    const fetchData = async () => {
      try {
        // Fetch user info
        const userResponse = await axiosInstance.get('/auth/me');
        const userName = userResponse.data.user.name || 'there';
        const email = userResponse.data.user.email || '';
        setUsername(userName);
        setUserEmail(email);
        // Format name for display (max 25 characters for greeting)
        setDisplayName(formatName(userName, 25));

        // Fetch AI greeting
        const greetingResponse = await axiosInstance.get('/ai/welcome-greeting');
        setAiGreeting(greetingResponse.data.greeting);
        setIsNewUser(greetingResponse.data.isNewUser);

        // Fetch stats data
        await fetchStats();
      } catch (error) {
        console.error('Failed to fetch data:', error);
        setUsername('there');
        setDisplayName('there');
        // Fallback greeting if AI fails
        setAiGreeting('Welcome to your personal sanctuary! I\'m here to help you capture your thoughts, track your mood, and discover insights about yourself. Let\'s begin this beautiful journey together.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  // New function to fetch stats
  const fetchStats = async () => {
    try {
      // Get date range for events (next 30 days)
      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + 30);

      const formatDate = (date) => {
        return date.toISOString().split('T')[0];
      };

      const fromDate = formatDate(today);
      const toDate = formatDate(futureDate);

      // Fetch all stats in parallel
      const [entriesRes, eventsRes, remindersRes] = await Promise.allSettled([
        axiosInstance.get('/entries?limit=1000'), // Get all entries to count them
        axiosInstance.get(`/events?from=${fromDate}&to=${toDate}`),
        axiosInstance.get('/reminders/upcoming?days=30')
      ]);

      // Extract counts from responses
      const totalEntries = entriesRes.status === 'fulfilled'
        ? (entriesRes.value.data.data?.length || 0)
        : 0;

      const upcomingEvents = eventsRes.status === 'fulfilled'
        ? (eventsRes.value.data.events?.length || 0)
        : 0;

      const activeReminders = remindersRes.status === 'fulfilled'
        ? (remindersRes.value.data.reminders?.length || 0)
        : 0;

      setStats({
        totalEntries,
        upcomingEvents,
        activeReminders,
        isLoadingStats: false
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      setStats(prev => ({ ...prev, isLoadingStats: false }));
    }
  };

  // Typing animation for AI greeting
  useEffect(() => {
    if (!aiGreeting) return;

    let index = 0;
    const timer = setInterval(() => {
      if (index < aiGreeting.length) {
        setCurrentText(aiGreeting.slice(0, index + 1));
        index++;
      } else {
        clearInterval(timer);
      }
    }, 15); // Typing speed

    return () => clearInterval(timer);
  }, [aiGreeting]);

  const statsCards = [
    {
      icon: <BookOpen />,
      emoji: '📝',
      title: 'Journal Entries',
      count: stats.totalEntries,
      description: stats.totalEntries === 1 ? 'entry written' : 'entries written',
      color: 'blue',
      onClick: () => navigate('/entries')
    },
    {
      icon: <Calendar />,
      emoji: '📅',
      title: 'Upcoming Events',
      count: stats.upcomingEvents,
      description: stats.upcomingEvents === 1 ? 'event scheduled' : 'events scheduled',
      color: 'purple',
      onClick: () => navigate('/calendar')
    },
    {
      icon: <Bell />,
      emoji: '🔔',
      title: 'Active Reminders',
      count: stats.activeReminders,
      description: stats.activeReminders === 1 ? 'reminder set' : 'reminders set',
      color: 'pink',
      onClick: () => navigate('/dashboard')
    }
  ];

  const userProfileInfo = {
    name: username,
    email: userEmail,
  };

  return (
    <div className="welcome-page">
      <Navbar isAuthenticated={true} userProfileInfo={userProfileInfo} />
      <ScrollProgressBar />

      <div className="background-decoration">
        <div className="floating-circle circle-1"></div>
        <div className="floating-circle circle-2"></div>
        <div className="floating-circle circle-3"></div>
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
      </div>

      <div className="welcome-content">
        {/* Main Greeting Card */}
        <div className="greeting-card">
          <div className="card-glow"></div>

          <h1 className="greeting-title">
            {timeBasedGreeting}, <span className="username">{displayName}</span>
            <span className="wave">👋</span>
          </h1>

          {/* AI Message with Icon */}
          <div className="ai-message">
            <div className="message-icon">
              <Sparkles />
            </div>
            <div className="message-text">
              {isLoading ? (
                <span className="loading-dots">Loading your personalized greeting...</span>
              ) : (
                <>
                  {currentText}
                  {currentText.length < aiGreeting.length && (
                    <span className="cursor"></span>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Stats Cards Grid */}
          <div className="features-grid stats-grid">
            {statsCards.map((stat, index) => (
              <div
                key={index}
                className={`feature-card stat-card feature-${stat.color}`}
                onClick={stat.onClick}
              >
                <div className="feature-icon-wrapper">
                  <div className="feature-icon">
                    {stat.icon}
                  </div>
                  <span className="feature-emoji">{stat.emoji}</span>
                </div>
                <div className="stat-count">
                  {stats.isLoadingStats ? (
                    <span className="loading-spinner">...</span>
                  ) : (
                    stat.count
                  )}
                </div>
                <h3>{stat.title}</h3>
                <p>{stat.description}</p>
              </div>
            ))}
          </div>

          {/* CTA Button */}
          <button
            onClick={() => navigate('/dashboard')}
            className="cta-button"
          >
            <span>{isNewUser ? 'Start Writing Your First Entry' : 'Continue Writing'}</span>
            <ArrowRight className="arrow-icon" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Welcome;

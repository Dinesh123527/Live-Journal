import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, BookOpen, TrendingUp, Shield } from 'lucide-react';
import Cookies from 'js-cookie';
import axiosInstance from '../../utils/axiosInstance';
import { formatName } from '../../utils/helpers';
import Navbar from '../../components/Navbar/Navbar.jsx';
import './Welcome.scss';

const Welcome = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [currentText, setCurrentText] = useState('');
  const [aiGreeting, setAiGreeting] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);
  const [timeBasedGreeting, setTimeBasedGreeting] = useState('Hello');

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
        setUsername(userName);
        // Format name for display (max 25 characters for greeting)
        setDisplayName(formatName(userName, 25));

        // Fetch AI greeting
        const greetingResponse = await axiosInstance.get('/ai/welcome-greeting');
        setAiGreeting(greetingResponse.data.greeting);
        setIsNewUser(greetingResponse.data.isNewUser);
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

  const features = [
    {
      icon: <BookOpen />,
      emoji: '📝',
      title: 'Smart Writing',
      description: 'AI-assisted journaling with intelligent suggestions',
      color: 'blue'
    },
    {
      icon: <TrendingUp />,
      emoji: '📊',
      title: 'Mood Tracking',
      description: 'Visualize your emotions and mental patterns',
      color: 'purple'
    },
    {
      icon: <Shield />,
      emoji: '🔒',
      title: 'Private & Secure',
      description: 'End-to-end encrypted, your thoughts stay yours',
      color: 'pink'
    }
  ];

  // Create user profile info object
  const userProfileInfo = {
    name: username, // Keep full name for profile
  };

  return (
    <div className="welcome-page">
      <Navbar isAuthenticated={true} userProfileInfo={userProfileInfo} />

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

          {/* Feature Cards Grid */}
          <div className="features-grid">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`feature-card feature-${feature.color}`}
              >
                <div className="feature-icon-wrapper">
                  <div className="feature-icon">
                    {feature.icon}
                  </div>
                  <span className="feature-emoji">{feature.emoji}</span>
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
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

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Lock, Home } from 'lucide-react';
import Navbar from '../../components/Navbar/Navbar.jsx';
import './Unauthorized.scss';

const Unauthorized = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Add some particle animation on mount
    const handleMouseMove = (e) => {
      const particles = document.querySelectorAll('.particle');
      particles.forEach((particle, index) => {
        const speed = (index + 1) * 0.01;
        const x = (window.innerWidth - e.pageX * speed) / 100;
        const y = (window.innerHeight - e.pageY * speed) / 100;
        particle.style.transform = `translateX(${x}px) translateY(${y}px)`;
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="unauthorized-page">
      <Navbar isAuthenticated={false} />

      {/* Animated Background */}
      <div className="animated-background">
        <div className="grid-overlay"></div>
        <div className="particle particle-1"></div>
        <div className="particle particle-2"></div>
        <div className="particle particle-3"></div>
        <div className="particle particle-4"></div>
        <div className="particle particle-5"></div>
        <div className="glow-orb orb-1"></div>
        <div className="glow-orb orb-2"></div>
        <div className="glow-orb orb-3"></div>
      </div>

      {/* Main Content */}
      <div className="unauthorized-content">
        <div className="error-container">
          {/* Animated Lock Icon */}
          <div className="lock-animation">
            <div className="shield-wrapper">
              <ShieldAlert className="shield-icon" />
              <div className="shield-glow"></div>
              <div className="lock-overlay">
                <Lock className="lock-icon" />
              </div>
            </div>
            <div className="scan-line"></div>
          </div>

          {/* Error Code */}
          <div className="error-code">
            <span className="code-number">401</span>
            <span className="code-label">Unauthorized Access</span>
          </div>

          {/* Error Message */}
          <div className="error-message">
            <h1>Access Denied</h1>
            <p>
              You need to be authenticated to access this area.
              Please log in to continue your journey.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="action-buttons">
            <button
              className="primary-button"
              onClick={() => navigate('/login')}
            >
              <Lock size={18} />
              <span>Login to Continue</span>
              <div className="button-glow"></div>
              <div className="ripple"></div>
            </button>

            <button
              className="secondary-button"
              onClick={() => navigate('/')}
            >
              <Home size={18} />
              <span>Back to Home</span>
              <div className="button-shine"></div>
            </button>
          </div>

          {/* Info Card */}
          <div className="info-card">
            <div className="info-icon">
              <ShieldAlert size={20} />
            </div>
            <div className="info-text">
              <h3>Security Notice</h3>
              <p>
                Your session may have expired or you're trying to access a protected area.
                Don't have an account? <span className="link" onClick={() => navigate('/signup')}>Sign up here</span>
              </p>
            </div>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="deco-lines">
          <div className="line line-1"></div>
          <div className="line line-2"></div>
          <div className="line line-3"></div>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;

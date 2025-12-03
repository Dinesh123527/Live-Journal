import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, LogOut, Settings as SettingsIcon } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import Cookies from 'js-cookie';
import UserProfile from '../UserProfile/UserProfile';
import ThemeToggle from '../ThemeToggle/ThemeToggle';
import MarvelThemeSelector from '../MarvelThemeSelector/MarvelThemeSelector';
import Settings from '../Settings/Settings';
import './Navbar.scss';

const Navbar = ({ showAuthButtons = true, isAuthenticated = false, userProfileInfo = null }) => {
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef(null);

  // Track theme changes
  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };

    // Initial check
    checkTheme();

    // Watch for theme changes
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  // Close settings when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setIsSettingsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    // Clear localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    // Clear all cookies
    Cookies.remove('accessToken');
    Cookies.remove('userId');
    Cookies.remove('username');

    sessionStorage.removeItem('privateUnlocked');
    sessionStorage.removeItem('privateUnlockedAt');

    // Navigate to login page
    navigate('/login', { replace: true });
  };

  const toggleSettings = () => {
    setIsSettingsOpen(!isSettingsOpen);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          <div className={`logo-wrapper ${isDark ? 'dark-mode' : 'light-mode'}`}>
            <BookOpen size={28} className="logo-icon" />
            <div className="logo-glow"></div>
          </div>
          <span className="brand-text">
            Live Journal
            <span className="text-glow">Live Journal</span>
            <span className="text-particles"></span>
          </span>
        </Link>

        <div className="navbar-actions">
          {showAuthButtons && !isAuthenticated && (
            <>
              <ThemeToggle />
              <MarvelThemeSelector />
            </>
          )}

          {isAuthenticated && (
            <>
              {/* User Profile first */}
              {userProfileInfo && (
                <UserProfile userInfo={userProfileInfo} onLogout={handleLogout} />
              )}

              {!userProfileInfo && (
                <button onClick={handleLogout} className="navbar-button navbar-logout">
                  <LogOut size={18} />
                  Logout
                </button>
              )}

              {/* Settings Icon - positioned after user profile */}
              <div className="settings-wrapper" ref={settingsRef}>
                <button
                  className="settings-icon-button"
                  onClick={toggleSettings}
                  aria-label="Settings"
                >
                  <SettingsIcon size={20} />
                </button>

                {/* Settings Dropdown Panel */}
                {isSettingsOpen && (
                  <Settings isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} isDropdown={true} />
                )}
              </div>

              {/* Marvel Theme Selector - positioned after settings icon */}
              <MarvelThemeSelector />
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

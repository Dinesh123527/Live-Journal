import Cookies from 'js-cookie';
import { BookOpen, LogOut, Settings as SettingsIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import LanguageSelector from '../LanguageSelector/LanguageSelector';
import MarvelThemeSelector from '../MarvelThemeSelector/MarvelThemeSelector';
import Settings from '../Settings/Settings';
import ThemeToggle from '../ThemeToggle/ThemeToggle';
import UserProfile from '../UserProfile/UserProfile';
import './Navbar.scss';

const Navbar = ({ showAuthButtons = true, isAuthenticated = false, userProfileInfo = null }) => {
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef(null);
  const navRef = useRef(null); // added

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

  // NEW: publish navbar height as CSS variable so pages can offset under fixed navbar
  useEffect(() => {
    const setOffset = () => {
      const height = navRef.current ? navRef.current.offsetHeight : 76;
      // add a small gap (12px) so content sits below navbar
      document.documentElement.style.setProperty('--terms-navbar-offset', `${height + 12}px`);
    };

    setOffset();
    window.addEventListener('resize', setOffset);
    return () => window.removeEventListener('resize', setOffset);
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
    // Save user info before clearing
    const userInfo = userProfileInfo ? {
      username: userProfileInfo.name,
      email: userProfileInfo.email
    } : null;

    // Clear localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    // Clear all cookies
    Cookies.remove('accessToken');
    Cookies.remove('userId');
    Cookies.remove('username');

    sessionStorage.removeItem('privateUnlocked');
    sessionStorage.removeItem('privateUnlockedAt');

    // Navigate to logout feedback page with user info
    navigate('/logout', { replace: true, state: { fromLogout: true, userInfo } });
  };

  const toggleSettings = () => {
    setIsSettingsOpen(!isSettingsOpen);
  };

  return (
    <nav className="navbar" ref={navRef}>
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
              <LanguageSelector />
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

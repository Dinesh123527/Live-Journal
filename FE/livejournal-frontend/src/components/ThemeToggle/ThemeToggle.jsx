import { useState, useEffect, useRef } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import './ThemeToggle.scss';

const ThemeToggle = ({ disabled = false }) => {
  const [showPanel, setShowPanel] = useState(false);
  const [theme, setTheme] = useState('light');
  const panelRef = useRef(null);

  // Load theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'system';
    setTheme(savedTheme);
    applyTheme(savedTheme);

    // Listen for system theme changes when in system mode
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = (e) => {
      const currentTheme = localStorage.getItem('theme') || 'system';
      if (currentTheme === 'system') {
        applyTheme('system');
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);

    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, []);

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setShowPanel(false);
      }
    };

    if (showPanel) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPanel]);

  const applyTheme = (selectedTheme) => {
    if (selectedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (selectedTheme === 'light') {
      document.documentElement.classList.remove('dark');
    } else if (selectedTheme === 'system') {
      // Use system preference
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  };

  const handleThemeChange = (selectedTheme) => {
    setTheme(selectedTheme);
    localStorage.setItem('theme', selectedTheme);
    applyTheme(selectedTheme);
    setShowPanel(false);
  };

  const getThemeIcon = () => {
    if (theme === 'dark') {
      return <Moon className="theme-icon" />;
    } else if (theme === 'light') {
      return <Sun className="theme-icon" />;
    } else {
      return <Monitor className="theme-icon" />;
    }
  };

  return (
    <div className="theme-toggle-wrapper" ref={panelRef}>
      <button
        className={`theme-toggle-button ${showPanel ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
        onClick={() => !disabled && setShowPanel(!showPanel)}
        disabled={disabled}
        aria-label="Toggle theme"
        title="Theme"
      >
        {getThemeIcon()}
        <div className="theme-glow"></div>
      </button>

      {showPanel && (
        <div className="theme-panel">
          <div className="theme-panel-header">
            <h4>Theme</h4>
          </div>

          <div className="theme-options">
            <button
              className={`theme-option ${theme === 'light' ? 'active' : ''}`}
              onClick={() => handleThemeChange('light')}
            >
              <Sun size={18} />
              <span>Light</span>
            </button>

            <button
              className={`theme-option ${theme === 'dark' ? 'active' : ''}`}
              onClick={() => handleThemeChange('dark')}
            >
              <Moon size={18} />
              <span>Dark</span>
            </button>

            <button
              className={`theme-option ${theme === 'system' ? 'active' : ''}`}
              onClick={() => handleThemeChange('system')}
            >
              <Monitor size={18} />
              <span>System</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThemeToggle;

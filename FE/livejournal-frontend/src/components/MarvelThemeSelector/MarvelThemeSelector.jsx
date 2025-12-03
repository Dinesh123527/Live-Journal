import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import './MarvelThemeSelector.scss';

const MarvelThemeSelector = ({ disabled = false }) => {
  const [showPanel, setShowPanel] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState(() => {
    return localStorage.getItem('marvelTheme') || 'default';
  });
  const panelRef = useRef(null);

  const marvelThemes = useMemo(() => [
    {
      id: 'default',
      name: 'Default',
      icon: '🌟',
      colors: {
        primary: '#667eea',
        secondary: '#764ba2',
        accent: '#667eea',
        glow: 'rgba(102, 126, 234, 0.3)'
      },
      cursor: 'default',
      description: 'Classic theme'
    },
    {
      id: 'ironman',
      name: 'Iron Man',
      icon: '🦾',
      colors: {
        primary: '#dc2626',
        secondary: '#fbbf24',
        accent: '#ef4444',
        glow: 'rgba(220, 38, 38, 0.5)'
      },
      cursor: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'32\' height=\'32\' viewBox=\'0 0 32 32\'%3E%3Ccircle cx=\'16\' cy=\'16\' r=\'12\' fill=\'%23dc2626\' stroke=\'%23fbbf24\' stroke-width=\'2\'/%3E%3Ccircle cx=\'16\' cy=\'16\' r=\'4\' fill=\'%23fbbf24\'/%3E%3C/svg%3E") 16 16, auto',
      description: 'Genius. Billionaire. Playboy. Philanthropist.'
    },
    {
      id: 'captain',
      name: 'Captain America',
      icon: '🛡️',
      colors: {
        primary: '#1e40af',
        secondary: '#dc2626',
        accent: '#3b82f6',
        glow: 'rgba(30, 64, 175, 0.5)'
      },
      cursor: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'32\' height=\'32\' viewBox=\'0 0 32 32\'%3E%3Ccircle cx=\'16\' cy=\'16\' r=\'12\' fill=\'%231e40af\' stroke=\'%23dc2626\' stroke-width=\'2\'/%3E%3Ccircle cx=\'16\' cy=\'16\' r=\'6\' fill=\'%23ffffff\'/%3E%3Ccircle cx=\'16\' cy=\'16\' r=\'3\' fill=\'%23dc2626\'/%3E%3C/svg%3E") 16 16, auto',
      description: 'I can do this all day'
    },
    {
      id: 'hulk',
      name: 'Hulk',
      icon: '💪',
      colors: {
        primary: '#16a34a',
        secondary: '#84cc16',
        accent: '#22c55e',
        glow: 'rgba(22, 163, 74, 0.5)'
      },
      cursor: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'32\' height=\'32\' viewBox=\'0 0 32 32\'%3E%3Cpath d=\'M16 4 L28 16 L16 28 L4 16 Z\' fill=\'%2316a34a\' stroke=\'%2384cc16\' stroke-width=\'2\'/%3E%3C/svg%3E") 16 16, auto',
      description: 'SMASH!'
    },
    {
      id: 'blackpanther',
      name: 'Black Panther',
      icon: '🐾',
      colors: {
        primary: '#7c3aed',
        secondary: '#1f2937',
        accent: '#a855f7',
        glow: 'rgba(124, 58, 237, 0.6)'
      },
      cursor: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'32\' height=\'32\' viewBox=\'0 0 32 32\'%3E%3Cpath d=\'M16 4 L20 12 L28 12 L22 18 L25 28 L16 22 L7 28 L10 18 L4 12 L12 12 Z\' fill=\'%237c3aed\' stroke=\'%23a855f7\' stroke-width=\'2\'/%3E%3C/svg%3E") 16 16, auto',
      description: 'Wakanda Forever'
    },
    {
      id: 'spiderman',
      name: 'Spider-Man',
      icon: '🕷️',
      colors: {
        primary: '#dc2626',
        secondary: '#1e40af',
        accent: '#ef4444',
        glow: 'rgba(220, 38, 38, 0.5)'
      },
      cursor: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'32\' height=\'32\' viewBox=\'0 0 32 32\'%3E%3Cpath d=\'M16 8 L20 16 L16 24 L12 16 Z\' fill=\'%23dc2626\' stroke=\'%231e40af\' stroke-width=\'2\'/%3E%3Cline x1=\'8\' y1=\'16\' x2=\'24\' y2=\'16\' stroke=\'%231e40af\' stroke-width=\'2\'/%3E%3C/svg%3E") 16 16, auto',
      description: 'Your friendly neighborhood Spider-Man'
    },
    {
      id: 'thor',
      name: 'Thor',
      icon: '⚡',
      colors: {
        primary: '#0284c7',
        secondary: '#64748b',
        accent: '#0ea5e9',
        glow: 'rgba(2, 132, 199, 0.5)'
      },
      cursor: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'32\' height=\'32\' viewBox=\'0 0 32 32\'%3E%3Cpath d=\'M16 4 L18 14 L28 14 L20 20 L24 28 L16 22 L8 28 L12 20 L4 14 L14 14 Z\' fill=\'%230284c7\' stroke=\'%23fbbf24\' stroke-width=\'2\'/%3E%3C/svg%3E") 16 16, auto',
      description: 'Bring me Thanos!'
    },
    {
      id: 'deadpool',
      name: 'Deadpool',
      icon: '💀',
      colors: {
        primary: '#dc2626',
        secondary: '#1f2937',
        accent: '#ef4444',
        glow: 'rgba(220, 38, 38, 0.6)'
      },
      cursor: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'32\' height=\'32\' viewBox=\'0 0 32 32\'%3E%3Cellipse cx=\'16\' cy=\'16\' rx=\'12\' ry=\'14\' fill=\'%23dc2626\' stroke=\'%231f2937\' stroke-width=\'2\'/%3E%3Cellipse cx=\'12\' cy=\'14\' rx=\'3\' ry=\'4\' fill=\'%23000000\'/%3E%3Cellipse cx=\'20\' cy=\'14\' rx=\'3\' ry=\'4\' fill=\'%23000000\'/%3E%3C/svg%3E") 16 16, auto',
      description: 'Maximum effort!'
    },
    {
      id: 'doctorstrange',
      name: 'Doctor Strange',
      icon: '🔮',
      colors: {
        primary: '#ea580c',
        secondary: '#0891b2',
        accent: '#f97316',
        glow: 'rgba(234, 88, 12, 0.5)'
      },
      cursor: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'32\' height=\'32\' viewBox=\'0 0 32 32\'%3E%3Ccircle cx=\'16\' cy=\'16\' r=\'10\' fill=\'none\' stroke=\'%23ea580c\' stroke-width=\'2\'/%3E%3Ccircle cx=\'16\' cy=\'16\' r=\'6\' fill=\'none\' stroke=\'%230891b2\' stroke-width=\'2\'/%3E%3Ccircle cx=\'16\' cy=\'16\' r=\'2\' fill=\'%23ea580c\'/%3E%3C/svg%3E") 16 16, auto',
      description: 'Master of the Mystic Arts'
    }
  ], []);

  const applyTheme = useCallback((themeId) => {
    const theme = marvelThemes.find(t => t.id === themeId);
    if (!theme) return;

    const root = document.documentElement;
    const isDark = document.documentElement.classList.contains('dark');

    // Apply CSS variables for Marvel theme colors
    root.style.setProperty('--marvel-primary', theme.colors.primary);
    root.style.setProperty('--marvel-secondary', theme.colors.secondary);
    root.style.setProperty('--marvel-accent', theme.colors.accent);
    root.style.setProperty('--marvel-glow', theme.colors.glow);

    // Apply page background colors based on theme and light/dark mode
    if (theme.id === 'default') {
      // Reset to default theme colors
      root.style.setProperty('--page-bg-primary', isDark ? '#0f172a' : '#ffffff');
      root.style.setProperty('--page-bg-secondary', isDark ? '#1e293b' : '#f8fafc');
      root.style.setProperty('--page-bg-gradient', isDark
        ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
        : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)');
    } else {
      // Apply Marvel theme colors with light/dark variations
      const lightBg = `${theme.colors.primary}08`; // Very light tint (3% opacity)
      const darkBg = `${theme.colors.primary}15`; // Darker tint for dark mode (8% opacity)

      root.style.setProperty('--page-bg-primary', isDark
        ? `color-mix(in srgb, ${theme.colors.primary} 8%, #0f172a)`
        : `color-mix(in srgb, ${theme.colors.primary} 3%, #ffffff)`);

      root.style.setProperty('--page-bg-secondary', isDark
        ? `color-mix(in srgb, ${theme.colors.secondary} 8%, #1e293b)`
        : `color-mix(in srgb, ${theme.colors.secondary} 3%, #f8fafc)`);

      root.style.setProperty('--page-bg-gradient', isDark
        ? `linear-gradient(135deg, color-mix(in srgb, ${theme.colors.primary} 12%, #0f172a) 0%, color-mix(in srgb, ${theme.colors.secondary} 8%, #1e293b) 100%)`
        : `linear-gradient(135deg, color-mix(in srgb, ${theme.colors.primary} 5%, #ffffff) 0%, color-mix(in srgb, ${theme.colors.secondary} 3%, #f8fafc) 100%)`);
    }

    // Apply cursor
    document.body.style.cursor = theme.cursor;

    // Add theme class to body
    document.body.className = document.body.className.replace(/marvel-theme-\S+/g, '');
    document.body.classList.add(`marvel-theme-${themeId}`);

    // Store theme data for other components
    root.setAttribute('data-marvel-theme', themeId);
  }, [marvelThemes]);

  // Apply theme on mount
  useEffect(() => {
    applyTheme(selectedTheme);
  }, [applyTheme, selectedTheme]);

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

  const handleThemeChange = (themeId) => {
    setSelectedTheme(themeId);
    localStorage.setItem('marvelTheme', themeId);
    applyTheme(themeId);

    // Add epic transition effect
    const body = document.body;
    body.classList.add('marvel-transition');
    setTimeout(() => body.classList.remove('marvel-transition'), 800);

    // Close panel after selection with delay
    setTimeout(() => setShowPanel(false), 400);
  };

  const currentTheme = marvelThemes.find(t => t.id === selectedTheme) || marvelThemes[0];

  return (
    <div className="marvel-theme-selector" ref={panelRef}>
      <button
        className={`marvel-theme-button ${showPanel ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
        onClick={() => !disabled && setShowPanel(!showPanel)}
        disabled={disabled}
        aria-label="Marvel Themes"
        title="Marvel Themes"
      >
        <Sparkles className="marvel-icon" size={20} />
        <span className="theme-emoji">{currentTheme.icon}</span>
        <div className="marvel-glow"></div>
      </button>

      {showPanel && (
        <div className="marvel-panel">
          <div className="marvel-panel-header">
            <div className="header-content">
              <Sparkles size={18} className="header-icon" />
              <h4>Marvel Themes</h4>
            </div>
            <p className="header-subtitle">Choose your hero!</p>
          </div>

          <div className="marvel-panel-body">
            <div className="marvel-themes-grid">
              {marvelThemes.map((theme) => (
                <button
                  key={theme.id}
                  className={`marvel-theme-card ${selectedTheme === theme.id ? 'active' : ''}`}
                  onClick={() => handleThemeChange(theme.id)}
                  style={{
                    '--theme-primary': theme.colors.primary,
                    '--theme-secondary': theme.colors.secondary,
                    '--theme-glow': theme.colors.glow
                  }}
                  title={theme.description}
                >
                  <div className="theme-icon-wrapper">
                    <span className="theme-icon">{theme.icon}</span>
                    <div className="icon-glow"></div>
                  </div>
                  <span className="theme-name">{theme.name}</span>
                  {selectedTheme === theme.id && (
                    <div className="active-indicator">
                      <div className="pulse-ring"></div>
                      <Sparkles size={12} />
                    </div>
                  )}
                  <div className="hover-effect"></div>
                </button>
              ))}
            </div>
          </div>

          <div className="marvel-panel-footer">
            <p className="footer-text">
              <span className="hero-emoji">🦸</span>
              Unleash your inner hero!
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarvelThemeSelector;

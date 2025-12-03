import { useState, useEffect } from 'react';
import { X, Sun, Moon, Monitor, Mic, Eye } from 'lucide-react';
import './Settings.scss';

const Settings = ({ isOpen, onClose, isDropdown = false }) => {
  const [theme, setTheme] = useState('system');
  const [aiMode, setAiMode] = useState('standard');
  const [voiceJournaling, setVoiceJournaling] = useState(false);
  const [focusMode, setFocusMode] = useState(false);

  // Load settings from localStorage
  useEffect(() => {
    if (!isOpen) return;

    const loadSettings = () => {
      const savedTheme = localStorage.getItem('theme') || 'system';
      const savedAiMode = localStorage.getItem('aiMode') || 'standard';
      const savedVoiceJournaling = localStorage.getItem('voiceJournaling') === 'true';
      const savedFocusMode = localStorage.getItem('focusMode') === 'true';

      setTheme(savedTheme);
      setAiMode(savedAiMode);
      setVoiceJournaling(savedVoiceJournaling);
      setFocusMode(savedFocusMode);
    };

    loadSettings();
  }, [isOpen]);

  // Handle theme change
  const handleThemeChange = (selectedTheme) => {
    setTheme(selectedTheme);
    localStorage.setItem('theme', selectedTheme);
    applyTheme(selectedTheme);
  };

  const applyTheme = (selectedTheme) => {
    if (selectedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (selectedTheme === 'light') {
      document.documentElement.classList.remove('dark');
    } else if (selectedTheme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  };

  // Handle AI mode change
  const handleAiModeChange = (mode) => {
    setAiMode(mode);
    localStorage.setItem('aiMode', mode);
  };

  // Handle voice journaling toggle
  const handleVoiceJournalingToggle = () => {
    const newValue = !voiceJournaling;
    setVoiceJournaling(newValue);
    localStorage.setItem('voiceJournaling', newValue.toString());
  };

  // Handle focus mode toggle
  const handleFocusModeToggle = () => {
    const newValue = !focusMode;
    setFocusMode(newValue);
    localStorage.setItem('focusMode', newValue.toString());
  };

  if (!isOpen) return null;

  // Dropdown panel rendering (minimalistic)
  if (isDropdown) {
    return (
      <div className="settings-dropdown">
        <div className="settings-dropdown-header">
          <h3>⚙️ Settings</h3>
        </div>

        <div className="settings-dropdown-body">
          {/* Theme Section */}
          <div className="settings-dropdown-section">
            <label className="section-label">Theme</label>
            <div className="theme-options-compact">
              <button
                className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
                onClick={() => handleThemeChange('light')}
                title="Light"
              >
                <Sun size={16} />
              </button>
              <button
                className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => handleThemeChange('dark')}
                title="Dark"
              >
                <Moon size={16} />
              </button>
              <button
                className={`theme-btn ${theme === 'system' ? 'active' : ''}`}
                onClick={() => handleThemeChange('system')}
                title="System"
              >
                <Monitor size={16} />
              </button>
            </div>
          </div>

          <div className="dropdown-divider"></div>

          {/* AI Mode Section */}
          <div className="settings-dropdown-section">
            <label className="section-label">AI Mode</label>
            <select
              className="compact-select"
              value={aiMode}
              onChange={(e) => handleAiModeChange(e.target.value)}
            >
              <option value="off">Off</option>
              <option value="standard">Standard</option>
              <option value="creative">Creative ✨</option>
            </select>
          </div>

          <div className="dropdown-divider"></div>

          {/* Voice Journaling Toggle */}
          <div className="settings-dropdown-section">
            <div className="toggle-row">
              <span className="toggle-row-label">
                <Mic size={16} />
                Voice Journaling
              </span>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={voiceJournaling}
                  onChange={handleVoiceJournalingToggle}
                />
                <span className="toggle-switch-slider"></span>
              </label>
            </div>
          </div>

          <div className="dropdown-divider"></div>

          {/* Focus Mode Toggle */}
          <div className="settings-dropdown-section">
            <div className="toggle-row">
              <span className="toggle-row-label">
                <Eye size={16} />
                Focus Mode
              </span>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={focusMode}
                  onChange={handleFocusModeToggle}
                />
                <span className="toggle-switch-slider"></span>
              </label>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Original modal rendering (kept for other use cases)
  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>⚙️ Settings</h2>
          <button className="close-button" onClick={onClose} aria-label="Close settings">
            <X size={24} />
          </button>
        </div>

        <div className="settings-body">
          {/* Theme Section */}
          <div className="settings-section">
            <div className="section-header">
              <h3>🔹 Theme</h3>
              <p className="section-description">Choose your preferred appearance</p>
            </div>

            <div className="theme-options">
              <button
                className={`theme-option ${theme === 'light' ? 'active' : ''}`}
                onClick={() => handleThemeChange('light')}
              >
                <Sun size={20} />
                <span>Light</span>
              </button>

              <button
                className={`theme-option ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => handleThemeChange('dark')}
              >
                <Moon size={20} />
                <span>Dark</span>
              </button>

              <button
                className={`theme-option ${theme === 'system' ? 'active' : ''}`}
                onClick={() => handleThemeChange('system')}
              >
                <Monitor size={20} />
                <span>System</span>
              </button>
            </div>
          </div>

          <div className="settings-divider"></div>

          {/* AI Mode Section */}
          <div className="settings-section">
            <div className="section-header">
              <h3>🔹 AI Mode</h3>
              <p className="section-description">How smart/active the AI should be</p>
            </div>

            <div className="ai-mode-options">
              <button
                className={`ai-mode-option ${aiMode === 'off' ? 'active' : ''}`}
                onClick={() => handleAiModeChange('off')}
              >
                <div className="ai-mode-content">
                  <span className="ai-mode-title">Off</span>
                  <span className="ai-mode-desc">No mood insights or suggestions</span>
                </div>
              </button>

              <button
                className={`ai-mode-option ${aiMode === 'standard' ? 'active' : ''}`}
                onClick={() => handleAiModeChange('standard')}
              >
                <div className="ai-mode-content">
                  <span className="ai-mode-title">Standard</span>
                  <span className="ai-mode-desc">Short supportive suggestions (default)</span>
                </div>
              </button>

              <button
                className={`ai-mode-option ${aiMode === 'creative' ? 'active' : ''}`}
                onClick={() => handleAiModeChange('creative')}
              >
                <div className="ai-mode-content">
                  <span className="ai-mode-title">Creative ✨</span>
                  <span className="ai-mode-desc">More expressive suggestions</span>
                </div>
              </button>
            </div>
          </div>

          <div className="settings-divider"></div>

          {/* Voice Journaling Section */}
          <div className="settings-section">
            <div className="section-header">
              <h3>🔹 Voice Journaling (Vapi Feature)</h3>
              <p className="section-description">Controls whether 🎙 mic button appears in editor</p>
            </div>

            <div className="toggle-wrapper">
              <label className="toggle-container">
                <input
                  type="checkbox"
                  checked={voiceJournaling}
                  onChange={handleVoiceJournalingToggle}
                />
                <span className="toggle-slider"></span>
              </label>
              <span className="toggle-label">
                <Mic size={18} />
                {voiceJournaling ? 'On' : 'Off'}
              </span>
            </div>
          </div>

          <div className="settings-divider"></div>

          {/* Focus Mode Section */}
          <div className="settings-section">
            <div className="section-header">
              <h3>🔹 Focus Mode</h3>
              <p className="section-description">Hide distractions in editor (side panels, mood section, tags UI)</p>
            </div>

            <div className="toggle-wrapper">
              <label className="toggle-container">
                <input
                  type="checkbox"
                  checked={focusMode}
                  onChange={handleFocusModeToggle}
                />
                <span className="toggle-slider"></span>
              </label>
              <span className="toggle-label">
                <Eye size={18} />
                {focusMode ? 'On - Minimal view 💆‍♂️' : 'Off - Full features'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;

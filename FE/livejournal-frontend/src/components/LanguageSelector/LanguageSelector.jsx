import { Globe } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import './LanguageSelector.scss';

const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸', nativeName: 'English' },
    { code: 'es', name: 'Spanish', flag: '🇪🇸', nativeName: 'Español' },
    { code: 'fr', name: 'French', flag: '🇫🇷', nativeName: 'Français' },
    { code: 'de', name: 'German', flag: '🇩🇪', nativeName: 'Deutsch' },
    { code: 'hi', name: 'Hindi', flag: '🇮🇳', nativeName: 'हिंदी' },
    { code: 'te', name: 'Telugu', flag: '🇮🇳', nativeName: 'తెలుగు' },
    { code: 'zh', name: 'Chinese', flag: '🇨🇳', nativeName: '中文' },
    { code: 'ja', name: 'Japanese', flag: '🇯🇵', nativeName: '日本語' },
    { code: 'ar', name: 'Arabic', flag: '🇸🇦', nativeName: 'العربية' }
];

const LanguageSelector = () => {
    const { i18n, t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLanguageChange = (langCode) => {
        i18n.changeLanguage(langCode);
        localStorage.setItem('language', langCode);
        setIsOpen(false);

        // Handle RTL for Arabic
        if (langCode === 'ar') {
            document.documentElement.setAttribute('dir', 'rtl');
        } else {
            document.documentElement.setAttribute('dir', 'ltr');
        }
    };

    return (
        <div className="language-selector" ref={dropdownRef}>
            <button
                className={`language-btn ${isOpen ? 'active' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                aria-label={t('language.select')}
                title={t('language.select')}
            >
                <Globe size={18} className="globe-icon" />
                <span className="current-lang">{currentLanguage.flag}</span>
            </button>

            {isOpen && (
                <div className="language-dropdown">
                    <div className="dropdown-header">
                        <Globe size={16} />
                        <span>{t('language.select')}</span>
                    </div>

                    <div className="language-list">
                        {languages.map((lang) => (
                            <button
                                key={lang.code}
                                className={`language-option ${currentLanguage.code === lang.code ? 'active' : ''}`}
                                onClick={() => handleLanguageChange(lang.code)}
                            >
                                <span className="lang-flag">{lang.flag}</span>
                                <div className="lang-info">
                                    <span className="lang-native">{lang.nativeName}</span>
                                    <span className="lang-english">{lang.name}</span>
                                </div>
                                {currentLanguage.code === lang.code && (
                                    <span className="check-mark">✓</span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default LanguageSelector;

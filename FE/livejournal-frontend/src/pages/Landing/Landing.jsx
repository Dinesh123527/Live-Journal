import { motion } from 'framer-motion';
import { BookOpen, Lock, Moon, Search, Sparkles, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar/Navbar.jsx';
import './Landing.scss';

const Landing = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      setScrollProgress(progress);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    {
      icon: <Sparkles />,
      title: t('landing.features.aiPowered.title'),
      description: t('landing.features.aiPowered.description')
    },
    {
      icon: <Lock />,
      title: t('landing.features.secure.title'),
      description: t('landing.features.secure.description')
    },
    {
      icon: <TrendingUp />,
      title: t('landing.features.mood.title'),
      description: t('landing.features.mood.description')
    },
    {
      icon: <Moon />,
      title: t('landing.features.design.title'),
      description: t('landing.features.design.description')
    },
    {
      icon: <Search />,
      title: t('landing.features.search.title'),
      description: t('landing.features.search.description')
    },
    {
      icon: <BookOpen />,
      title: t('landing.features.drafts.title'),
      description: t('landing.features.drafts.description')
    }
  ];

  return (
    <div className="landing-page">
      <Navbar isAuthenticated={false} />

      <motion.div
        className="landing-progress-container"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <motion.div
          className="landing-progress-bar"
          style={{ width: `${scrollProgress}%` }}
        />
      </motion.div>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1>
              {t('landing.hero.title1')}
              <br />
              {t('landing.hero.title2')}
            </h1>
            <p>{t('landing.hero.description')}</p>
            <button className="cta-button" onClick={() => navigate('/login')}>
              {t('landing.hero.cta')}
            </button>
          </motion.div>

          {/* Hero Image/Animation */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="hero-preview"
          >
            <div className="preview-card">
              <div className="window-controls">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <div className="preview-content">
                <div className="line"></div>
                <div className="line"></div>
                <div className="line"></div>
                <div className="ai-suggestion">
                  <Sparkles />
                  <span>AI suggests: You seem happy today! 😊</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="features-section">
        <div className="features-header">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <h2>{t('landing.features.heading')}</h2>
            <p>{t('landing.features.subheading')}</p>
          </motion.div>
        </div>

        <div className="features-grid">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="feature-card"
            >
              <div className="feature-icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="cta-card"
        >
          <h2>{t('landing.cta.heading')}</h2>
          <p>{t('landing.cta.description')}</p>
          <button onClick={() => navigate('/signup')}>
            {t('landing.cta.button')}
          </button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer>
        <p>{t('landing.footer.copyright')}</p>
        <div className="footer-links">
          <Link to="/privacy">{t('landing.footer.privacy')}</Link>
          <Link to="/terms">{t('landing.footer.terms')}</Link>
          <Link to="/contact">{t('landing.footer.contact')}</Link>
        </div>
      </footer>
    </div>
  );
};

export default Landing;


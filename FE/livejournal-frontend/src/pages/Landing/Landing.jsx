import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Sparkles, Lock, TrendingUp, Moon, Search } from 'lucide-react';
import Navbar from '../../components/Navbar/Navbar.jsx';
import './Landing.scss';

const Landing = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Sparkles />,
      title: 'AI-Powered',
      description: 'Smart insights and mood analysis for your journal entries'
    },
    {
      icon: <Lock />,
      title: 'Secure & Private',
      description: 'End-to-end encryption keeps your thoughts safe'
    },
    {
      icon: <TrendingUp />,
      title: 'Track Your Mood',
      description: 'Visualize emotional patterns over time'
    },
    {
      icon: <Moon />,
      title: 'Beautiful Design',
      description: 'Apple-inspired interface with dark mode'
    },
    {
      icon: <Search />,
      title: 'Powerful Search',
      description: 'Find any entry instantly with smart search'
    },
    {
      icon: <BookOpen />,
      title: 'Auto-Save Drafts',
      description: 'Never lose your thoughts with automatic drafts'
    }
  ];

  return (
    <div className="landing-page">
      <Navbar isAuthenticated={false} />

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1>
              Your Thoughts,
              <br />
              Beautifully Captured
            </h1>
            <p>
              A modern journaling experience powered by AI. Track your mood, organize your thoughts, and discover insights about yourself.
            </p>
            <button className="cta-button" onClick={() => navigate('/login')}>
              Start Journaling
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
            <h2>Everything You Need</h2>
            <p>Powerful features to help you journal better</p>
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
          <h2>Ready to Start Your Journey?</h2>
          <p>Join thousands of people who journal with us every day</p>
          <button onClick={() => navigate('/signup')}>
            Create Account
          </button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer>
        <p>© 2025 Live Journal. Your thoughts, your privacy.</p>
        <div className="footer-links">
          <a href="#">Privacy Policy</a>
          <a href="#">Terms of Service</a>
          <a href="#">Contact</a>
        </div>
      </footer>
    </div>
  );
};

export default Landing;

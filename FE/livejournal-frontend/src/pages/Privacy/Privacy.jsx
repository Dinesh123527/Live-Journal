import { ArrowLeft, Bell, Calendar, ChevronDown, ChevronUp, Database, Eye, Globe, Lock, Mail, Shield, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar/Navbar';
import ScrollProgressBar from '../../components/ScrollProgressBar/ScrollProgressBar.jsx';
import './Privacy.scss';

const Privacy = () => {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});
  const [activeSection, setActiveSection] = useState(null);

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 50);
  }, []);

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const lastUpdated = "December 7, 2025";

  const privacySections = [
    {
      id: 'information-collection',
      icon: <Database size={24} />,
      title: 'Information We Collect',
      emoji: '📊',
      content: [
        {
          subtitle: 'Personal Information',
          text: 'When you create an account, we collect your name, email address, and password (encrypted). This information is essential for providing you with a personalized journaling experience.'
        },
        {
          subtitle: 'Journal Entries',
          text: 'Your journal entries, including text content, mood data, and any attached media, are stored securely on our servers. This data belongs to you and is used solely to provide our services.'
        },
        {
          subtitle: 'Usage Data',
          text: 'We collect anonymized usage statistics such as feature usage patterns, session duration, and interaction data to improve our services. This data cannot be used to identify individual users.'
        },
        {
          subtitle: 'Device Information',
          text: 'Basic device information like browser type, operating system, and screen resolution helps us optimize the app experience across different platforms.'
        }
      ]
    },
    {
      id: 'data-usage',
      icon: <Eye size={24} />,
      title: 'How We Use Your Data',
      emoji: '🔍',
      content: [
        {
          subtitle: 'Service Delivery',
          text: 'Your data is primarily used to provide, maintain, and improve the Live Journal service. This includes storing your entries, generating AI insights, and syncing across devices.'
        },
        {
          subtitle: 'AI-Powered Features',
          text: 'Our AI analyzes your entries locally and securely to provide mood tracking, writing suggestions, and personalized insights. Your entries are never shared with third parties for AI training.'
        },
        {
          subtitle: 'Communication',
          text: 'We may use your email to send important service updates, security alerts, and optional newsletters (which you can unsubscribe from at any time).'
        },
        {
          subtitle: 'Analytics & Improvement',
          text: 'Anonymized, aggregated data helps us understand how users interact with Live Journal, enabling us to make data-driven improvements to the platform.'
        }
      ]
    },
    {
      id: 'data-security',
      icon: <Lock size={24} />,
      title: 'Data Security',
      emoji: '🔐',
      content: [
        {
          subtitle: 'Encryption',
          text: 'All data is encrypted in transit using TLS 1.3 and at rest using AES-256 encryption. Your journal entries are protected with industry-leading security standards.'
        },
        {
          subtitle: 'Access Controls',
          text: 'We implement strict access controls and authentication mechanisms. Only you can access your journal entries through your authenticated account.'
        },
        {
          subtitle: 'Regular Audits',
          text: 'Our security practices are regularly reviewed and updated. We conduct periodic security audits to identify and address potential vulnerabilities.'
        },
        {
          subtitle: 'Incident Response',
          text: 'In the unlikely event of a security breach, we have protocols in place to quickly identify, contain, and notify affected users within 72 hours as required by law.'
        }
      ]
    },
    {
      id: 'data-sharing',
      icon: <Users size={24} />,
      title: 'Data Sharing & Third Parties',
      emoji: '🤝',
      content: [
        {
          subtitle: 'No Selling of Data',
          text: 'We do not sell, rent, or trade your personal information or journal entries to third parties. Your privacy is not for sale.'
        },
        {
          subtitle: 'Service Providers',
          text: 'We work with trusted service providers (hosting, email delivery) who are contractually bound to protect your data and use it only for providing services to us.'
        },
        {
          subtitle: 'Legal Requirements',
          text: 'We may disclose information if required by law, court order, or government request. We will notify you unless legally prohibited from doing so.'
        },
        {
          subtitle: 'Business Transfers',
          text: 'In the event of a merger or acquisition, your data would be transferred as part of the business assets, with the same privacy protections maintained.'
        }
      ]
    },
    {
      id: 'your-rights',
      icon: <Shield size={24} />,
      title: 'Your Rights & Choices',
      emoji: '⚖️',
      content: [
        {
          subtitle: 'Access & Portability',
          text: 'You can access all your data at any time through your account settings. You can also export your journal entries in standard formats (JSON, PDF).'
        },
        {
          subtitle: 'Correction & Deletion',
          text: 'You have the right to correct inaccurate data and request complete deletion of your account and all associated data at any time.'
        },
        {
          subtitle: 'Opt-Out Options',
          text: 'You can opt out of non-essential communications, disable AI features, and control data collection preferences through your account settings.'
        },
        {
          subtitle: 'Data Retention',
          text: 'We retain your data as long as your account is active. Upon deletion request, we remove your data within 30 days, except where legally required to retain it.'
        }
      ]
    },
    {
      id: 'cookies',
      icon: <Globe size={24} />,
      title: 'Cookies & Tracking',
      emoji: '🍪',
      content: [
        {
          subtitle: 'Essential Cookies',
          text: 'We use essential cookies for authentication, security, and basic functionality. These cannot be disabled as they are necessary for the app to work.'
        },
        {
          subtitle: 'Analytics Cookies',
          text: 'Optional analytics cookies help us understand usage patterns. You can disable these in your browser or account settings without affecting functionality.'
        },
        {
          subtitle: 'No Third-Party Tracking',
          text: 'We do not use third-party advertising cookies or tracking pixels. Your browsing activity within Live Journal is not shared with advertisers.'
        },
        {
          subtitle: 'Local Storage',
          text: 'We use browser local storage to cache your preferences and draft entries for a better offline experience. This data stays on your device.'
        }
      ]
    },
    {
      id: 'children',
      icon: <Users size={24} />,
      title: "Children's Privacy",
      emoji: '👶',
      content: [
        {
          subtitle: 'Age Requirement',
          text: 'Live Journal is intended for users 13 years of age and older. We do not knowingly collect information from children under 13.'
        },
        {
          subtitle: 'Parental Rights',
          text: 'If you believe your child has provided us with personal information, please contact us immediately. We will promptly delete such information.'
        },
        {
          subtitle: 'Teen Safety',
          text: 'For users between 13-18, we encourage parental guidance and have additional safeguards in place to protect younger users.'
        }
      ]
    },
    {
      id: 'international',
      icon: <Globe size={24} />,
      title: 'International Data Transfers',
      emoji: '🌍',
      content: [
        {
          subtitle: 'Data Location',
          text: 'Your data may be processed and stored in data centers located in various countries. We ensure all locations meet our strict security standards.'
        },
        {
          subtitle: 'GDPR Compliance',
          text: 'For users in the European Economic Area, we comply with GDPR requirements including data minimization, purpose limitation, and your rights as a data subject.'
        },
        {
          subtitle: 'Cross-Border Transfers',
          text: 'When transferring data internationally, we use standard contractual clauses and other approved mechanisms to ensure adequate protection.'
        }
      ]
    },
    {
      id: 'updates',
      icon: <Bell size={24} />,
      title: 'Policy Updates',
      emoji: '📝',
      content: [
        {
          subtitle: 'Notification of Changes',
          text: 'We will notify you of significant changes to this privacy policy via email and/or a prominent notice in the app at least 30 days before changes take effect.'
        },
        {
          subtitle: 'Review Regularly',
          text: 'We encourage you to periodically review this policy to stay informed about how we protect your information.'
        },
        {
          subtitle: 'Effective Date',
          text: 'The "Last Updated" date at the top indicates when this policy was most recently revised. Continued use after changes constitutes acceptance.'
        }
      ]
    },
    {
      id: 'contact',
      icon: <Mail size={24} />,
      title: 'Contact Us',
      emoji: '📧',
      content: [
        {
          subtitle: 'Privacy Questions',
          text: 'For any privacy-related questions, concerns, or requests, please contact our Privacy Team at privacy@livejournal.com'
        },
        {
          subtitle: 'Data Requests',
          text: 'To exercise your data rights (access, deletion, portability), please use the dedicated form in your account settings or email us directly.'
        },
        {
          subtitle: 'Response Time',
          text: 'We aim to respond to all privacy inquiries within 48 hours and complete data requests within 30 days as required by applicable laws.'
        }
      ]
    }
  ];

  const quickLinks = [
    { id: 'information-collection', label: 'Information Collection', icon: '📊' },
    { id: 'data-usage', label: 'Data Usage', icon: '🔍' },
    { id: 'data-security', label: 'Security', icon: '🔐' },
    { id: 'your-rights', label: 'Your Rights', icon: '⚖️' },
    { id: 'cookies', label: 'Cookies', icon: '🍪' },
  ];

  return (
    <div className="privacy-page">
      <Navbar />
      <ScrollProgressBar />

      <div className={`privacy-content ${isVisible ? 'visible' : ''}`}>
        {/* Hero Section */}
        <section className="privacy-hero">
          <div className="hero-decoration">
            <div className="floating-icon icon-1">🔒</div>
            <div className="floating-icon icon-2">🛡️</div>
            <div className="floating-icon icon-3">✨</div>
            <div className="floating-icon icon-4">📜</div>
          </div>

          <button className="back-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>

          <div className="hero-content">
            <div className="hero-badge">
              <Shield size={20} />
              <span>Your Privacy Matters</span>
            </div>
            <h1>Privacy Policy</h1>
            <p className="hero-subtitle">
              We believe your personal thoughts deserve the highest level of protection.
              Learn how we safeguard your data and respect your privacy.
            </p>
            <div className="last-updated">
              <Calendar size={16} />
              <span>Last Updated: {lastUpdated}</span>
            </div>
          </div>
        </section>

        {/* Quick Navigation */}
        <section className="quick-nav">
          <h3>Quick Navigation</h3>
          <div className="nav-pills">
            {quickLinks.map((link) => (
              <button
                key={link.id}
                className={`nav-pill ${activeSection === link.id ? 'active' : ''}`}
                onClick={() => scrollToSection(link.id)}
              >
                <span className="pill-icon">{link.icon}</span>
                <span className="pill-label">{link.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Privacy Summary Card */}
        <section className="privacy-summary">
          <div className="summary-card">
            <div className="summary-header">
              <span className="summary-icon">💡</span>
              <h3>Privacy at a Glance</h3>
            </div>
            <div className="summary-grid">
              <div className="summary-item">
                <div className="item-icon green">✓</div>
                <div className="item-content">
                  <strong>Your Data, Your Control</strong>
                  <p>Export or delete anytime</p>
                </div>
              </div>
              <div className="summary-item">
                <div className="item-icon green">✓</div>
                <div className="item-content">
                  <strong>End-to-End Encryption</strong>
                  <p>Industry-standard security</p>
                </div>
              </div>
              <div className="summary-item">
                <div className="item-icon green">✓</div>
                <div className="item-content">
                  <strong>No Data Selling</strong>
                  <p>We never sell your info</p>
                </div>
              </div>
              <div className="summary-item">
                <div className="item-icon green">✓</div>
                <div className="item-content">
                  <strong>GDPR Compliant</strong>
                  <p>Full regulatory compliance</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Main Privacy Sections */}
        <section className="privacy-sections">
          {privacySections.map((section, index) => (
            <div
              key={section.id}
              id={section.id}
              className={`privacy-section ${expandedSections[section.id] ? 'expanded' : ''} ${activeSection === section.id ? 'active' : ''}`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div
                className="section-header"
                onClick={() => toggleSection(section.id)}
              >
                <div className="header-left">
                  <span className="section-emoji">{section.emoji}</span>
                  <div className="section-icon">{section.icon}</div>
                  <h2>{section.title}</h2>
                </div>
                <button className="expand-btn">
                  {expandedSections[section.id] ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                </button>
              </div>

              <div className={`section-content ${expandedSections[section.id] ? 'show' : ''}`}>
                {section.content.map((item, idx) => (
                  <div key={idx} className="content-block">
                    <h4>{item.subtitle}</h4>
                    <p>{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* Trust Badges */}
        <section className="trust-section">
          <h3>We're Committed to Your Privacy</h3>
          <div className="trust-badges">
            <div className="trust-badge">
              <div className="badge-icon">🔐</div>
              <span>256-bit Encryption</span>
            </div>
            <div className="trust-badge">
              <div className="badge-icon">🇪🇺</div>
              <span>GDPR Compliant</span>
            </div>
            <div className="trust-badge">
              <div className="badge-icon">🛡️</div>
              <span>SOC 2 Type II</span>
            </div>
            <div className="trust-badge">
              <div className="badge-icon">✅</div>
              <span>Regular Audits</span>
            </div>
          </div>
        </section>

        {/* Contact CTA */}
        <section className="contact-cta">
          <div className="cta-card">
            <div className="cta-content">
              <span className="cta-emoji">💬</span>
              <h3>Have Questions About Your Privacy?</h3>
              <p>Our team is here to help. Reach out anytime with your privacy concerns or data requests.</p>
              <button className="cta-button" onClick={() => navigate('/contact')}>
                <Mail size={18} />
                Contact Privacy Team
              </button>
            </div>
          </div>
        </section>

        {/* Footer Note */}
        <footer className="privacy-footer">
          <p>
            By using Live Journal, you agree to this Privacy Policy.
            If you have any questions, please <span onClick={() => navigate('/contact')}>contact us</span>.
          </p>
          <p className="copyright">© 2025 Live Journal. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
};

export default Privacy;


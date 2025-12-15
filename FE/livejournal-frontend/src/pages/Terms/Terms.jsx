import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2, FileText, Globe, Shield, Slash, UserCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar/Navbar.jsx';
import './Terms.scss';

const Terms = () => {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [active, setActive] = useState(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [accepted, setAccepted] = useState(false);
  const [hidden, setHidden] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  // respect user's reduced motion preference
  const reduceMotion =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (reduceMotion) return;

    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight =
        document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      setScrollProgress(progress);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [reduceMotion]);

  useEffect(() => {
    if (!containerRef.current || reduceMotion) return;
    const sections = containerRef.current.querySelectorAll('.section-card');
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActive(entry.target.id);
          }
        });
      },
      { root: null, rootMargin: '-20% 0px -60% 0px', threshold: 0 }
    );

    sections.forEach((s) => obs.observe(s));
    return () => obs.disconnect();
  }, [reduceMotion]);

  const lastUpdated = 'December 8, 2025';

  const sections = [
    {
      id: 'acceptance',
      title: 'Acceptance of Terms',
      icon: <FileText size={22} />,
      short: 'Agreement & scope',
      text: 'By accessing or using Live Journal ("Service"), you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree, do not use the Service.'
    },
    {
      id: 'service',
      title: 'Service Description',
      icon: <Globe size={22} />,
      short: 'What we provide',
      text: 'Live Journal provides a secure, private journaling platform with AI-powered insights, mood tracking, and searching capabilities. Features may be added or removed over time.'
    },
    {
      id: 'accounts',
      title: 'Accounts & Security',
      icon: <UserCheck size={22} />,
      short: 'Your account responsibilities',
      text: 'You are responsible for maintaining the confidentiality of your account credentials. Notify us immediately of any unauthorized use. We are not liable for losses resulting from compromised accounts.'
    },
    {
      id: 'ownership',
      title: 'Content Ownership',
      icon: <Shield size={22} />,
      short: 'Your data rights',
      text: 'You retain ownership of the content you create. By using the Service you grant Live Journal a limited license to store, display, and process that content as necessary to provide the Service.'
    },
    {
      id: 'acceptable-use',
      title: 'Acceptable Use',
      icon: <Slash size={22} />,
      short: 'Rules & restrictions',
      text: 'You agree not to use the Service for unlawful purposes or to upload content that violates others’ rights. We reserve the right to remove content or suspend accounts that breach these rules.'
    },
    {
      id: 'termination',
      title: 'Termination',
      icon: <FileText size={22} />,
      short: 'Suspension & deletion',
      text: 'We may suspend or terminate access for violations of these terms. You may delete your account at any time; we will attempt to remove your data in accordance with the Privacy Policy.'
    },
    {
      id: 'disclaimer',
      title: 'Disclaimers',
      icon: <Shield size={22} />,
      short: 'Warranties',
      text: 'The Service is provided "as is" and we disclaim all warranties to the fullest extent permitted by law. We do not warrant that the Service will be uninterrupted or error-free.'
    },
    {
      id: 'liability',
      title: 'Limitation of Liability',
      icon: <Slash size={22} />,
      short: 'Limits of responsibility',
      text: 'To the maximum extent permitted by law, Live Journal and its affiliates will not be liable for indirect, incidental, special, or consequential damages arising from your use of the Service.'
    },
    {
      id: 'changes',
      title: 'Changes to Terms',
      icon: <Globe size={22} />,
      short: 'Updates & notice',
      text: 'We may modify these terms from time to time. Material changes will be communicated via the app or email. Continued use after changes constitutes acceptance.'
    },
    {
      id: 'governing',
      title: 'Governing Law & Contact',
      icon: <FileText size={22} />,
      short: 'Legal & contact',
      text: 'These Terms are governed by applicable laws. For questions or legal notices contact: legal@livejournal.com.'
    }
  ];

  const toggle = (id) => {
    setExpanded((p) => ({ ...p, [id]: !p[id] }));
  };

  const goTo = (id) => {
    setActive(id);
    setExpanded((p) => ({ ...p, [id]: true }));
    const el = document.getElementById(id);
    if (el) {
      const yOffset = -100;
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const handleAccept = () => {
    setAccepted(true);
    setTimeout(() => {
      setHidden(true);
    }, 1500);
  };

  const heroVariants = {
    hidden: { opacity: 0, y: 20 },
    enter: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
  };

  return (
    <div className={`terms-page ${visible ? 'visible' : ''}`}>
      <Navbar isAuthenticated={false} />

      <motion.div
        className="terms-progress-container"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <motion.div
          className="terms-progress-bar"
          style={{ width: `${scrollProgress}%` }}
        />
      </motion.div>

      <div className="terms-wrapper">
        <motion.div
          initial="hidden"
          animate={visible ? "enter" : "hidden"}
          variants={heroVariants}
          className="terms-header"
        >
          <motion.button
            className="back-button"
            onClick={() => navigate(-1)}
            whileHover={{ x: -4 }}
            whileTap={{ scale: 0.98 }}
          >
            <ArrowLeft size={18} />
            <span>Back to App</span>
          </motion.button>

          <div className="header-content">
            <div className="badge">
              <Shield size={14} />
              <span>Legal Center</span>
            </div>
            <h1 className="title">Terms of Service</h1>
            <p className="subtitle">
              Please review these terms carefully as they govern your use of the Live Journal platform
              and outline your rights and responsibilities.
            </p>
            <div className="meta">
              Last Updated: {lastUpdated}
            </div>
          </div>
        </motion.div>

        <div className="terms-body" ref={containerRef}>
          <aside className="terms-sidebar">
            <div className="sidebar-sticky">
              <h5 className="sidebar-title">Table of Contents</h5>
              <nav className="toc-nav">
                {sections.map((s) => (
                  <button
                    key={s.id}
                    className={`toc-link ${active === s.id ? 'active' : ''}`}
                    onClick={() => goTo(s.id)}
                  >
                    {s.title}
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          <main className="terms-main">
            {sections.map((s, i) => (
              <motion.div
                key={s.id}
                id={s.id}
                className={`section-card ${expanded[s.id] || active === s.id ? 'expanded' : ''}`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
              >
                <div
                  className="section-header"
                  onClick={() => toggle(s.id)}
                >
                  <div className="section-icon">{s.icon}</div>
                  <div className="section-title-wrapper">
                    <h3>{s.title}</h3>
                    <p className="section-short">{s.short}</p>
                  </div>
                  <div className={`chevron ${itemExpanded(s.id) ? 'rotated' : ''}`}>
                    <ArrowLeft size={16} style={{ transform: 'rotate(-90deg)' }} />
                  </div>
                </div>
                <AnimatePresence>
                  <motion.div
                    className="section-content"
                    initial={false}
                    animate={{
                      height: (expanded[s.id] || active === s.id) ? 'auto' : '0px',
                      opacity: (expanded[s.id] || active === s.id) ? 1 : 0
                    }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  >
                    <div className="content-inner">
                      <p>{s.text}</p>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </motion.div>
            ))}

          </main>
        </div>

        <div className="contact-box">
          <h3>Still have questions?</h3>
          <p>We're here to help. Contact our legal team for clarification.</p>
          <a href="mailto:legal@livejournal.com" className="contact-link">legal@livejournal.com</a>
        </div>

        <AnimatePresence>
          {!hidden && (
            <motion.div
              className="terms-action-bar"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
            >
              <div className="action-bar-inner">
                <div className="agreement-text">
                  <span className="agreement-label">
                    {accepted ? 'Thank you for accepting the Terms of Service' : 'I have read and agree to the Terms of Service'}
                  </span>
                </div>
                <button
                  className={`agree-button ${accepted ? 'accepted' : ''}`}
                  onClick={handleAccept}
                  disabled={accepted}
                >
                  {accepted ? (
                    <>
                      <CheckCircle2 size={18} />
                      <span>Accepted</span>
                    </>
                  ) : (
                    <span>I Agree</span>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const itemExpanded = (id) => true;

export default Terms;

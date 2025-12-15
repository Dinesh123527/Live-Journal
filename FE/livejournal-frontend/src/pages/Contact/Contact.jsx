import { useEffect, useState } from 'react';
import Navbar from '../../components/Navbar/Navbar';
import ScrollProgressBar from '../../components/ScrollProgressBar/ScrollProgressBar';
import axiosInstance from '../../utils/axiosInstance';
import './Contact.scss';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [focusedField, setFocusedField] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [showMap, setShowMap] = useState(false);

  // Office location coordinates for Visakhapatnam
  const officeLocation = {
    address: '24-93-11/1, Gonthinavanipalem, Backside SFS School, Visakhapatnam, AP, India-530028',
    lat: 17.7231,
    lng: 83.3012,
    mapUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15265.547461205842!2d83.30120000000001!3d17.7231!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a39431389e6b0d1%3A0x8c5c3c8b6b0b0b0b!2sVisakhapatnam%2C%20Andhra%20Pradesh!5e0!3m2!1sen!2sin!4v1234567890123!5m2!1sen!2sin'
  };

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 50);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      const response = await axiosInstance.post('/contact', formData);

      if (response.data.success) {
        setIsSubmitting(false);
        setSubmitStatus('success');
        setFormData({ name: '', email: '', message: '' });

        setTimeout(() => {
          setSubmitStatus(null);
        }, 5000);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setIsSubmitting(false);
      setSubmitStatus('error');

      setTimeout(() => {
        setSubmitStatus(null);
      }, 5000);
    }
  };

  const openGoogleMaps = () => {
    setShowMap(true);
  };

  const closeMap = () => {
    setShowMap(false);
  };

  return (
    <div className="contact-page">
      <Navbar />
      <ScrollProgressBar />
      <div className={`contact-content ${isVisible ? 'visible' : ''}`}>
        <section className="contact-header">
          <div className="header-decoration">
            <div className="floating-icon icon-1">✉️</div>
            <div className="floating-icon icon-2">💬</div>
            <div className="floating-icon icon-3">🚀</div>
          </div>
          <h1 className="animate-title">Get In Touch</h1>
          <p className="animate-subtitle">We'd love to hear from you! Whether you have a question, feedback, or just want to say hello, our team is here to help.</p>
        </section>

        <div className="contact-main">
          <form className="contact-form" onSubmit={handleSubmit}>
            <div className="form-decoration">
              <div className="glow-effect"></div>
            </div>

            <div className={`form-group ${focusedField === 'name' ? 'focused' : ''} ${formData.name ? 'filled' : ''}`}>
              <label htmlFor="name">
                <span className="label-icon">👤</span>
                Full Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                placeholder="John Doe"
                value={formData.name}
                onChange={handleChange}
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField(null)}
                required
              />
            </div>

            <div className={`form-group ${focusedField === 'email' ? 'focused' : ''} ${formData.email ? 'filled' : ''}`}>
              <label htmlFor="email">
                <span className="label-icon">📧</span>
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="you@email.com"
                value={formData.email}
                onChange={handleChange}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                required
              />
            </div>

            <div className={`form-group ${focusedField === 'message' ? 'focused' : ''} ${formData.message ? 'filled' : ''}`}>
              <label htmlFor="message">
                <span className="label-icon">💭</span>
                Your Message
              </label>
              <textarea
                id="message"
                name="message"
                rows="5"
                placeholder="Type your message here..."
                value={formData.message}
                onChange={handleChange}
                onFocus={() => setFocusedField('message')}
                onBlur={() => setFocusedField(null)}
                required
              ></textarea>
              <div className="char-count">{formData.message.length} characters</div>
            </div>

            <button
              type="submit"
              className={`submit-btn ${isSubmitting ? 'submitting' : ''} ${submitStatus === 'success' ? 'success' : ''}`}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner"></span>
                  Sending...
                </>
              ) : submitStatus === 'success' ? (
                <>
                  <span className="checkmark">✓</span>
                  Message Sent!
                </>
              ) : (
                <>
                  Send Message
                  <span className="arrow">→</span>
                </>
              )}
            </button>

            {submitStatus === 'success' && (
              <div className="success-message">
                <span className="success-icon">🎉</span>
                Thank you! We'll get back to you soon.
              </div>
            )}

            {submitStatus === 'error' && (
              <div className="error-message">
                <span className="error-icon">⚠️</span>
                Failed to send message. Please try again later.
              </div>
            )}
          </form>

          <aside className="contact-details">
            <div className="details-decoration">
              <div className="pulse-circle"></div>
            </div>

            <h2>
              <span className="title-icon">📍</span>
              Contact Information
            </h2>

            <div className="info-cards">
              <div className="info-card">
                <div className="card-icon">📧</div>
                <div className="card-content">
                  <span className="card-label">Email</span>
                  <a href="mailto:mtechcs003@gmail.com">mtechcs003@gmail.com</a>
                </div>
              </div>

              <div className="info-card">
                <div className="card-icon">📱</div>
                <div className="card-content">
                  <span className="card-label">Phone</span>
                  <a href="tel:+919100659045">+91 9100659045</a>
                </div>
              </div>

              <div className="info-card clickable" onClick={openGoogleMaps}>
                <div className="card-icon">🏢</div>
                <div className="card-content">
                  <span className="card-label">Office</span>
                  <span className="address-link">
                    24-93-11/1, Gonthinavanipalem,<br />
                    Backside SFS School,<br />
                    Visakhapatnam, AP, India-530028
                  </span>
                  <span className="click-hint">Click to view on map</span>
                </div>
              </div>
            </div>

            <div className="divider"></div>

            <div className="social-section">
              <h3>Follow Us</h3>
              <div className="social-links">
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="social-link twitter">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" />
                  </svg>
                </a>
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="social-link facebook">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
                  </svg>
                </a>
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="social-link instagram">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" fill="var(--card-bg)" />
                    <circle cx="17.5" cy="6.5" r="1.5" fill="var(--card-bg)" />
                  </svg>
                </a>
                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="social-link linkedin">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z" />
                    <circle cx="4" cy="4" r="2" />
                  </svg>
                </a>
              </div>
            </div>

            <div className="response-time">
              <div className="time-badge">
                <span className="badge-icon">⚡</span>
                <span>We typically respond within 24 hours</span>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Map Modal */}
      {showMap && (
        <div className="map-modal-overlay" onClick={closeMap}>
          <div className="map-modal" onClick={(e) => e.stopPropagation()}>
            <div className="map-modal-header">
              <div className="map-header-content">
                <span className="map-icon">📍</span>
                <div>
                  <h3>Our Office Location</h3>
                  <p>{officeLocation.address}</p>
                </div>
              </div>
              <button className="map-close-btn" onClick={closeMap}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="map-container">
              <iframe
                src={officeLocation.mapUrl}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Office Location Map"
              ></iframe>
            </div>

            <div className="map-modal-footer">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(officeLocation.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="open-maps-btn"
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                </svg>
                Open in Google Maps
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Contact;
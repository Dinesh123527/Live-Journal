import { ArrowLeft, Loader2, Mail, Send, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import MarvelThemeSelector from '../../components/MarvelThemeSelector/MarvelThemeSelector';
import Navbar from '../../components/Navbar/Navbar';
import ScrollProgressBar from '../../components/ScrollProgressBar/ScrollProgressBar';
import ThemeToggle from '../../components/ThemeToggle/ThemeToggle';
import axios from '../../utils/axiosInstance';
import './ForgotPassword.scss';

const ForgotPassword = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const isValidEmail = (email) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await axios.post('/auth/forgot-password', { email });
            setSuccess(true);
        } catch (err) {
            // Only show generic network errors, not email existence
            if (err.code === 'ERR_NETWORK') {
                setError('Unable to connect. Please check your internet connection.');
            } else if (err.response?.status === 500) {
                setError('Server error. Please try again later.');
            } else {
                // For any other case, still show success (security - don't leak email existence)
                setSuccess(true);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Navbar showAuthButtons={false} />
            <ScrollProgressBar />
            <div className="forgot-password-page">
                {/* Theme Controls */}
                <div className="theme-toggle-container">
                    <ThemeToggle />
                    <MarvelThemeSelector />
                </div>

                <div className="forgot-password-container">
                    {/* Animated Background Orbs */}
                    <div className="background-orbs">
                        <div className="orb orb-1"></div>
                        <div className="orb orb-2"></div>
                        <div className="orb orb-3"></div>
                    </div>

                    <div className="forgot-password-card">
                        {/* Back Button */}
                        <Link to="/login" className="back-link">
                            <ArrowLeft size={18} />
                            <span>Back to Login</span>
                        </Link>

                        {!success ? (
                            <>
                                {/* Header */}
                                <div className="card-header">
                                    <div className="icon-container">
                                        <div className="icon-glow"></div>
                                        <Mail className="header-icon" size={32} />
                                    </div>
                                    <h1>Forgot your password?</h1>
                                    <p>No worries! Enter your email address and we'll send you a secure link to reset your password.</p>
                                </div>

                                {/* Error Message */}
                                {error && (
                                    <div className="error-message">
                                        <span>{error}</span>
                                    </div>
                                )}

                                {/* Form */}
                                <form onSubmit={handleSubmit} className="forgot-password-form">
                                    <div className="form-group">
                                        <label htmlFor="email">Email Address</label>
                                        <div className="input-wrapper">
                                            <Mail className="input-icon" size={18} />
                                            <input
                                                type="email"
                                                id="email"
                                                value={email}
                                                onChange={(e) => {
                                                    setEmail(e.target.value);
                                                    if (error) setError('');
                                                }}
                                                placeholder="Enter your email"
                                                required
                                                autoComplete="email"
                                                disabled={loading}
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        className="submit-button"
                                        disabled={loading || !isValidEmail(email)}
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="spinner" size={20} />
                                                <span>Sending...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Send size={18} />
                                                <span>Send Reset Link</span>
                                            </>
                                        )}
                                    </button>
                                </form>
                            </>
                        ) : (
                            /* Success State */
                            <div className="success-state">
                                <div className="success-icon-container">
                                    <div className="success-icon-glow"></div>
                                    <div className="success-icon-ring"></div>
                                    <Sparkles className="success-icon" size={40} />
                                </div>
                                <h2>Check your email</h2>
                                <p>If an account with <strong>{email}</strong> exists, we've sent a password reset link to your inbox.</p>
                                <div className="success-tips">
                                    <p>💡 Didn't receive the email?</p>
                                    <ul>
                                        <li>Check your spam folder</li>
                                        <li>Make sure you entered the correct email</li>
                                        <li>The link expires in 15 minutes</li>
                                    </ul>
                                </div>
                                <div className="success-actions">
                                    <button
                                        className="resend-button"
                                        onClick={() => {
                                            setSuccess(false);
                                            setEmail('');
                                        }}
                                    >
                                        Try another email
                                    </button>
                                    <button
                                        className="login-button"
                                        onClick={() => navigate('/login')}
                                    >
                                        Back to Login
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default ForgotPassword;

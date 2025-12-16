import { ArrowLeft, CheckCircle, KeyRound, Loader2, Lock, ShieldCheck, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import MarvelThemeSelector from '../../components/MarvelThemeSelector/MarvelThemeSelector';
import Navbar from '../../components/Navbar/Navbar';
import PasswordStrengthMeter from '../../components/PasswordStrengthMeter/PasswordStrengthMeter';
import ScrollProgressBar from '../../components/ScrollProgressBar/ScrollProgressBar';
import ThemeToggle from '../../components/ThemeToggle/ThemeToggle';
import axios from '../../utils/axiosInstance';
import './ResetPassword.scss';

const ResetPassword = () => {
    const navigate = useNavigate();
    const { token } = useParams();

    const [formData, setFormData] = useState({
        newPassword: '',
        confirmPassword: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [tokenValid, setTokenValid] = useState(true);
    const [passwordTouched, setPasswordTouched] = useState(false);

    // Check if passwords match
    const passwordsMatch = formData.newPassword && formData.confirmPassword &&
        formData.newPassword === formData.confirmPassword;

    // Check if password is strong enough
    const isPasswordStrong = formData.newPassword.length >= 8;

    // Can submit the form
    const canSubmit = passwordsMatch && isPasswordStrong && !loading;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        if (error) setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await axios.post(`/auth/reset-password/${token}`, {
                newPassword: formData.newPassword,
                confirmPassword: formData.confirmPassword
            });
            setSuccess(true);
        } catch (err) {
            const errorMsg = err.response?.data?.error || err.response?.data?.message;
            if (errorMsg?.includes('expired') || errorMsg?.includes('invalid')) {
                setTokenValid(false);
            } else {
                setError(errorMsg || 'Failed to reset password. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    // Redirect to login after success
    useEffect(() => {
        if (success) {
            const timer = setTimeout(() => {
                navigate('/login');
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [success, navigate]);

    // Invalid/Expired Token State
    if (!tokenValid) {
        return (
            <>
                <Navbar showAuthButtons={false} />
                <ScrollProgressBar />
                <div className="reset-password-page">
                    <div className="theme-toggle-container">
                        <ThemeToggle />
                        <MarvelThemeSelector />
                    </div>
                    <div className="reset-password-container">
                        <div className="reset-password-card">
                            <div className="invalid-token-state">
                                <div className="error-icon-container">
                                    <div className="error-icon-glow"></div>
                                    <XCircle className="error-icon" size={48} />
                                </div>
                                <h2>Link Expired or Invalid</h2>
                                <p>This password reset link is no longer valid. This can happen if:</p>
                                <ul>
                                    <li>The link has expired (valid for 15 minutes)</li>
                                    <li>The link has already been used</li>
                                    <li>The link was copied incorrectly</li>
                                </ul>
                                <button
                                    className="request-new-link-button"
                                    onClick={() => navigate('/forgot-password')}
                                >
                                    <KeyRound size={18} />
                                    <span>Request a New Link</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    // Success State
    if (success) {
        return (
            <>
                <Navbar showAuthButtons={false} />
                <ScrollProgressBar />
                <div className="reset-password-page">
                    <div className="theme-toggle-container">
                        <ThemeToggle />
                        <MarvelThemeSelector />
                    </div>
                    <div className="reset-password-container">
                        <div className="reset-password-card">
                            <div className="success-state">
                                <div className="success-icon-container">
                                    <div className="success-icon-glow"></div>
                                    <div className="success-icon-ring"></div>
                                    <CheckCircle className="success-icon" size={48} />
                                </div>
                                <h2>Password Reset Successful!</h2>
                                <p>Your password has been updated successfully. You can now log in with your new password.</p>
                                <div className="redirect-notice">
                                    <Loader2 className="spinner" size={16} />
                                    <span>Redirecting to login in 5 seconds...</span>
                                </div>
                                <button
                                    className="login-now-button"
                                    onClick={() => navigate('/login')}
                                >
                                    <ShieldCheck size={18} />
                                    <span>Login Now</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    // Main Reset Password Form
    return (
        <>
            <Navbar showAuthButtons={false} />
            <ScrollProgressBar />
            <div className="reset-password-page">
                <div className="theme-toggle-container">
                    <ThemeToggle />
                    <MarvelThemeSelector />
                </div>

                <div className="reset-password-container">
                    {/* Animated Background Orbs */}
                    <div className="background-orbs">
                        <div className="orb orb-1"></div>
                        <div className="orb orb-2"></div>
                        <div className="orb orb-3"></div>
                    </div>

                    <div className="reset-password-card">
                        {/* Back Link */}
                        <Link to="/login" className="back-link">
                            <ArrowLeft size={18} />
                            <span>Back to Login</span>
                        </Link>

                        {/* Header */}
                        <div className="card-header">
                            <div className="icon-container">
                                <div className="icon-glow"></div>
                                <Lock className="header-icon" size={32} />
                            </div>
                            <h1>Reset your password</h1>
                            <p>Choose a strong password that you haven't used before.</p>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="error-message">
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="reset-password-form">
                            <div className="form-group">
                                <label htmlFor="newPassword">New Password</label>
                                <div className="input-wrapper">
                                    <Lock className="input-icon" size={18} />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        id="newPassword"
                                        name="newPassword"
                                        value={formData.newPassword}
                                        onChange={(e) => {
                                            handleChange(e);
                                            setPasswordTouched(true);
                                        }}
                                        placeholder="Enter new password"
                                        required
                                        autoComplete="new-password"
                                        disabled={loading}
                                        minLength={8}
                                    />
                                    <button
                                        type="button"
                                        className="toggle-password"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? '🙈' : '👁️'}
                                    </button>
                                </div>
                                {passwordTouched && formData.newPassword && (
                                    <PasswordStrengthMeter password={formData.newPassword} />
                                )}
                            </div>

                            <div className="form-group">
                                <label htmlFor="confirmPassword">Confirm Password</label>
                                <div className={`input-wrapper ${formData.confirmPassword ? (passwordsMatch ? 'match' : 'no-match') : ''}`}>
                                    <Lock className="input-icon" size={18} />
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        placeholder="Confirm new password"
                                        required
                                        autoComplete="new-password"
                                        disabled={loading}
                                        minLength={8}
                                    />
                                    <button
                                        type="button"
                                        className="toggle-password"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    >
                                        {showConfirmPassword ? '🙈' : '👁️'}
                                    </button>
                                </div>
                                {formData.confirmPassword && !passwordsMatch && (
                                    <div className="field-error">
                                        <XCircle size={14} />
                                        <span>Passwords do not match</span>
                                    </div>
                                )}
                                {formData.confirmPassword && passwordsMatch && (
                                    <div className="field-success">
                                        <CheckCircle size={14} />
                                        <span>Passwords match</span>
                                    </div>
                                )}
                            </div>

                            <button
                                type="submit"
                                className="submit-button"
                                disabled={!canSubmit}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="spinner" size={20} />
                                        <span>Resetting...</span>
                                    </>
                                ) : (
                                    <>
                                        <ShieldCheck size={18} />
                                        <span>Reset Password</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ResetPassword;

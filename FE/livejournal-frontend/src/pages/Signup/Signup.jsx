import Cookies from 'js-cookie';
import { Lock, Mail, Shield, User, X, XCircle } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import MarvelThemeSelector from '../../components/MarvelThemeSelector/MarvelThemeSelector';
import Navbar from '../../components/Navbar/Navbar';
import PasswordStrengthMeter from '../../components/PasswordStrengthMeter/PasswordStrengthMeter';
import ScrollProgressBar from '../../components/ScrollProgressBar/ScrollProgressBar';
import ThemeToggle from '../../components/ThemeToggle/ThemeToggle';
import axios from '../../utils/axiosInstance';
import './Signup.scss';

const Signup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordMatchError, setPasswordMatchError] = useState('');
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmPasswordTouched, setConfirmPasswordTouched] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    // Clear general error when user starts typing
    if (error) setError('');

    // Real-time password match validation
    if (name === 'confirmPassword') {
      setConfirmPasswordTouched(true);
      if (value && formData.password !== value) {
        setPasswordMatchError('Passwords do not match');
      } else {
        setPasswordMatchError('');
      }
    }

    if (name === 'password') {
      setPasswordTouched(true);
      if (formData.confirmPassword && value !== formData.confirmPassword) {
        setPasswordMatchError('Passwords do not match');
      } else {
        setPasswordMatchError('');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setPasswordMatchError('Passwords do not match');
      setLoading(false);
      return;
    }

    // Validate password length
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      // Send all fields including confirmPassword to backend
      const response = await axios.post('/auth/register', formData);

      if (response.data.token) {
        // Store access token in cookies (expires in 1 hour)
        Cookies.set('accessToken', response.data.token, { expires: 1 / 24 });

        // Store user data in localStorage for quick access
        if (response.data.user) {
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }

        // Navigate to welcome page
        navigate('/welcome');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Check if passwords match and both fields are filled
  const passwordsMatch = formData.password && formData.confirmPassword && formData.password === formData.confirmPassword;
  const showPasswordMatch = confirmPasswordTouched && formData.confirmPassword;

  return (
    <>
      <Navbar showAuthButtons={false} />
      <ScrollProgressBar />
      <div className="signup-page">
        {/* Theme Toggle and Marvel Theme Selector positioned at top-right */}
        <div className="theme-toggle-container">
          <ThemeToggle />
          <MarvelThemeSelector />
        </div>

        <div className="signup-container">
          <div className="signup-card">
            <div className="signup-header">
              <h1>Create Account</h1>
              <p>Start your journaling journey today</p>
            </div>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="signup-form">
              <div className="form-group">
                <label htmlFor="username">Username</label>
                <div className="input-wrapper">
                  <User className="input-icon" />
                  <input
                    type="text"
                    id="username"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Choose a username"
                    required
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="email">Email</label>
                <div className="input-wrapper">
                  <Mail className="input-icon" />
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter your email"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <div className="input-wrapper">
                  <Lock className="input-icon" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Create a password"
                    required
                    autoComplete="new-password"
                    minLength={8}
                  />
                  {formData.password && (
                    <button
                      type="button"
                      className="clear-field-btn"
                      onClick={() => {
                        setFormData({ ...formData, password: '', confirmPassword: '' });
                        setPasswordTouched(false);
                        setPasswordMatchError('');
                        setConfirmPasswordTouched(false);
                      }}
                      aria-label="Clear password"
                    >
                      <X size={18} />
                    </button>
                  )}
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
                {passwordTouched && formData.password && (
                  <PasswordStrengthMeter password={formData.password} />
                )}
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <div className={`input-wrapper ${showPasswordMatch ? (passwordsMatch ? 'match' : 'no-match') : ''}`}>
                  <Lock className="input-icon" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm your password"
                    required
                    autoComplete="new-password"
                    minLength={8}
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? '🙈' : '👁️'}
                  </button>
                  {formData.confirmPassword && (
                    <button
                      type="button"
                      className="clear-field-btn"
                      onClick={() => {
                        setFormData({ ...formData, confirmPassword: '' });
                        setPasswordMatchError('');
                        setConfirmPasswordTouched(false);
                      }}
                      aria-label="Clear confirm password"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
                {passwordMatchError && confirmPasswordTouched && (
                  <div className="field-error">
                    <div className="error-icon">
                      <XCircle size={12} />
                    </div>
                    <span>{passwordMatchError}</span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="signup-button"
                disabled={loading || !!passwordMatchError || !formData.password || !formData.confirmPassword}
              >
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>

            <div className="signup-footer">
              <p className="login-link">
                Already have an account? <Link to="/login">Sign in</Link>
              </p>

              <div className="privacy-notice">
                <Shield size={16} />
                <p>Your data is encrypted and private. We never share your information.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Signup;

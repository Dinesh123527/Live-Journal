import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Mail, Eye, EyeOff, Shield } from 'lucide-react';
import Cookies from 'js-cookie';
import axios from '../../utils/axiosInstance';
import Navbar from '../../components/Navbar/Navbar';
import ThemeToggle from '../../components/ThemeToggle/ThemeToggle';
import MarvelThemeSelector from '../../components/MarvelThemeSelector/MarvelThemeSelector';
import './Login.scss';

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post('/auth/login', formData);

      if (response.data.token) {
        // Store access token in cookies (expires in 1 hour)
        Cookies.set('accessToken', response.data.token, { expires: 1/24 });

        // Store user data in localStorage for quick access
        if (response.data.user) {
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }

        // Navigate to welcome page
        navigate('/welcome');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar showAuthButtons={false} />
      <div className="login-page">
        {/* Theme Toggle and Marvel Theme Selector positioned at top-right */}
        <div className="theme-toggle-container">
          <ThemeToggle />
          <MarvelThemeSelector />
        </div>

        <div className="login-container">
          <div className="login-card">
            <div className="login-header">
              <h1>Welcome Back</h1>
              <p>Sign in to continue your journey</p>
            </div>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form">
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
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="login-button"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <div className="login-footer">
              <p className="signup-link">
                Don't have an account? <Link to="/signup">Create an account</Link>
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

export default Login;

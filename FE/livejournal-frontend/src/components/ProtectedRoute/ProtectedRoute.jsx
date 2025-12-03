import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import Cookies from 'js-cookie';
import axiosInstance from '../../utils/axiosInstance';

const ProtectedRoute = ({ children }) => {
  const [isValidating, setIsValidating] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const token = Cookies.get('accessToken');

  useEffect(() => {
    const validateToken = async () => {
      // If no token exists, redirect immediately
      if (!token) {
        setIsValidating(false);
        setIsAuthenticated(false);
        return;
      }

      try {
        // Validate token with backend
        const response = await axiosInstance.get('/auth/me');

        // If successful, user is authenticated
        if (response.data && response.data.user) {
          setIsAuthenticated(true);
        } else {
          // Invalid response, clear auth data
          clearAuthData();
          setIsAuthenticated(false);
        }
      } catch (error) {
        // Token is invalid or expired
        console.error('Token validation failed:', error);
        clearAuthData();
        setIsAuthenticated(false);
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const clearAuthData = () => {
    // Clear all auth-related data
    Cookies.remove('accessToken');
    Cookies.remove('userId');
    Cookies.remove('username');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  // Show loading state while validating
  if (isValidating) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'var(--page-bg-gradient, linear-gradient(135deg, #f8fafc 0%, #e0e7ff 50%, #fce7f3 100%))',
      }}>
        <div style={{
          textAlign: 'center',
          padding: '2rem',
        }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '3px solid rgba(102, 126, 234, 0.2)',
            borderTop: '3px solid var(--marvel-primary, #667eea)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem',
          }}></div>
          <p style={{ color: 'var(--text-secondary, #6b7280)' }}>Verifying access...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to unauthorized page
  if (!isAuthenticated) {
    return <Navigate to="/unauthorized" replace />;
  }

  // User is authenticated, render protected content
  return children;
};

export default ProtectedRoute;

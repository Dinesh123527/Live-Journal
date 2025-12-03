import axios from 'axios';
import Cookies from 'js-cookie';
import { BASE_URL } from './constants.js';

const API_URL = `${BASE_URL}/api`;

// Create axios instance
const axiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Important for cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add access token to headers
axiosInstance.interceptors.request.use(
  (config) => {
    const token = Cookies.get('accessToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle token refresh
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 or 403 and we haven't retried yet
    if (
      (error.response?.status === 401 || error.response?.status === 403) &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        // Try to refresh the token
        const { data } = await axios.post(
          `${API_URL}/auth/refresh`,
          {},
          {
            withCredentials: true,
          }
        );

        if (data.token) {
          // Store new access token
          Cookies.set('accessToken', data.token, { expires: 1/24 }); // 1 hour

          // Update the failed request with new token
          originalRequest.headers['Authorization'] = `Bearer ${data.token}`;

          // Retry the original request
          return axiosInstance(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed - clear tokens and redirect to login
        Cookies.remove('accessToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;

import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://portal-registration-bk.vercel.app/api',
  withCredentials: true, // Send and receive HttpOnly cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach Bearer token if stored in localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle session expiration cleanly
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If receiving 401 on an admin endpoint, trigger auth event if needed
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('adminToken');
      const isAuthCheck = error.config && error.config.url && error.config.url.includes('/auth/me');
      if (!isAuthCheck && window.location.pathname.startsWith('/admin')) {
        // Only redirect if not already on the login page
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/admin/login?expired=true';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

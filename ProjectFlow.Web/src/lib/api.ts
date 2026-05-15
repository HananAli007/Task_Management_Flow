import axios from 'axios';

// All API calls go through Next.js rewrites proxy (/backend-api/* → backend /api/*)
// This eliminates CORS and Mixed Content issues completely.
const api = axios.create({
  baseURL: '',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token and handle proxying
api.interceptors.request.use((config) => {
  // Log the original request for debugging
  if (process.env.NODE_ENV === 'development') {
    console.log(`[API] Request to: ${config.url}`);
  }

  // Rewrite /api/* paths to /backend-api/* so Next.js proxy handles them
  // This handles both relative (/api/...) and absolute (http://.../api/...) URLs
  if (config.url) {
    if (config.url.startsWith('/api/')) {
      config.url = config.url.replace(/^\/api\//, '/backend-api/');
    } else if (config.url.includes('/api/') && !config.url.includes('/backend-api/')) {
      // Handle cases where a full URL might have been passed
      const parts = config.url.split('/api/');
      config.url = `/backend-api/${parts[1]}`;
    }
  }

  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor to handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

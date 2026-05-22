import axios from 'axios';

export const getBaseURL = () => {
  // Always return relative URL to route through Next.js rewrite proxy.
  // This avoids CORS, SSL handshake mismatches (HTTP/HTTPS mix), and port 8080 exposure issues.
  return '';
};

const api = axios.create({
  baseURL: '',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token and handle routing
api.interceptors.request.use((config) => {
  // Log the original request for debugging
  if (process.env.NODE_ENV === 'development') {
    console.log(`[API] Request to: ${config.url}`);
  }

  const directBase = getBaseURL();

  if (config.url) {
    if (directBase) {
      // Route directly to backend on port 8080
      if (config.url.startsWith('/api/')) {
        config.url = `${directBase}${config.url}`;
      } else if (config.url.startsWith('/backend-api/')) {
        config.url = config.url.replace(/^\/backend-api\//, `${directBase}/api/`);
      } else if (config.url.includes('/api/')) {
        const parts = config.url.split('/api/');
        config.url = `${directBase}/api/${parts[1]}`;
      }
    } else {
      // Local development rewrite proxy
      if (config.url.startsWith('/api/')) {
        config.url = config.url.replace(/^\/api\//, '/backend-api/');
      } else if (config.url.includes('/api/') && !config.url.includes('/backend-api/')) {
        const parts = config.url.split('/api/');
        config.url = `/backend-api/${parts[1]}`;
      }
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

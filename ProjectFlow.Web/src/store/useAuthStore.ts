import { create } from 'zustand';
import api from '@/lib/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar_url?: string;
}

export interface Permission {
  screen_name: string;
  object_name: string;
  allowed: boolean;
}

export interface PermissionManifest {
  global_permissions: Permission[];
  project_permissions: { [key: string]: Permission[] };
}

interface AuthState {
  user: User | null;
  token: string | null;
  permissions: PermissionManifest | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  fetchMe: () => Promise<void>;
  fetchPermissions: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: typeof window !== 'undefined' ? localStorage.getItem('token') : null,
  permissions: null,
  isAuthenticated: false,
  isLoading: typeof window !== 'undefined' ? !!localStorage.getItem('token') : false,

  login: (token, user) => {
    if (token) {
      localStorage.setItem('token', token);
      set({ token, user, isAuthenticated: true, isLoading: false });
    }
  },

  logout: async () => {
    try {
      await api.post('/api/Auth/logout');
    } catch (error) {
      console.error("Logout API call failed:", error);
    }
    localStorage.removeItem('token');
    set({ token: null, user: null, permissions: null, isAuthenticated: false, isLoading: false });
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  },

  fetchPermissions: async () => {
    try {
      const response = await api.get('/api/Auth/permissions');
      if (response.data.success) {
        set({ permissions: response.data.data });
      }
    } catch (error) {
      console.error("Failed to fetch permissions:", error);
    }
  },

  fetchMe: async () => {
    try {
      const response = await api.get('/api/Auth/me');
      if (response.data.success) {
        set({ user: response.data.data, isAuthenticated: true, isLoading: false });
        // Fetch permissions after fetching user
        const permResponse = await api.get('/api/Auth/permissions');
        if (permResponse.data.success) {
          set({ permissions: permResponse.data.data });
        }
      }
    } catch (error) {
      localStorage.removeItem('token');
      set({ user: null, token: null, permissions: null, isAuthenticated: false, isLoading: false });
    }
  },
}));

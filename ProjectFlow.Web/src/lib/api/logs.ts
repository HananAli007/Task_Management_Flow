import api from '../api';

export interface ActivityLog {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: string;
  ip_address: string;
  created_at: string;
}

export const logApi = {
  getRecent: async (count: number = 50) => {
    const response = await api.get(`/api/ActivityLog/recent?count=${count}`);
    return response.data.data as ActivityLog[];
  },
  
  getMy: async (count: number = 50) => {
    const response = await api.get(`/api/ActivityLog/my?count=${count}`);
    return response.data.data as ActivityLog[];
  }
};

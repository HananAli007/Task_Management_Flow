import api from '../api';

export interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  priority: string;
  progress: number;
  total_tasks: number;
  completed_tasks: number;
  member_ids: string[];
  member_names: string[];
  member_avatars: string[];
  created_at: string;
  deadline?: string;
}

export const projectApi = {
  getAll: async () => {
    const response = await api.get('/api/Projects');
    return response.data.data as Project[];
  },
  
  getById: async (id: string) => {
    const response = await api.get(`/api/v1/projects/${id}`);
    return response.data.data as Project;
  },

  create: async (data: { name: string; description?: string; status?: string; priority?: string; deadline?: string }) => {
    const response = await api.post('/api/Projects', data);
    return response.data.data as Project;
  },
  
  update: async (id: string, data: any) => {
    const response = await api.put(`/api/Projects/${id}`, data);
    return response.data.data as Project;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/api/Projects/${id}`);
    return response.data;
  }
};

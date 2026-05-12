import api from '../api';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar_url?: string;
  phone?: string;
  is_deleted: boolean;
  created_at: string;
  group_id?: number;
}

export interface Group {
  id: number;
  description: string;
}

export const userApi = {
  getAll: async () => {
    const response = await api.get('/api/Auth/users');
    return response.data.data as User[];
  },
  update: async (id: string, data: Partial<User>) => {
    const response = await api.put(`/api/Auth/users/${id}`, data);
    return response.data.data as User;
  },
  patchRole: async (id: string, role: string) => {
    const response = await api.patch(`/api/Auth/users/${id}/role`, { role });
    return response.data.data as User;
  },
  delete: async (id: string) => {
    const response = await api.delete(`/api/Auth/users/${id}`);
    return response.data;
  },
  restore: async (id: string) => {
    const response = await api.post(`/api/Auth/users/${id}/restore`);
    return response.data;
  },
  getGroups: async () => {
    const response = await api.get('/api/Permission/groups');
    return response.data as Group[];
  },
  updateGroup: async (userId: string, groupId: number) => {
    const response = await api.post(`/api/Permission/user/${userId}/group`, groupId);
    return response.data;
  }
};

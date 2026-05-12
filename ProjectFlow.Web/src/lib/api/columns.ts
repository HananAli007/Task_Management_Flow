import api from '../api';

export interface BoardColumn {
  id: number;
  project_id: string;
  title: string;
  order_index: number;
  color?: string;
}

export const columnApi = {
  getByProject: async (projectId: string) => {
    const response = await api.get(`/api/BoardLists/project/${projectId}`);
    return response.data.data as BoardColumn[];
  },

  create: async (data: { project_id: string; title: string; order_index?: number; color?: string }) => {
    const response = await api.post('/api/BoardLists', data);
    return response.data.data as BoardColumn;
  },

  update: async (id: number, data: { title: string; order_index: number; color?: string }) => {
    const response = await api.put(`/api/BoardLists/${id}`, data);
    return response.data.data as BoardColumn;
  },

  delete: async (id: number) => {
    const response = await api.delete(`/api/BoardLists/${id}`);
    return response.data;
  },
};

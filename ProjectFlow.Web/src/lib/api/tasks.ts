import api from '../api';

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  fileSize?: string;
}

export interface Task {
  id: string;
  project_id: string;
  project_name: string;
  title: string;
  description: string;
  status: string;
  status_name?: string;
  system_status?: number;
  priority: string;
  assignee_id?: string;
  assignee_name?: string;
  assignee_avatar?: string;
  creator_id: string;
  created_at: string;
  deadline?: string;
  subtask_count: number;
  completed_subtask_count: number;
  comment_count: number;
  attachment_count: number;
  tags: { id: string; name: string }[];
  attachments_list?: Attachment[];
}

export const taskApi = {
  getByProject: async (projectId: string) => {
    const response = await api.get(`/api/Tasks/project/${projectId}`);
    return response.data.data as Task[];
  },

  getMyTasks: async () => {
    const response = await api.get('/api/Tasks/me');
    return response.data.data as Task[];
  },

  getById: async (id: string) => {
    const response = await api.get(`/api/Tasks/${id}`);
    return response.data.data as Task;
  },

  create: async (data: any) => {
    // Handling form data since backend expects multipart/form-data
    const response = await api.post('/api/Tasks', data, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data.data as Task;
  },

  update: async (id: string, data: any) => {
    const response = await api.put(`/api/Tasks/${id}`, data, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data.data as Task;
  },

  updateStatus: async (id: string, status: string) => {
    const response = await api.patch(`/api/Tasks/${id}/status`, { status });
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/api/Tasks/${id}`);
    return response.data;
  }
};

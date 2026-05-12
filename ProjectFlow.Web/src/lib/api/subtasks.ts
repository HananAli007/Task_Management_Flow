import api from '../api';

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  is_completed: boolean;
  assignee_id?: string;
  assignee_name?: string;
  creator_id: string;
  creator_name?: string;
  created_at: string;
  attachment_count: number;
  attachments?: Attachment[];
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  fileSize?: string;
}

export const subtaskApi = {
  getByTask: async (taskId: string) => {
    const response = await api.get(`/api/Subtasks/task/${taskId}`);
    return response.data.data as Subtask[];
  },

  create: async (taskId: string, data: any) => {
    const response = await api.post(`/api/Subtasks/task/${taskId}`, data, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data.data as Subtask;
  },

  update: async (id: string, data: any) => {
    const response = await api.put(`/api/Subtasks/${id}`, data, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data.data as Subtask;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/api/Subtasks/${id}`);
    return response.data;
  }
};

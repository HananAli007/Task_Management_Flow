import api from '../api';

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  fileSize?: string;
}

export interface Comment {
  id: string;
  task_id: string;
  user_id: string;
  user_name: string;
  content: string;
  created_at: string;
  attachments?: Attachment[];
}

export const commentApi = {
  getByTask: async (taskId: string) => {
    const response = await api.get(`/api/Comments/task/${taskId}`);
    return response.data.data as Comment[];
  },

  create: async (taskId: string, data: FormData) => {
    const response = await api.post(`/api/Comments/task/${taskId}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data.data as Comment;
  }
};

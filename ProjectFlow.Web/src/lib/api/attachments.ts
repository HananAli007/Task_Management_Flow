import api from '../api';
import { Attachment } from './tasks';

export enum AttachmentSourceType {
  Task = 'Task',
  Subtask = 'Subtask',
  Comment = 'Comment'
}

export const attachmentApi = {
  upload: async (files: FileList | File[], sourceType: AttachmentSourceType, sourceId: string) => {
    const formData = new FormData();
    Array.from(files).forEach(file => {
      formData.append('files', file);
    });
    formData.append('sourceType', sourceType);
    formData.append('sourceId', sourceId);

    const response = await api.post('/api/attachments/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data.data as Attachment[];
  },

  getBySource: async (sourceType: AttachmentSourceType, sourceId: string) => {
    const response = await api.get(`/api/attachments/${sourceType}/${sourceId}`);
    return response.data.data as Attachment[];
  },

  delete: async (id: string) => {
    const response = await api.delete(`/api/attachments/${id}`);
    return response.data;
  }
};

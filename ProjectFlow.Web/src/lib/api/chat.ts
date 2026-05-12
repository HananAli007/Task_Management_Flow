import api from '../api';

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  content: string;
  attachmentUrl?: string;
  messageType: string;
  sentAt: string;
  isRead: boolean;
}

export const chatApi = {
  getConversation: async (userId: string) => {
    const response = await api.get(`/api/Chat/${userId}`);
    return response.data.data as ChatMessage[];
  },
  uploadFile: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/api/Chat/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data.data;
  }
};

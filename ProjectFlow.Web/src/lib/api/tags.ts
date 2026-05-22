import api from "../api";

export interface Tag {
  id: string;
  name: string;
}

export interface CreateTagDto {
  name: string;
}

export const tagApi = {
  getAll: async (): Promise<Tag[]> => {
    const response = await api.get("/api/Tags");
    return response.data.data;
  },

  create: async (data: CreateTagDto): Promise<Tag> => {
    const response = await api.post("/api/Tags", data);
    return response.data.data;
  },

  assign: async (taskId: string, tagNames: string[]): Promise<void> => {
    await api.post(`/api/Tags/assign/${taskId}`, tagNames);
  }
};

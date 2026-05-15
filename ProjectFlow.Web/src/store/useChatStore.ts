import { create } from 'zustand';
import { User } from '@/lib/api/users';

interface ChatState {
  activeChatUser: User | null;
  setActiveChatUser: (user: User | null) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  activeChatUser: null,
  setActiveChatUser: (user) => set({ activeChatUser: user }),
}));

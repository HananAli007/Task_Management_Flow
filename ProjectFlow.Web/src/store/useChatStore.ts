import { create } from 'zustand';
import { User } from '@/lib/api/users';

export interface CallLog {
  id: string;
  userId: string;
  userName: string;
  avatarUrl?: string;
  type: 'incoming' | 'outgoing' | 'missed';
  timestamp: string;
  duration?: string;
}

interface ChatState {
  activeChatUser: User | null;
  setActiveChatUser: (user: User | null) => void;
  callHistory: CallLog[];
  addCallLog: (log: Omit<CallLog, 'id' | 'timestamp'>) => void;
  clearCallHistory: () => void;
  incomingCall: { callerId: string; callerName: string; callerAvatar?: string; sdpOffer: string } | null;
  setIncomingCall: (call: { callerId: string; callerName: string; callerAvatar?: string; sdpOffer: string } | null) => void;
  // Draft Message Support (WhatsApp-style)
  getDraft: (userId: string) => string;
  setDraft: (userId: string, text: string) => void;
  clearDraft: (userId: string) => void;
}

const DRAFT_STORAGE_KEY = 'PF_CHAT_DRAFTS';

const loadDrafts = (): Record<string, string> => {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY) || '{}');
  } catch { return {}; }
};

const saveDrafts = (drafts: Record<string, string>) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(drafts));
};

export const useChatStore = create<ChatState>((set, get) => {
  // Load initial history from localStorage if in client context
  const initialHistory = typeof window !== 'undefined'
    ? JSON.parse(localStorage.getItem('PF_CALL_HISTORY') || '[]')
    : [];

  return {
    activeChatUser: null,
    setActiveChatUser: (user) => set({ activeChatUser: user }),
    callHistory: initialHistory,
    incomingCall: null,
    setIncomingCall: (call) => set({ incomingCall: call }),
    addCallLog: (log) => set((state) => {
      const newLog: CallLog = {
        ...log,
        id: Math.random().toString(36).substring(2, 9),
        timestamp: new Date().toISOString(),
      };
      const updated = [newLog, ...state.callHistory].slice(0, 50); // Keep last 50 calls
      localStorage.setItem('PF_CALL_HISTORY', JSON.stringify(updated));
      return { callHistory: updated };
    }),
    clearCallHistory: () => set(() => {
      localStorage.removeItem('PF_CALL_HISTORY');
      return { callHistory: [] };
    }),
    // Draft Message Functions
    getDraft: (userId: string) => {
      const drafts = loadDrafts();
      return drafts[userId.toLowerCase()] || '';
    },
    setDraft: (userId: string, text: string) => {
      const drafts = loadDrafts();
      const key = userId.toLowerCase();
      if (text.trim()) {
        drafts[key] = text;
      } else {
        delete drafts[key];
      }
      saveDrafts(drafts);
    },
    clearDraft: (userId: string) => {
      const drafts = loadDrafts();
      delete drafts[userId.toLowerCase()];
      saveDrafts(drafts);
    },
  };
});

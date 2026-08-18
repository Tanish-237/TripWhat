import { create } from 'zustand';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  widgets?: Widget[];
  suggestions?: string[];
  changeSummary?: any[];
  classification?: string;
}

export interface Widget {
  type: string;
  data: any;
}

interface ChatStore {
  messages: ChatMessage[];
  conversationId: string | null;
  isLoading: boolean;
  agentStatus: string | null;
  error: string | null;
  streamingText: string;
  pendingInterrupt: any | null;

  setConversationId: (id: string | null) => void;
  addMessage: (msg: ChatMessage) => void;
  addMessages: (msgs: ChatMessage[]) => void;
  setMessages: (msgs: ChatMessage[]) => void;
  setLoading: (loading: boolean) => void;
  setAgentStatus: (status: string | null) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  appendStreamingText: (text: string) => void;
  setStreamingText: (text: string) => void;
  setPendingInterrupt: (payload: any | null) => void;
  reset: () => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  messages: [],
  conversationId: null,
  isLoading: false,
  agentStatus: null,
  error: null,
  streamingText: '',
  pendingInterrupt: null,

  setConversationId: (id) => set({ conversationId: id }),

  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),

  addMessages: (msgs) => set((s) => ({ messages: [...s.messages, ...msgs] })),

  setMessages: (msgs) => set({ messages: msgs }),

  setLoading: (loading) => set({ isLoading: loading }),

  setAgentStatus: (status) => set({ agentStatus: status }),

  setError: (error) => set({ error }),

  clearError: () => set({ error: null }),

  appendStreamingText: (text) => set((s) => ({ streamingText: s.streamingText + text })),

  setStreamingText: (text) => set({ streamingText: text }),

  setPendingInterrupt: (payload) => set({ pendingInterrupt: payload }),

  reset: () => set({ messages: [], conversationId: null, isLoading: false, agentStatus: null, error: null, streamingText: '', pendingInterrupt: null }),
}));

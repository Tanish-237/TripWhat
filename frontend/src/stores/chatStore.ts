import { create } from 'zustand';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  widgets?: Widget[];
  suggestions?: string[];
  changeSummary?: any[];
  classification?: string;
  toolActivities?: ToolActivity[];
}

export interface Widget {
  type: string;
  data: any;
}

export interface ToolActivity {
  callId: string;
  toolName: string;
  label: string;
  status: 'running' | 'finished' | 'error';
  summary?: string;
  error?: string | null;
}

interface ChatStore {
  messages: ChatMessage[];
  conversationId: string | null;
  isLoading: boolean;
  agentStatus: string | null;
  error: string | null;
  streamingText: string;
  toolActivities: ToolActivity[];
  /** Stores the last agent:response payload so components that miss the
   *  socket event (e.g. ChatPanel when socket wasn't joined yet) can
   *  react to it via a useEffect watching this field. */
  lastResponse: { data: any; ts: number } | null;

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
  addToolActivity: (activity: ToolActivity) => void;
  updateToolActivity: (callId: string, update: Partial<ToolActivity>) => void;
  clearToolActivities: () => void;
  getToolActivities: () => ToolActivity[];
  setLastResponse: (data: any) => void;
  reset: () => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  conversationId: null,
  isLoading: false,
  agentStatus: null,
  error: null,
  streamingText: '',
  toolActivities: [],
  lastResponse: null,

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

  addToolActivity: (activity) =>
    set((s) => {
      // Replace if callId already exists, otherwise append
      const existing = s.toolActivities.findIndex((a) => a.callId === activity.callId);
      if (existing >= 0) {
        const updated = [...s.toolActivities];
        updated[existing] = { ...updated[existing], ...activity };
        return { toolActivities: updated };
      }
      return { toolActivities: [...s.toolActivities, activity] };
    }),

  updateToolActivity: (callId, update) =>
    set((s) => ({
      toolActivities: s.toolActivities.map((a) =>
        a.callId === callId ? { ...a, ...update } : a
      ),
    })),

  clearToolActivities: () => set({ toolActivities: [] }),

  getToolActivities: () => get().toolActivities,

  setLastResponse: (data: any) => set({ lastResponse: { data, ts: Date.now() } }),

  reset: () => set({
    messages: [], conversationId: null, isLoading: false, agentStatus: null,
    error: null, streamingText: '', toolActivities: [], lastResponse: null,
  }),
}));

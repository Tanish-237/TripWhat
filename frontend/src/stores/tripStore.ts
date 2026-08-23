import { create } from 'zustand';
import { io, type Socket } from 'socket.io-client';
import { useChatStore } from './chatStore';
import { chatApi } from '../lib/api';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001';

export interface TripCity {
  name: string;
  order: number;
  nights?: number;
}

export interface TripDates {
  start: string;
  end: string;
  flexible: boolean;
  assumed?: boolean;
  roughMonth?: string;
  pending?: string;
}

export interface TripState {
  status: 'planning' | 'confirmed' | 'archived';
  cities: TripCity[];
  dates?: TripDates;
  duration?: number;
  travelers?: string;
  preferences?: string[];
  onboarding: {
    slotsFilled: string[];
    completed: boolean;
  };
  version: number;
  itinerary?: any;
}

export interface Trip {
  id: number;
  _id?: string;
  title?: string;
  tripState?: TripState;
  generatedItinerary?: any;
  cities?: any[];
  totalDays?: number;
  isUpcoming?: boolean;
  isCompleted?: boolean;
  tripStartDate?: string;
  tripEndDate?: string;
  chatHistory?: any[];
  conversationId?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface TripStore {
  trips: Trip[];
  currentTrip: Trip | null;
  tripState: TripState | null;
  loading: boolean;
  error: string | null;
  socket: Socket | null;
  socketConnected: boolean;
  pendingDiff: { tripState: TripState; changeSummary: any[] } | null;
  lastEventId: string | null;

  fetchTrips: () => Promise<void>;
  fetchTrip: (id: string) => Promise<void>;
  createTrip: (data: Partial<Trip>) => Promise<Trip>;
  updateTrip: (id: string, data: Partial<Trip>) => Promise<void>;
  deleteTrip: (id: string) => Promise<void>;
  setTripState: (state: TripState) => void;
  connectSocket: (conversationId?: string) => void;
  disconnectSocket: () => void;
  applyTripUpdate: (trip: Trip, changeSummary?: any[]) => void;
  setPendingDiff: (diff: { tripState: TripState; changeSummary: any[] } | null) => void;
  acceptDiff: () => void;
  rejectDiff: () => void;
  replayMissedEvents: (conversationId: string) => Promise<void>;
}

const getToken = () => localStorage.getItem('tripwhat_token');
const API_URL = import.meta.env.VITE_API_URL || '';

export const useTripStore = create<TripStore>((set, get) => ({
  trips: [],
  currentTrip: null,
  tripState: null,
  loading: false,
  error: null,
  socket: null,
  socketConnected: false,
  pendingDiff: null,
  lastEventId: null,

  fetchTrips: async () => {
    set({ loading: true, error: null });
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/api/saved-trips`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Failed to fetch trips (${res.status})`);
      const data = await res.json();
      const tripsList = Array.isArray(data) ? data : Array.isArray(data.savedTrips) ? data.savedTrips : Array.isArray(data.trips) ? data.trips : [];
      set({ trips: tripsList, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  fetchTrip: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/api/saved-trips/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Failed to fetch trip (${res.status})`);
      const data = await res.json();
      set({ currentTrip: data, tripState: data.tripState, loading: false });
      if (data.conversationId) {
        useChatStore.getState().setConversationId(data.conversationId);
      }
      // Restore chat history: prefer saved chatHistory, fall back to conversation DB
      if (data.chatHistory?.length) {
        useChatStore.getState().setMessages(data.chatHistory);
      } else if (data.conversationId) {
        try {
          const histRes = await chatApi.getHistory(data.conversationId);
          if (histRes.data?.messages?.length) {
            useChatStore.getState().setMessages(histRes.data.messages);
          }
        } catch {
          // Conversation may not exist — ignore
        }
      }
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  createTrip: async (data: Partial<Trip>) => {
    set({ loading: true, error: null });
    try {
      const token = getToken();
      const ts = (data.tripState || {}) as TripState;
      const { messages, conversationId } = useChatStore.getState();
      const payload = {
        title: data.title || ts.cities?.map((c: any) => c.name).join(' → ') || 'Untitled trip',
        startDate: ts.dates?.start || new Date().toISOString(),
        cities: (ts.cities || []).map((c: any) => ({ name: c.name, days: c.nights ? c.nights + 1 : 1 })),
        totalDays: ts.duration || 1,
        people: 1,
        travelType: 'balanced',
        budget: null,
        generatedItinerary: ts.itinerary || { days: [] },
        tripState: ts,
        chatHistory: messages.map((m) => ({ role: m.role, content: m.content, timestamp: m.timestamp })),
        conversationId: conversationId,
      };
      const res = await fetch(`${API_URL}/api/saved-trips`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Failed to create trip (${res.status})`);
      const result = await res.json();
      const trip = result.savedTrip || result;
      set({ currentTrip: trip, tripState: trip.tripState || ts, loading: false });
      return trip;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  updateTrip: async (id: string, data: Partial<Trip>) => {
    try {
      const token = getToken();
      const { messages, conversationId } = useChatStore.getState();
      const payload = {
        ...data,
        chatHistory: messages.map((m) => ({ role: m.role, content: m.content, timestamp: m.timestamp })),
        conversationId: conversationId,
      };
      const res = await fetch(`${API_URL}/api/saved-trips/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Failed to update trip (${res.status})`);
      const result = await res.json();
      const updated = result.savedTrip || result;
      set({ currentTrip: updated, tripState: updated.tripState });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  deleteTrip: async (id: string) => {
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/api/saved-trips/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Failed to delete trip (${res.status})`);
      set((s) => ({ trips: s.trips.filter((t) => String(t.id) !== id) }));
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  setTripState: (state: TripState) => set({ tripState: state }),

  connectSocket: (conversationId?: string) => {
    const existing = get().socket;
    if (existing) {
      if (conversationId) {
        // Replay missed events before joining the room — events may have been
        // emitted between send_message starting the background task and us
        // joining the room.
        get().replayMissedEvents(conversationId).then(() => {
          existing.emit('join:conversation', conversationId);
        });
      }
      return;
    }

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', async () => {
      set({ socketConnected: true });
      if (conversationId) {
        // Replay missed events before joining the room for live updates
        await get().replayMissedEvents(conversationId);
        socket.emit('join:conversation', conversationId);
      }
    });

    socket.on('disconnect', () => {
      set({ socketConnected: false });
    });

    socket.on('reconnect', async () => {
      set({ socketConnected: true });
      if (conversationId) {
        await get().replayMissedEvents(conversationId);
        socket.emit('join:conversation', conversationId);
      }
    });

    socket.on('trip:updated', (data: { trip: Trip; changeSummary?: any[] }) => {
      if (data.changeSummary && data.changeSummary.length > 0) {
        // Intercept as pending diff — user must accept/reject
        set({
          pendingDiff: {
            tripState: data.trip.tripState || data.trip as any,
            changeSummary: data.changeSummary,
          },
        });
      } else {
        get().applyTripUpdate(data.trip, data.changeSummary);
      }
    });

    // Streaming events from agent
    socket.on('agent:token', (data: { conversationId: string; text: string; eventId?: string }) => {
      if (data.eventId) set({ lastEventId: data.eventId });
      useChatStore.getState().appendStreamingText(data.text);
    });

    socket.on('agent:status', (data: { conversationId: string; status: string }) => {
      useChatStore.getState().setAgentStatus(data.status);
    });

    socket.on('agent:tripState', (data: { conversationId: string; tripState: any; changeSummary?: any[] }) => {
      if (data.tripState) {
        if (data.changeSummary && data.changeSummary.length > 0) {
          set({
            pendingDiff: {
              tripState: data.tripState,
              changeSummary: data.changeSummary,
            },
          });
        } else {
          get().setTripState(data.tripState);
        }
      }
    });

    socket.on('agent:response', (data: any) => {
      const chatStore = useChatStore.getState();
      chatStore.setStreamingText('');
      chatStore.setLoading(false);
      chatStore.setAgentStatus(null);

      if (data.conversationId && !chatStore.conversationId) {
        chatStore.setConversationId(data.conversationId);
      }

      if (data.tripState) {
        get().setTripState(data.tripState);
      }
    });

    set({ socket });
  },

  disconnectSocket: () => {
    // Keep socket alive — only disconnect on explicit logout.
    // Component unmounts should NOT kill the stream.
  },

  replayMissedEvents: async (conversationId: string) => {
    try {
      const { lastEventId } = get();
      const res = await chatApi.getStreamEvents(conversationId, lastEventId || undefined);
      const { events, isActive, lastEventId: newLastId } = res.data;

      if (!events || events.length === 0) {
        if (!isActive) {
          // Stream is done — clear any stale loading state
          useChatStore.getState().setLoading(false);
          useChatStore.getState().setAgentStatus(null);
        }
        return;
      }

      const chatStore = useChatStore.getState();

      // If stream is still active, set loading state
      if (isActive) {
        chatStore.setLoading(true);
        chatStore.setAgentStatus('Reconnecting to stream...');
      }

      for (const event of events) {
        const data = event.data;
        switch (event.type) {
          case 'token':
            chatStore.appendStreamingText(data.text || '');
            break;
          case 'status':
            chatStore.setAgentStatus(data.status || '');
            break;
          case 'tripState':
            if (data.tripState) {
              get().setTripState(data.tripState);
            }
            break;
          case 'widget':
            // Widget events from ask_question tool — handled by ChatPanel
            break;
          case 'response':
            chatStore.setStreamingText('');
            chatStore.setLoading(false);
            chatStore.setAgentStatus(null);
            if (data.tripState) {
              get().setTripState(data.tripState);
            }
            break;
        }
      }

      if (newLastId) {
        set({ lastEventId: newLastId });
      }
    } catch (err) {
      console.warn('[tripStore] Failed to replay missed events:', err);
    }
  },

  applyTripUpdate: (trip: Trip, changeSummary?: any[]) => {
    set({ currentTrip: trip, tripState: trip.tripState });
    if (changeSummary) {
      useTripStore.getState();
    }
  },

  setPendingDiff: (diff) => set({ pendingDiff: diff }),

  acceptDiff: () => {
    const { pendingDiff } = get();
    if (pendingDiff) {
      set({ tripState: pendingDiff.tripState, pendingDiff: null });
    }
  },

  rejectDiff: () => set({ pendingDiff: null }),
}));

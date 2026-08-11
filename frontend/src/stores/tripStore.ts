import { create } from 'zustand';
import { io, type Socket } from 'socket.io-client';

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
  _id: string;
  tripId: string;
  userId: string;
  title?: string;
  tripState: TripState;
  createdAt: string;
  updatedAt: string;
}

interface TripStore {
  trips: Trip[];
  currentTrip: Trip | null;
  tripState: TripState | null;
  loading: boolean;
  error: string | null;
  socket: Socket | null;
  socketConnected: boolean;

  fetchTrips: () => Promise<void>;
  fetchTrip: (id: string) => Promise<void>;
  createTrip: (data: Partial<Trip>) => Promise<Trip>;
  updateTrip: (id: string, data: Partial<Trip>) => Promise<void>;
  deleteTrip: (id: string) => Promise<void>;
  setTripState: (state: TripState) => void;
  connectSocket: (conversationId?: string) => void;
  disconnectSocket: () => void;
  applyTripUpdate: (trip: Trip, changeSummary?: any[]) => void;
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

  fetchTrips: async () => {
    set({ loading: true, error: null });
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/api/saved-trips`, {
        headers: { Authorization: `Bearer ${token}` },
      });
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
      const data = await res.json();
      set({ currentTrip: data, tripState: data.tripState, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  createTrip: async (data: Partial<Trip>) => {
    set({ loading: true, error: null });
    try {
      const token = getToken();
      const ts = (data.tripState || {}) as TripState;
      const payload = {
        title: data.title || ts.cities?.map((c: any) => c.name).join(' → ') || 'Untitled trip',
        startDate: ts.dates?.start || new Date().toISOString(),
        cities: ts.cities || [],
        totalDays: ts.duration || 1,
        people: ts.travelers || '1',
        travelType: ts.preferences?.join(', ') || 'cultural',
        budget: 'mid-range',
        generatedItinerary: ts.itinerary || { days: [] },
        tripState: ts,
      };
      const res = await fetch(`${API_URL}/api/saved-trips`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
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
      const res = await fetch(`${API_URL}/api/saved-trips/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      const updated = await res.json();
      set({ currentTrip: updated, tripState: updated.tripState });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  deleteTrip: async (id: string) => {
    try {
      const token = getToken();
      await fetch(`${API_URL}/api/saved-trips/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      set((s) => ({ trips: s.trips.filter((t) => t._id !== id) }));
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  setTripState: (state: TripState) => set({ tripState: state }),

  connectSocket: (conversationId?: string) => {
    const existing = get().socket;
    if (existing) {
      if (conversationId) {
        existing.emit('join:conversation', conversationId);
      }
      return;
    }

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      set({ socketConnected: true });
      if (conversationId) {
        socket.emit('join:conversation', conversationId);
      }
    });

    socket.on('disconnect', () => {
      set({ socketConnected: false });
    });

    socket.on('trip:updated', (data: { trip: Trip; changeSummary?: any[] }) => {
      get().applyTripUpdate(data.trip, data.changeSummary);
    });

    set({ socket });
  },

  disconnectSocket: () => {
    const socket = get().socket;
    if (socket) {
      socket.disconnect();
      set({ socket: null, socketConnected: false });
    }
  },

  applyTripUpdate: (trip: Trip, changeSummary?: any[]) => {
    set({ currentTrip: trip, tripState: trip.tripState });
    if (changeSummary) {
      useTripStore.getState();
    }
  },
}));

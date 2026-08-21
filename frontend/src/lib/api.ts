import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('tripwhat_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('tripwhat_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export { api };

export const authApi = {
  register: (data: { name: string; email: string; password: string }) =>
    api.post('/api/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/api/auth/login', data),
  me: () => api.get('/api/auth/me'),
  updateProfile: (data: any) => api.put('/api/auth/profile', data),
};

export const chatApi = {
  sendMessage: (data: { message: string; conversationId?: string; currentItinerary?: any }) =>
    api.post('/api/chat', data),
  resumeAgent: (data: { message: string; conversationId: string }) =>
    api.post('/api/chat/resume', data),
  getHistory: (conversationId: string) =>
    api.get(`/api/chat/${conversationId}`),
  getStreamEvents: (conversationId: string, after?: string) =>
    api.get(`/api/chat/stream/${conversationId}`, { params: { after: after || '0' } }),
};

export const tripsApi = {
  list: () => api.get('/api/saved-trips'),
  get: (id: string) => api.get(`/api/saved-trips/${id}`),
  create: (data: any) => api.post('/api/saved-trips', data),
  update: (id: string, data: any) => api.put(`/api/saved-trips/${id}`, data),
  delete: (id: string) => api.delete(`/api/saved-trips/${id}`),
  upcoming: () => api.get('/api/saved-trips/upcoming'),
  completed: () => api.get('/api/saved-trips/completed'),
  statistics: () => api.get('/api/saved-trips/statistics'),
  markUpcoming: (id: string, data?: any) => api.put(`/api/saved-trips/${id}/upcoming`, data),
  removeUpcoming: (id: string) => api.delete(`/api/saved-trips/${id}/upcoming`),
  markCompleted: (id: string) => api.put(`/api/saved-trips/${id}/completed`),
  checkSaved: (params: Record<string, string>) =>
    api.get('/api/saved-trips/check', { params }),
};

export const savedApi = {
  list: () => api.get('/api/saved'),
  save: (data: { itemType: string; name: string; data?: any; tripId?: number }) =>
    api.post('/api/saved', data),
  remove: (id: number) => api.delete(`/api/saved/${id}`),
};

export const placesApi = {
  search: (query: string, limit = 5) =>
    api.get('/api/places/search', { params: { query, limit } }),
  autocomplete: (query: string, limit = 8) =>
    api.get('/api/places/autocomplete', { params: { query, limit } }),
  details: (placeId: string) =>
    api.get('/api/places/details', { params: { placeId } }),
};

export const calendarApi = {
  oauthUrl: () => api.get('/api/google/oauth/url'),
  upcoming: () => api.get('/api/google/calendar/upcoming'),
  createEvent: (payload: any) => api.post('/api/google/calendar/events', payload),
};

export const gmailApi = {
  oauthUrl: () => api.get('/api/google/gmail/oauth/url'),
  status: () => api.get('/api/google/gmail/status'),
  bookings: () => api.get('/api/google/gmail/bookings'),
};

export function saveToken(token: string) {
  localStorage.setItem('tripwhat_token', token);
}

export function getToken() {
  return localStorage.getItem('tripwhat_token');
}

export function clearToken() {
  localStorage.removeItem('tripwhat_token');
}

// Use environment variable if available, otherwise fallback to port 8080
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = data?.message || "Request failed";
    const error = new Error(message);
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}

export async function apiRegister({ name, email, password }) {
  return request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
}

export async function apiLogin({ email, password }) {
  return request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function apiMe(token) {
  return request("/api/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function saveToken(token) {
  localStorage.setItem("tripwhat_token", token);
}

export function getToken() {
  return localStorage.getItem("tripwhat_token");
}

export function clearToken() {
  localStorage.removeItem("tripwhat_token");
}

// Trip APIs
export async function apiCreateTrip(payload, token) {
  return request("/api/trips", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}

export async function apiListTrips(token) {
  return request("/api/trips", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

// Saved Trips APIs
export async function apiSaveTrip(payload, token) {
  return request("/api/saved-trips", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}

export async function apiGetSavedTrips(token, params = {}) {
  const queryParams = new URLSearchParams(params).toString();
  const url = queryParams
    ? `/api/saved-trips?${queryParams}`
    : "/api/saved-trips";

  return request(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function apiGetSavedTrip(id, token) {
  return request(`/api/saved-trips/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function apiSearchPlaces(query, limit = 5) {
  return request(`/api/places/search?query=${encodeURIComponent(query)}&limit=${limit}`);
}

export async function apiGetLocationSuggestions(query, limit = 8) {
  return request(`/api/places/autocomplete?query=${encodeURIComponent(query)}&limit=${limit}`);
}

export async function apiUpdateSavedTrip(id, payload, token) {
  return request(`/api/saved-trips/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}

export async function apiDeleteSavedTrip(id, token) {
  return request(`/api/saved-trips/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function apiCheckTripSaved(params, token) {
  const queryParams = new URLSearchParams(params).toString();
  return request(`/api/saved-trips/check?${queryParams}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

// Upcoming Trips APIs
export async function apiGetUpcomingTrips(token, params = {}) {
  const queryParams = new URLSearchParams(params).toString();
  const url = queryParams
    ? `/api/saved-trips/upcoming?${queryParams}`
    : "/api/saved-trips/upcoming";

  return request(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function apiMarkTripAsUpcoming(id, payload, token) {
  return request(`/api/saved-trips/${id}/upcoming`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}

export async function apiRemoveTripFromUpcoming(id, token) {
  return request(`/api/saved-trips/${id}/upcoming`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

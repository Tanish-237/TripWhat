const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

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

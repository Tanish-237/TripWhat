import React, { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("tripwhat_token");
    if (token) {
      // Verify token and get user info
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const token = localStorage.getItem("tripwhat_token");
      
      console.log("[AUTH] Fetching user with token:", token ? "Token found" : "No token");

      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      console.log("[AUTH] Fetch user response:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("[AUTH] User data received:", data);
        // Backend returns { user: { id, name, email } }
        setUser(data.user);
      } else {
        console.log("[AUTH] Invalid token, removing from storage");
        localStorage.removeItem("tripwhat_token");
      }
    } catch (error) {
      console.error("[AUTH] Failed to fetch user:", error);
      localStorage.removeItem("tripwhat_token");
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
    
    console.log("[AUTH] Attempting login for email:", email);

    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    console.log("[AUTH] Login response:", response.status);

    if (!response.ok) {
      const error = await response.json();
      console.error("[AUTH] Login failed:", error);
      throw new Error(error.error || "Login failed");
    }

    const { token, user } = await response.json();
    console.log("[AUTH] Login successful, storing token and user:", { token: !!token, user });

    localStorage.setItem("tripwhat_token", token);
    setUser(user);
  };

  const signup = async (email, password, preferences) => {
    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password, preferences }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Signup failed");
    }

    const { token, user } = await response.json();

    localStorage.setItem("tripwhat_token", token);
    setUser(user);
  };

  const logout = () => {
    localStorage.removeItem("tripwhat_token");
    setUser(null);
  };

  const value = {
    user,
    login,
    signup,
    logout,
    loading,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
import React, { createContext, useContext, useEffect, useState } from "react";

interface User {
  id: string;
  email: string;
  preferences?: {
    budget: string;
    travelStyle: string;
    interests: string[];
  };
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, preferences?: any) => Promise<void>;
  logout: () => void;
  loading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
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

      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        localStorage.removeItem("tripwhat_token");
      }
    } catch (error) {
      console.error("Failed to fetch user:", error);
      localStorage.removeItem("tripwhat_token");
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Login failed");
    }

    const { token, user } = await response.json();

    localStorage.setItem("tripwhat_token", token);
    setUser(user);
  };

  const signup = async (email: string, password: string, preferences?: any) => {
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

  const value: AuthContextType = {
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

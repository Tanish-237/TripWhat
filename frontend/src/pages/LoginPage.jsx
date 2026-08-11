import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Mail, Lock, Compass } from "lucide-react";

export default function LoginPage() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login, isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate("/trips", { replace: true });
    }
  }, [navigate, isAuthenticated, loading]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      if (!formData.email || !formData.password) throw new Error("All fields are required");
      const user = await login(formData.email, formData.password);
      if (user) navigate("/trips", { replace: true });
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-[var(--muted)]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col">
      {/* Minimal top bar */}
      <header className="flex items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[var(--peach)]">
            <Compass className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-semibold text-[var(--ink)]">TripWhat</span>
        </Link>
        <Link
          to="/signup"
          className="text-sm font-medium text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
        >
          Sign up
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold text-[var(--ink)] tracking-tight">
            Welcome back
          </h1>
          <p className="text-[var(--muted)] text-sm mt-1">
            Log in to continue planning your journeys
          </p>
        </div>

        <div className="rounded-xl bg-[var(--surface)] border border-[var(--border)] p-6 shadow-[var(--shadow-soft)]">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-2.5 text-sm text-red-600 bg-red-50 rounded-lg">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-medium text-[var(--ink)]">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted)]" />
                <input
                  id="email"
                  name="email"
                  type="text"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                  className="w-full h-10 pl-10 pr-3 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--muted)] transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-medium text-[var(--ink)]">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted)]" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                  className="w-full h-10 pl-10 pr-3 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--muted)] transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 rounded-lg bg-[var(--ink)] text-white text-sm font-medium hover:bg-[#292524] transition-colors disabled:opacity-50"
            >
              {isLoading ? "Logging in..." : "Log in"}
            </button>

            <div className="text-center text-xs text-[var(--muted)]">
              Don't have an account?{" "}
              <Link to="/signup" className="text-[var(--peach)] font-medium hover:opacity-80 transition-opacity">
                Sign up
              </Link>
            </div>
          </form>
        </div>
      </div>
      </div>
    </div>
  );
}

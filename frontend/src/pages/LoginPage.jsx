import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Mail, Lock } from "lucide-react";
import { GrainOverlay } from "../components/GrainOverlay.jsx";
import { AmbientBlobs } from "../components/AmbientBlobs.jsx";

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
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="animate-pulse text-[var(--muted)]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] relative flex items-center justify-center p-4">
      <GrainOverlay />
      <AmbientBlobs />
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[var(--ink)] tracking-tight">
            Welcome back
          </h1>
          <p className="text-[var(--muted)] text-sm mt-2">
            Log in to continue planning your journeys
          </p>
        </div>

        <div
          className="rounded-[2rem] bg-[var(--surface)] p-8"
          style={{ boxShadow: "0 4px 20px -2px rgba(0,0,0,0.05)" }}
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-[1.25rem]">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-[var(--ink)]">
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
                  className="w-full h-11 pl-10 pr-4 rounded-[1.25rem] border border-[rgba(41,37,36,0.06)] bg-[var(--bg)] text-sm text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--peach)] transition-all duration-300"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-[var(--ink)]">
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
                  className="w-full h-11 pl-10 pr-4 rounded-[1.25rem] border border-[rgba(41,37,36,0.06)] bg-[var(--bg)] text-sm text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--peach)] transition-all duration-300"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 rounded-[1.25rem] bg-[var(--peach)] text-white text-sm font-medium hover:opacity-90 transition-opacity duration-300 disabled:opacity-50"
            >
              {isLoading ? "Logging in..." : "Log in"}
            </button>

            <div className="text-center text-sm text-[var(--muted)]">
              Don't have an account?{" "}
              <Link to="/signup" className="text-[var(--peach)] font-medium hover:opacity-80 transition-opacity">
                Sign up
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

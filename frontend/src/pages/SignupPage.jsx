import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { User, Mail, Lock, Compass } from "lucide-react";

export default function SignupPage() {
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [emailExists, setEmailExists] = useState(false);
  const navigate = useNavigate();
  const { signup } = useAuth();

  useEffect(() => {
    const token = localStorage.getItem("tripwhat_token");
    if (token) navigate("/trips", { replace: true });
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError("");
    if (emailExists) setEmailExists(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setEmailExists(false);
    try {
      if (!formData.name || !formData.email || !formData.password) throw new Error("All fields are required");
      if (formData.password.length < 6) throw new Error("Password must be at least 6 characters long");
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) throw new Error("Please enter a valid email address");
      await signup(formData.email, formData.password, { name: formData.name });
      navigate("/trips", { replace: true });
    } catch (err) {
      const msg = err.message || "Signup failed";
      setError(msg);
      if (msg.toLowerCase().includes("already exists") || msg.toLowerCase().includes("already registered")) {
        setEmailExists(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

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
          to="/login"
          className="text-sm font-medium text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
        >
          Log in
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold text-[var(--ink)] tracking-tight">
            Create your account
          </h1>
          <p className="text-[var(--muted)] text-sm mt-1">
            Join TripWhat and start planning your journeys
          </p>
        </div>

        <div className="rounded-xl bg-[var(--surface)] border border-[var(--border)] p-6 shadow-[var(--shadow-soft)]">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-2.5 text-sm text-red-600 bg-red-50 rounded-lg">
                {error}
              </div>
            )}

            {emailExists && (
              <div className="p-3 text-sm rounded-lg bg-amber-50 border border-amber-200">
                <p className="text-amber-800 font-medium">This email is already registered.</p>
                <p className="text-amber-700 mt-1">
                  Would you like to{" "}
                  <Link to="/login" className="font-semibold underline hover:text-amber-900">
                    sign in instead
                  </Link>
                  ?
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="name" className="text-xs font-medium text-[var(--ink)]">Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted)]" />
                <input
                  id="name" name="name" type="text" placeholder="Your full name"
                  value={formData.name} onChange={handleChange} required disabled={isLoading}
                  className="w-full h-10 pl-10 pr-3 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--muted)] transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-medium text-[var(--ink)]">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted)]" />
                <input
                  id="email" name="email" type="email" placeholder="you@example.com"
                  value={formData.email} onChange={handleChange} required disabled={isLoading}
                  className="w-full h-10 pl-10 pr-3 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--muted)] transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-medium text-[var(--ink)]">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted)]" />
                <input
                  id="password" name="password" type="password" placeholder="Create a password"
                  value={formData.password} onChange={handleChange} required disabled={isLoading} minLength={6}
                  className="w-full h-10 pl-10 pr-3 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--muted)] transition-colors"
                />
              </div>
              <p className="text-xs text-[var(--muted)]">Password must be at least 6 characters long</p>
            </div>

            <button
              type="submit" disabled={isLoading}
              className="w-full h-10 rounded-lg bg-[var(--ink)] text-white text-sm font-medium hover:bg-[#292524] transition-colors disabled:opacity-50"
            >
              {isLoading ? "Creating account..." : "Create account"}
            </button>

            <div className="text-center text-xs text-[var(--muted)]">
              Already have an account?{" "}
              <Link to="/login" className="text-[var(--peach)] font-medium hover:opacity-80 transition-opacity">
                Log in
              </Link>
            </div>
          </form>
        </div>
      </div>
      </div>
    </div>
  );
}

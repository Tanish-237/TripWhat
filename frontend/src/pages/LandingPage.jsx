import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Compass, Mic, ArrowUp, MapPin } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

const SUGGESTIONS = [
  { label: "Paris", sub: "3 days", img: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=200&h=200&fit=crop" },
  { label: "Tokyo", sub: "7 days", img: "https://images.unsplash.com/photo-1554797589-7241bb691973?w=200&h=200&fit=crop" },
  { label: "Bali", sub: "5 days", img: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=200&h=200&fit=crop" },
  { label: "Iceland", sub: "6 days", img: "https://images.unsplash.com/photo-1535941339077-2dd1c7963098?w=200&h=200&fit=crop" },
  { label: "New York", sub: "4 days", img: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=200&h=200&fit=crop" },
];

export default function LandingPage() {
  const [query, setQuery] = useState("");
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = () => {
    if (!query.trim()) return;
    if (isAuthenticated) {
      navigate(`/new?q=${encodeURIComponent(query.trim())}`);
    } else {
      navigate("/signup");
    }
  };

  const handleSuggestion = (label) => {
    if (isAuthenticated) {
      navigate(`/new?q=${encodeURIComponent(`Plan a trip to ${label}`)}`);
    } else {
      navigate("/signup");
    }
  };

  return (
    <main className="min-h-screen bg-[var(--bg)] flex flex-col">
      {/* Minimal top bar */}
      <header className="relative z-20 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[var(--peach)]">
            <Compass className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-semibold text-[var(--ink)]">TripWhat</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-sm font-medium text-[var(--muted)] hover:text-[var(--ink)] transition-colors">
            Log in
          </Link>
          <Link
            to="/signup"
            className="px-4 py-2 rounded-lg bg-[var(--ink)] text-white text-sm font-medium hover:bg-[#292524] transition-colors"
          >
            Sign up
          </Link>
        </div>
      </header>

      {/* Centered composer */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <h1 className="text-2xl md:text-3xl font-semibold text-[var(--ink)] tracking-tight mb-1">
          Where are you headed?
        </h1>
        <p className="text-sm text-[var(--muted)] mb-8">
          Tell us about your trip and we'll plan the rest.
        </p>

        {/* Composer */}
        <div className="w-full max-w-[560px] relative">
          <div className="flex items-center gap-2 bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-[var(--shadow-soft)] px-4 py-3 focus-within:border-[var(--muted)] transition-colors">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="Plan a trip to Paris for two..."
              className="flex-1 bg-transparent text-sm text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none"
              autoFocus
            />
            <button className="p-1.5 rounded-lg text-[var(--muted)] hover:bg-[var(--sage)] transition-colors" title="Voice input">
              <Mic className="w-4 h-4" />
            </button>
            <button
              onClick={handleSubmit}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--ink)] text-white hover:bg-[#292524] transition-colors disabled:opacity-30"
              disabled={!query.trim()}
              title="Send"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Destination suggestions */}
        <div className="flex gap-3 mt-8 flex-wrap justify-center max-w-[640px]">
          {SUGGESTIONS.map((s) => (
            <button
              key={s.label}
              onClick={() => handleSuggestion(s.label)}
              className="group flex flex-col items-center gap-1.5"
            >
              <div className="w-16 h-16 rounded-xl overflow-hidden border border-[var(--border)] group-hover:shadow-[var(--shadow-soft-hover)] transition-shadow">
                <img src={s.img} alt={s.label} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              </div>
              <span className="text-xs font-medium text-[var(--ink)]">{s.label}</span>
              <span className="text-[10px] text-[var(--muted)] -mt-1">{s.sub}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="px-6 py-6 text-center">
        <p className="text-xs text-[var(--muted)]">
          TripWhat — your AI travel workspace
        </p>
      </footer>
    </main>
  );
}

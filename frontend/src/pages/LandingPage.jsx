import { Link } from "react-router-dom";
import { MapPin, Plane, Sparkles } from "lucide-react";
import { GrainOverlay } from "../components/GrainOverlay.jsx";
import { AmbientBlobs } from "../components/AmbientBlobs.jsx";
import { useReveal } from "../hooks/useReveal";

export default function LandingPage() {
  const { ref: heroRef, visible: heroVisible } = useReveal();
  const { ref: featuresRef, visible: featuresVisible } = useReveal();

  return (
    <main className="min-h-screen bg-[var(--bg)] relative">
      <GrainOverlay />
      <AmbientBlobs />

      {/* Header */}
      <header className="relative z-10 max-w-6xl mx-auto flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2 text-xl font-bold text-[var(--ink)]">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--peach)]">
            <MapPin className="w-4 h-4 text-white" />
          </div>
          TripWhat
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="text-sm font-medium text-[var(--ink)] hover:text-[var(--peach)] transition-colors duration-300"
          >
            Log in
          </Link>
          <Link
            to="/signup"
            className="px-5 py-2 rounded-[1.25rem] bg-[var(--peach)] text-white text-sm font-medium hover:opacity-90 transition-opacity duration-300"
          >
            Sign up
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section
        ref={heroRef}
        className="relative z-10 px-6 py-24 md:py-32 text-center"
        style={{
          opacity: heroVisible ? 1 : 0,
          transform: heroVisible ? "translateY(0)" : "translateY(30px)",
          transition: "opacity 0.8s ease-out, transform 0.8s ease-out",
        }}
      >
        <div className="max-w-3xl mx-auto space-y-6">
          <p className="text-sm text-[var(--muted)]" style={{ fontFamily: "var(--font-accent)" }}>
            your digital living room for travel
          </p>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-[var(--ink)] leading-tight">
            Plan your perfect journey
          </h1>
          <p className="text-lg md:text-xl text-[var(--muted)] leading-relaxed max-w-2xl mx-auto">
            Chat with an AI travel companion that builds personalized itineraries
            with real-time weather, optimal routes, and local recommendations.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
            <Link
              to="/signup"
              className="px-8 py-3.5 rounded-[1.25rem] bg-[var(--peach)] text-white text-base font-medium hover:opacity-90 transition-opacity duration-300"
            >
              Start planning
            </Link>
            <Link
              to="/login"
              className="px-8 py-3.5 rounded-[1.25rem] bg-[var(--surface)] text-[var(--ink)] text-base font-medium hover:bg-[var(--sage)] transition-colors duration-300"
              style={{ boxShadow: "0 4px 20px -2px rgba(0,0,0,0.05)" }}
            >
              I have an account
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section
        ref={featuresRef}
        className="relative z-10 px-6 py-16 md:py-24"
        style={{
          opacity: featuresVisible ? 1 : 0,
          transform: featuresVisible ? "translateY(0)" : "translateY(30px)",
          transition: "opacity 0.8s ease-out, transform 0.8s ease-out",
        }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                icon: <Plane className="w-6 h-6 text-[var(--peach)]" />,
                title: "Chat-first planning",
                desc: "Tell the AI where you want to go. It handles dates, routes, and daily plans.",
              },
              {
                icon: <MapPin className="w-6 h-6 text-[var(--peach)]" />,
                title: "Interactive maps",
                desc: "See your itinerary come to life with Google Maps integration and city-by-city breakdowns.",
              },
              {
                icon: <Sparkles className="w-6 h-6 text-[var(--peach)]" />,
                title: "Smart suggestions",
                desc: "Get real-time weather, local events, and curated recommendations for every day of your trip.",
              },
            ].map((card, idx) => (
              <div
                key={idx}
                className="rounded-[2rem] bg-[var(--surface)] p-8"
                style={{ boxShadow: "0 4px 20px -2px rgba(0,0,0,0.05)" }}
              >
                <div className="w-12 h-12 rounded-[1.25rem] bg-[var(--sage)] flex items-center justify-center mb-4">
                  {card.icon}
                </div>
                <h3 className="text-lg font-semibold text-[var(--ink)] mb-2">
                  {card.title}
                </h3>
                <p className="text-sm text-[var(--muted)] leading-relaxed">
                  {card.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 px-6 py-24 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-[var(--ink)] tracking-tight mb-4">
            Ready to explore?
          </h2>
          <p className="text-[var(--muted)] mb-8">
            Join TripWhat and start planning your next adventure today.
          </p>
          <Link
            to="/signup"
            className="inline-block px-8 py-3.5 rounded-[1.25rem] bg-[var(--peach)] text-white text-base font-medium hover:opacity-90 transition-opacity duration-300"
          >
            Get started for free
          </Link>
        </div>
      </section>
    </main>
  );
}

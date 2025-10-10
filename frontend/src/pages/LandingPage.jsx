import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { MapPin } from "lucide-react";

export default function LandingPage() {
  return (
    <main className="min-h-screen relative">
      {/* Custom landing page header */}
      <div className="fixed top-0 left-0 w-full z-50 shadow-md bg-white">
        <header className="max-w-7xl mx-auto flex items-center justify-between px-6 md:px-10 py-4">
          <div className="flex items-center gap-3 text-xl md:text-2xl font-bold text-black">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-pink-500 shadow-md">
              <MapPin className="w-4 h-4 text-white" />
            </div>
            TripWhat
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" asChild>
              <Link to="/login" className="text-black">
                Login
              </Link>
            </Button>
            <Button asChild className="bg-black">
              <Link className="text-white" to="/signup">
                Sign Up
              </Link>
            </Button>
          </div>
        </header>
      </div>

      <div className="pt-16">
        {/* Hero Section */}
        <section className="px-6 md:px-10 py-52 md:py-40 text-center bg-gradient-to-br from-slate-50 via-blue-50/80 to-purple-50 relative overflow-hidden">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            className="max-w-3xl mx-auto space-y-6"
          >
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight">
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Plan Your
              </span>
              <br />
              <span className="text-slate-800">Perfect Journey</span>
            </h1>
            <p className="text-slate-600 text-xl md:text-2xl leading-relaxed max-w-3xl mx-auto font-medium">
              Create personalized itineraries with{" "}
              <span className="text-blue-600 font-semibold">
                real-time weather
              </span>
              , optimal routes, and local events. Let AI handle the details
              while you dream about the adventure.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
              <Button
                asChild
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-10 py-4 text-lg font-semibold shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 rounded-xl"
              >
                <Link to="/plan">Start Planning →</Link>
              </Button>
              <Button
                variant="outline"
                asChild
                className="border-2 border-slate-300 bg-white/50 backdrop-blur-sm text-slate-700 hover:bg-white hover:border-purple-300 hover:text-purple-700 px-10 py-4 text-lg font-semibold transition-all duration-300 rounded-xl"
              >
                <Link to="/destinations">Explore Destinations</Link>
              </Button>
            </div>
          </motion.div>

          {/* Animated background shapes */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 60, ease: "linear" }}
            className="absolute -top-20 -left-20 w-60 h-60 bg-foreground/10 rounded-full blur-3xl"
          />
          <motion.div
            animate={{ y: [0, 20, 0] }}
            transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }}
            className="absolute -bottom-20 -right-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl"
          />
        </section>

        {/* Image Grid Section */}
        <section className="px-6 md:px-10 py-16">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-4"
            >
              {[
                {
                  src: "/coastal-road-trip-scenic-view.jpg",
                  alt: "Scenic coastal route preview",
                },
                {
                  src: "/city-night-events-festival.jpg",
                  alt: "City events and nightlife",
                },
                { src: "/mountain-hotel-stay.jpg", alt: "Mountain hotel" },
                { src: "/local-food-market.jpg", alt: "Local food market" },
              ].map((img, idx) => (
                <img
                  key={idx}
                  src={img.src}
                  alt={img.alt}
                  className="rounded-xl border object-cover aspect-[4/3] shadow-lg hover:scale-105 transition-transform duration-300 cursor-pointer"
                />
              ))}
            </motion.div>
          </div>
        </section>

        {/* How it works Section */}
        <section
          id="how-it-works"
          className="px-6 md:px-10 py-20 md:py-28 bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 relative overflow-hidden"
        >
          <div className="max-w-7xl mx-auto relative z-10">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1 }}
              className="text-4xl md:text-5xl font-bold mb-16 text-center text-white"
            >
              How It{" "}
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Works
              </span>
            </motion.h2>
            <div className="grid gap-8 md:grid-cols-3">
              {[
                {
                  title: "Plan",
                  number: "01",
                  desc: "Pick your start date and add cities with days. Drag and drop to reorder for the perfect flow.",
                  color: "from-blue-400 to-cyan-400",
                  icon: (
                    <svg
                      className="w-8 h-8 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  ),
                },
                {
                  title: "Preferences",
                  number: "02",
                  desc: "Set your budget and traveler details for AI-powered, tailored recommendations.",
                  color: "from-purple-400 to-pink-400",
                  icon: (
                    <svg
                      className="w-8 h-8 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  ),
                },
                {
                  title: "Results",
                  number: "03",
                  desc: "Explore curated itineraries with weather forecasts, accommodations, events, and costs.",
                  color: "from-pink-400 to-rose-400",
                  icon: (
                    <svg
                      className="w-8 h-8 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                      />
                    </svg>
                  ),
                },
              ].map((card, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: idx * 0.2 }}
                  className="group"
                >
                  <div className="relative bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-8 hover:bg-white/20 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 h-full">
                    {/* Number badge */}
                    <div
                      className={`absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-r ${card.color} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}
                    >
                      <span className="text-white font-bold text-lg">
                        {card.number}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="space-y-6 pt-4">
                      <div
                        className={`w-16 h-16 bg-gradient-to-r ${card.color} rounded-2xl flex items-center justify-center mx-auto shadow-lg group-hover:scale-110 transition-transform duration-300`}
                      >
                        {card.icon}
                      </div>

                      <div className="text-center space-y-4">
                        <h3 className="text-2xl font-bold text-white group-hover:text-opacity-90 transition-colors duration-300">
                          {card.title}
                        </h3>
                        <p className="text-slate-300 leading-relaxed group-hover:text-slate-200 transition-colors duration-300">
                          {card.desc}
                        </p>
                      </div>
                    </div>

                    {/* Decorative elements */}
                    <div
                      className={`absolute bottom-4 right-4 w-8 h-8 bg-gradient-to-r ${card.color} rounded-full opacity-20 group-hover:opacity-40 transition-opacity duration-300`}
                    />
                    <div
                      className={`absolute top-8 right-8 w-4 h-4 bg-gradient-to-r ${card.color} rounded-full opacity-30 group-hover:opacity-60 transition-opacity duration-300`}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="mt-16 flex justify-center">
              <Button
                asChild
                className="bg-gradient-to-r from-white to-slate-100 text-slate-800 hover:from-slate-100 hover:to-white px-12 py-4 text-xl font-semibold shadow-2xl hover:shadow-white/20 transition-all duration-300 rounded-2xl border border-white/20"
              >
                <Link to="/plan">Start Your Journey →</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Floating CTA Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 1 }}
          className="fixed bottom-8 right-8 z-50"
        >
          <Button
            asChild
            className="shadow-2xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 font-semibold hover:shadow-blue-500/25 transition-all duration-300 rounded-2xl border border-white/20"
          >
            <Link to="/plan">Plan Now ✨</Link>
          </Button>
        </motion.div>
      </div>
    </main>
  );
}

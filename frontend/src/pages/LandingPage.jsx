import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Navbar from "../components/Navbar.jsx";
import { motion } from "framer-motion";

export default function LandingPage() {
  return (
    <main className="min-h-screen relative">
      {/* Sticky Navbar */}
      <div className="fixed top-0 left-0 w-full z-50 shadow-md bg-white">
        <Navbar />
      </div>

      <div className="pt-24">
        {/* Hero Section */}
        <section className="px-6 md:px-10 py-20 md:py-28 text-center bg-card rounded-b-3xl relative overflow-hidden">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            className="max-w-3xl mx-auto space-y-6"
          >
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Plan Your <span className="text-foreground">Perfect Journey</span>
            </h1>
            <p className="text-muted-foreground text-lg md:text-xl">
              Create personalized itineraries with real-time weather, optimal
              routes, and local events. Let AI handle the details while you
              dream about the adventure.
            </p>
            <div className="flex justify-center gap-4">
              <Button asChild>
                <Link to="/plan">Start Planning</Link>
              </Button>
              <Button variant="secondary" asChild>
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
          className="px-6 md:px-10 py-16 md:py-24 bg-gray-50"
        >
          <div className="max-w-6xl mx-auto">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1 }}
              className="text-2xl md:text-3xl font-semibold mb-12 text-center"
            >
              How it works
            </motion.h2>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                {
                  title: "1. Plan",
                  desc: "Pick your start date and add cities with days. Drag and drop to reorder.",
                },
                {
                  title: "2. Preferences",
                  desc: "Set your budget and traveler details for tailored results.",
                },
                {
                  title: "3. Results",
                  desc: "Explore AI-curated itineraries with weather, stays, events, and costs.",
                },
              ].map((card, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: idx * 0.2 }}
                >
                  <Card className="hover:shadow-xl transition-shadow duration-300 rounded-2xl cursor-pointer">
                    <CardContent className="p-8 text-center">
                      <h3 className="font-medium text-lg mb-2">{card.title}</h3>
                      <p className="mt-2 text-muted-foreground">{card.desc}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
            <div className="mt-12 flex justify-center">
              <Button asChild>
                <Link to="/plan">Try the planner</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Floating CTA Button */}
        <div className="fixed bottom-6 right-6 z-50">
          <Button asChild className="shadow-lg">
            <Link to="/plan">Plan Now</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}

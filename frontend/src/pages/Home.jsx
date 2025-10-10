import { Plane, MessageCircle, Map, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from "@/components/Navbar";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-4xl w-full text-center space-y-8">
          {/* Logo & Title */}
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3">
              <Plane className="w-12 h-12 text-primary-400" />
              <h1 className="text-6xl font-bold text-white">TripWhat</h1>
            </div>
            <p className="text-xl text-slate-300">
              AI-powered travel planning made simple
            </p>
          </div>

          {/* Feature cards */}
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 hover:border-primary-500 transition-colors">
              <MessageCircle className="w-8 h-8 text-primary-400 mb-3 mx-auto" />
              <h3 className="text-lg font-semibold text-white mb-2">Chat Planning</h3>
              <p className="text-slate-400 text-sm">
                Tell us what you want, AI creates your perfect itinerary
              </p>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 hover:border-primary-500 transition-colors">
              <Map className="w-8 h-8 text-primary-400 mb-3 mx-auto" />
              <h3 className="text-lg font-semibold text-white mb-2">Visual Maps</h3>
              <p className="text-slate-400 text-sm">
                See your trip locations pinned on interactive maps
              </p>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 hover:border-primary-500 transition-colors">
              <Sparkles className="w-8 h-8 text-primary-400 mb-3 mx-auto" />
              <h3 className="text-lg font-semibold text-white mb-2">AI Recommendations</h3>
              <p className="text-slate-400 text-sm">
                Discover hidden gems powered by intelligent agents
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-12">
            <button 
              onClick={() => navigate('/chat')}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition-all text-lg shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-105 active:scale-95"
            >
              Start Planning Your Trip 🚀
            </button>
            <p className="text-slate-500 text-sm mt-4">
              Phase 1: Chat Interface - Ready! ✨
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { motion } from 'framer-motion';
import { DollarSign, MapPin, Heart, ArrowRight } from 'lucide-react';

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [preferences, setPreferences] = useState({
    budget: '',
    travelStyle: '',
    interests: []
  });

  const handleComplete = async () => {
    // Update user preferences via API
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
      const token = localStorage.getItem('tripwhat_token');
      
      await fetch(`${API_URL}/api/auth/preferences`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
      });
      
      navigate('/chat');
    } catch (error) {
      console.error('Failed to update preferences:', error);
      // Still navigate to chat even if preferences update fails
      navigate('/chat');
    }
  };

  const budgetOptions = [
    { id: 'budget', label: 'Budget-friendly', icon: '💰', desc: 'Great value options' },
    { id: 'mid-range', label: 'Mid-range', icon: '🏨', desc: 'Comfort & quality' },
    { id: 'luxury', label: 'Luxury', icon: '✨', desc: 'Premium experiences' }
  ];

  const travelStyles = [
    { id: 'adventure', label: 'Adventure', icon: '🏔️', desc: 'Thrilling experiences' },
    { id: 'relaxation', label: 'Relaxation', icon: '🏖️', desc: 'Peace & tranquility' },
    { id: 'cultural', label: 'Cultural', icon: '🏛️', desc: 'History & heritage' },
    { id: 'business', label: 'Business', icon: '💼', desc: 'Work & meetings' }
  ];

  const interestOptions = [
    { id: 'museums', label: 'Museums' },
    { id: 'nightlife', label: 'Nightlife' },
    { id: 'nature', label: 'Nature' },
    { id: 'food', label: 'Food' },
    { id: 'shopping', label: 'Shopping' },
    { id: 'history', label: 'History' },
    { id: 'art', label: 'Art' }
  ];

  const handleInterestToggle = (interest) => {
    setPreferences(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <motion.div 
        className="max-w-2xl w-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            Let's personalize your experience
          </h1>
          <p className="text-slate-300">
            Tell us about your travel preferences to get better recommendations
          </p>
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-white mb-6 flex items-center gap-2">
              <DollarSign className="text-green-400" />
              What's your budget preference?
            </h2>
            <div className="grid gap-4">
              {budgetOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => {
                    setPreferences(prev => ({ ...prev, budget: option.id }));
                    setStep(2);
                  }}
                  className="p-6 rounded-xl border border-slate-700 bg-slate-800/50 hover:border-purple-500 transition-colors text-left"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">{option.icon}</span>
                    <div>
                      <h3 className="text-xl font-semibold text-white">{option.label}</h3>
                      <p className="text-slate-400">{option.desc}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-white mb-6 flex items-center gap-2">
              <MapPin className="text-blue-400" />
              What's your travel style?
            </h2>
            <div className="grid gap-4">
              {travelStyles.map((style) => (
                <button
                  key={style.id}
                  onClick={() => {
                    setPreferences(prev => ({ ...prev, travelStyle: style.id }));
                    setStep(3);
                  }}
                  className="p-6 rounded-xl border border-slate-700 bg-slate-800/50 hover:border-purple-500 transition-colors text-left"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">{style.icon}</span>
                    <div>
                      <h3 className="text-xl font-semibold text-white">{style.label}</h3>
                      <p className="text-slate-400">{style.desc}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-white mb-6 flex items-center gap-2">
              <Heart className="text-pink-400" />
              What interests you most?
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {interestOptions.map((interest) => (
                <button
                  key={interest.id}
                  onClick={() => handleInterestToggle(interest.id)}
                  className={`p-4 rounded-xl border transition-colors ${
                    preferences.interests.includes(interest.id)
                      ? 'border-purple-500 bg-purple-500/20'
                      : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                  }`}
                >
                  <span className="text-white font-medium">{interest.label}</span>
                </button>
              ))}
            </div>
            
            <button
              onClick={handleComplete}
              className="w-full mt-8 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
            >
              Start Planning <ArrowRight size={20} />
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
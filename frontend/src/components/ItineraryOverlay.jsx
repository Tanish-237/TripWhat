import { X, Clock, MapPin, Star } from 'lucide-react';

export function ItineraryOverlay({ itinerary, isOpen, onClose, onActivityClick }) {
  if (!isOpen || !itinerary) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="absolute right-0 top-0 h-full w-96 bg-slate-900 border-l border-slate-700 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-xl font-semibold text-white">
            {itinerary.destination} Itinerary
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="text-center">
            <h3 className="text-lg font-medium text-white mb-2">
              {itinerary.duration}-Day Trip
            </h3>
            <p className="text-slate-400 text-sm">
              {itinerary.days.length} days planned
            </p>
          </div>

          {/* Days */}
          {itinerary.days.map((day) => (
            <div key={day.dayNumber} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {day.dayNumber}
                </div>
                <div>
                  <h4 className="font-medium text-white">{day.title}</h4>
                </div>
              </div>

              {/* Time Slots */}
              <div className="ml-11 space-y-3">
                {day.timeSlots.map((slot, slotIndex) => (
                  <div key={slotIndex} className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Clock size={14} />
                      <span>{slot.time}</span>
                    </div>
                    
                    {/* Activities */}
                    <div className="space-y-2">
                      {slot.activities.map((activity, actIndex) => (
                        <div
                          key={actIndex}
                          onClick={() => onActivityClick?.(activity)}
                          className="p-3 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-purple-500 transition-colors cursor-pointer"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h5 className="text-white font-medium text-sm mb-1">
                                {activity.name}
                              </h5>
                              
                              {activity.location && (
                                <div className="flex items-center gap-1 text-xs text-slate-400 mb-2">
                                  <MapPin size={12} />
                                  <span>{activity.location}</span>
                                </div>
                              )}
                              
                              {activity.description && (
                                <p className="text-xs text-slate-300 mb-2">
                                  {activity.description}
                                </p>
                              )}
                              
                              <div className="flex items-center gap-4 text-xs text-slate-400">
                                {activity.duration && (
                                  <span>⏱ {activity.duration}</span>
                                )}
                                {activity.price && (
                                  <span>💰 {activity.price}</span>
                                )}
                                {activity.rating && (
                                  <div className="flex items-center gap-1">
                                    <Star size={10} className="text-yellow-400" />
                                    <span>{activity.rating}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

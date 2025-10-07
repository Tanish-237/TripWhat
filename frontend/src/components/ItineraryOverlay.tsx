import { useState } from 'react';
import type { Itinerary, DayPlan, TimeSlot, Activity } from '../types/itinerary';

interface ItineraryOverlayProps {
  itinerary: Itinerary | null;
  isOpen: boolean;
  onClose: () => void;
  onActivityClick?: (activity: Activity) => void;
}

export function ItineraryOverlay({ itinerary, isOpen, onClose, onActivityClick }: ItineraryOverlayProps) {
  const [selectedDay, setSelectedDay] = useState<number>(1);

  if (!isOpen || !itinerary) return null;

  const currentDay = itinerary.days.find(d => d.dayNumber === selectedDay);

  const getPeriodEmoji = (period: TimeSlot['period']) => {
    switch (period) {
      case 'morning': return '☀️';
      case 'afternoon': return '🌆';
      case 'evening': return '🌙';
      case 'night': return '✨';
    }
  };

  const getCategoryEmoji = (category: string) => {
    const cat = category.toLowerCase();
    if (cat.includes('museum') || cat.includes('culture')) return '🏛️';
    if (cat.includes('food') || cat.includes('restaurant')) return '🍽️';
    if (cat.includes('park') || cat.includes('nature')) return '🌳';
    if (cat.includes('monument') || cat.includes('architecture')) return '🏰';
    if (cat.includes('shopping')) return '🛍️';
    return '📍';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-3xl font-bold mb-2">
                🗺️ {itinerary.tripMetadata.destination} Trip
              </h2>
              <p className="text-blue-100">
                {itinerary.tripMetadata.duration} days • {itinerary.days.reduce((sum, day) => 
                  sum + day.timeSlots.reduce((s, slot) => s + slot.activities.length, 0), 0)} activities
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Day Selector */}
          <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
            {itinerary.days.map(day => (
              <button
                key={day.dayNumber}
                onClick={() => setSelectedDay(day.dayNumber)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
                  selectedDay === day.dayNumber
                    ? 'bg-white text-blue-600 font-semibold shadow-lg'
                    : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30'
                }`}
              >
                Day {day.dayNumber}
              </button>
            ))}
          </div>
        </div>

        {/* Day Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {currentDay && (
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-800 mb-1">{currentDay.title}</h3>
                {currentDay.description && (
                  <p className="text-gray-600">{currentDay.description}</p>
                )}
              </div>

              {currentDay.timeSlots.map((slot, slotIndex) => (
                <div key={slotIndex} className="space-y-3">
                  {slot.activities.length > 0 && (
                    <>
                      {/* Time Slot Header */}
                      <div className="flex items-center gap-3 pt-4">
                        <span className="text-2xl">{getPeriodEmoji(slot.period)}</span>
                        <div>
                          <h4 className="text-lg font-semibold text-gray-800 capitalize">
                            {slot.period}
                          </h4>
                          <p className="text-sm text-gray-500">
                            {slot.startTime} - {slot.endTime}
                          </p>
                        </div>
                      </div>

                      {/* Activities */}
                      <div className="space-y-3 pl-11">
                        {slot.activities.map((activity, activityIndex) => (
                          <div
                            key={activity.id}
                            onClick={() => onActivityClick?.(activity)}
                            className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group"
                          >
                            <div className="flex items-start gap-3">
                              <span className="text-2xl">{getCategoryEmoji(activity.category)}</span>
                              <div className="flex-1">
                                <div className="flex items-start justify-between gap-2">
                                  <h5 className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
                                    {activityIndex + 1}. {activity.name}
                                  </h5>
                                  {activity.rating && (
                                    <span className="text-yellow-500 text-sm whitespace-nowrap">
                                      ⭐ {activity.rating}/7
                                    </span>
                                  )}
                                </div>

                                <div className="mt-2 space-y-1 text-sm text-gray-600">
                                  <div className="flex items-center gap-4 flex-wrap">
                                    <span className="flex items-center gap-1">
                                      ⏱️ {activity.duration}
                                    </span>
                                    {activity.estimatedCost && (
                                      <span className="flex items-center gap-1">
                                        💰 {activity.estimatedCost}
                                      </span>
                                    )}
                                    <span className="flex items-center gap-1 capitalize">
                                      🏷️ {activity.category}
                                    </span>
                                  </div>

                                  {activity.description && (
                                    <p className="text-gray-500 mt-2 line-clamp-2">
                                      {activity.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              ✨ Customize this itinerary by chatting with me!
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

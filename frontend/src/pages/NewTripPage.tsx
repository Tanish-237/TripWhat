import { useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Compass, Plus } from 'lucide-react';
import { ChatPanel } from '../components/Chat/ChatPanel';
import { TripMap } from '../components/map/TripMap';
import { useTripStore } from '../stores/tripStore';
import { tripsApi } from '../lib/api';

export default function NewTripPage() {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [localTripState, setLocalTripState] = useState<any>(null);
  const { createTrip } = useTripStore();
  const tripIdRef = useRef<number | null>(null);

  const handleTripStateUpdate = useCallback((tripState: any) => {
    setLocalTripState(tripState);
    if (!tripState) return;

    (async () => {
      try {
        if (!tripIdRef.current) {
          if (tripState.cities?.length > 0 || tripState.itinerary) {
            const trip = await createTrip({ tripState });
            const newId = (trip as any)?.id || (trip as any)?._id;
            if (newId) tripIdRef.current = newId;
          }
        } else {
          await tripsApi.update(String(tripIdRef.current), {
            generatedItinerary: tripState.itinerary,
            cities: (tripState.cities || []).map((c: any) => ({ name: c.name, days: c.nights ? c.nights + 1 : 1 })),
            totalDays: tripState.duration || tripState.itinerary?.days?.length,
          });
        }
      } catch (e) {
        console.error('Save failed:', e);
      }
    })();
  }, [createTrip]);

  const destination = localTripState?.cities?.[0]?.name || null;
  const itinerary = localTripState?.itinerary || null;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Chat panel - left 52% */}
      <div className="w-[52%] shrink-0 border-r border-[var(--border)]">
        <ChatPanel
          title="New trip"
          initialMessage={initialQuery}
          onTripStateUpdate={handleTripStateUpdate}
        />
      </div>

      {/* Right panel - map + workspace 48% */}
      <div className="flex-1 flex flex-col bg-[var(--bg)] min-w-0">
        {/* Map - top 40% */}
        <div className="h-[40%] shrink-0 border-b border-[var(--border)] relative bg-[var(--sage)]">
          <TripMap itinerary={itinerary} destination={destination} />
        </div>

        {/* Trip workspace - bottom 60% */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Tab strip */}
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 shrink-0">
            <div className="flex">
              <button className="px-4 py-2.5 text-sm font-medium text-[var(--ink)] border-b-2 border-[var(--ink)]">
                Trip Overview
              </button>
              <button className="px-4 py-2.5 text-sm font-medium text-[var(--muted)] hover:text-[var(--ink)]">
                Bookings
              </button>
              <button className="px-4 py-2.5 text-sm font-medium text-[var(--muted)] hover:text-[var(--ink)]">
                Saved
              </button>
            </div>
            <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-[var(--muted)] hover:bg-[var(--sage)] hover:text-[var(--ink)] transition-colors">
              <Plus className="w-3.5 h-3.5" />
              Add
            </button>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto">
            {itinerary ? (
              <div className="p-4">
                <div className="space-y-3">
                  {itinerary.days?.map((day: any) => (
                    <div key={day.dayNumber} className="rounded-lg bg-[var(--surface)] border border-[var(--border)] overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)]">
                        <span className="text-xs font-semibold text-[var(--ink)]">Day {day.dayNumber}</span>
                        {day.location && <span className="text-xs text-[var(--muted)]">{day.location}</span>}
                      </div>
                      {day.subtitle && (
                        <p className="px-4 py-2 text-xs text-[var(--muted)] leading-relaxed border-b border-[var(--border)]">{day.subtitle}</p>
                      )}
                      <div className="divide-y divide-[var(--border)]">
                        {day.timeSlots?.map((slot: any, i: number) => (
                          <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                            <span className="text-[10px] text-[var(--muted)] uppercase tracking-wide w-16 shrink-0">{slot.period || slot.timeSlot || ''}</span>
                            <span className="text-xs text-[var(--ink)] flex-1 truncate">{slot.activity?.name || slot.activities?.map((a: any) => a.name).join(', ') || 'Free time'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                <div className="w-10 h-10 rounded-lg bg-[var(--sage)] flex items-center justify-center mb-3">
                  <Compass className="w-5 h-5 text-[var(--muted)]" />
                </div>
                <p className="text-sm text-[var(--muted)]">
                  Your itinerary will appear here as we plan
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

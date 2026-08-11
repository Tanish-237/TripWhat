import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { MapPin, Plus, Mail, Bookmark, Calendar, Plane, Hotel, Utensils, Package, RefreshCw, CheckCircle2 } from 'lucide-react';
import { ChatPanel } from '../components/Chat/ChatPanel';
import { TripMap } from '../components/map/TripMap';
import { useTripStore } from '../stores/tripStore';
import { useUIStore } from '../stores/uiStore';
import { gmailApi, tripsApi } from '../lib/api';

export default function TripWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const { tripState, fetchTrip, connectSocket, disconnectSocket, setTripState } = useTripStore();
  const { activeTab, setActiveTab, cityFilter, setCityFilter } = useUIStore();
  const [tripLoading, setTripLoading] = useState(true);
  const [tripError, setTripError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      setTripLoading(true);
      setTripError(null);
      fetchTrip(id).catch((err) => setTripError(err?.message || 'Failed to load trip')).finally(() => setTripLoading(false));
    }
    connectSocket();
    return () => { disconnectSocket(); };
  }, [id]);

  const handleTripStateUpdate = useCallback((newTripState: any) => {
    setTripState(newTripState);
    if (!newTripState || !id) return;

    (async () => {
      try {
        await tripsApi.update(id, {
          generatedItinerary: newTripState.itinerary,
          cities: (newTripState.cities || []).map((c: any) => ({ name: c.name, days: c.nights ? c.nights + 1 : 1 })),
          totalDays: newTripState.duration || newTripState.itinerary?.days?.length,
        });
      } catch (e) {
        console.error('Save failed:', e);
      }
    })();
  }, [id, setTripState]);

  const cities = tripState?.cities || [];
  const itinerary = tripState?.itinerary;
  const tripTitle = cities.map((c) => c.name).join(' → ') || 'Untitled trip';

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Chat panel - left 52% */}
      <div className="w-[52%] shrink-0 border-r border-[var(--border)]">
        <ChatPanel
          title={tripTitle}
          tripState={tripState || undefined}
          onTripStateUpdate={handleTripStateUpdate}
        />
      </div>

      {/* Right panel - map + itinerary */}
      <div className="flex-1 flex flex-col bg-[var(--bg)] min-w-0">
        {tripError ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-red-600">{tripError}</p>
          </div>
        ) : tripLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-pulse text-sm text-[var(--muted)]">Loading trip...</div>
          </div>
        ) : (
          <>
            {/* Map - top 40% */}
            <div className="h-[40%] shrink-0 border-b border-[var(--border)] relative bg-[var(--sage)]">
              {itinerary ? (
                <TripMap itinerary={itinerary} selectedCity={cityFilter} destination={cities[0]?.name} />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="w-8 h-8 text-[var(--muted)] mx-auto mb-2 opacity-40" />
                    <p className="text-[var(--muted)] text-xs">Map will appear here</p>
                  </div>
                </div>
              )}
            </div>

            {/* Tabs + content - bottom 60% */}
            <div className="flex-1 flex flex-col min-h-0">
              {/* Tab strip */}
              <div className="flex items-center justify-between border-b border-[var(--border)] px-4 shrink-0">
                <div className="flex">
                  {(['plan', 'bookings', 'saved'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setActiveTab(t)}
                      className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors ${
                        activeTab === t
                          ? 'text-[var(--ink)] border-b-2 border-[var(--ink)]'
                          : 'text-[var(--muted)] hover:text-[var(--ink)]'
                      }`}
                    >
                      {t === 'plan' ? 'Trip Overview' : t}
                    </button>
                  ))}
                </div>
                {activeTab === 'plan' && (
                  <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-[var(--muted)] hover:bg-[var(--sage)] hover:text-[var(--ink)] transition-colors">
                    <Plus className="w-3.5 h-3.5" />
                    Add
                  </button>
                )}
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-y-auto">
                {activeTab === 'plan' && (
                  <PlanTab itinerary={itinerary} cityFilter={cityFilter} setCityFilter={setCityFilter} cities={cities} />
                )}
                {activeTab === 'bookings' && <BookingsTab />}
                {activeTab === 'saved' && <SavedTab />}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function PlanTab({ itinerary, cityFilter, setCityFilter, cities }: any) {
  if (!itinerary || !itinerary.days) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12 text-center">
        <MapPin className="w-8 h-8 text-[var(--muted)] mb-2 opacity-40" />
        <p className="text-sm text-[var(--muted)]">No itinerary yet. Start chatting to plan your trip.</p>
      </div>
    );
  }

  const filteredDays = cityFilter
    ? itinerary.days.filter((d: any) => d.location === cityFilter)
    : itinerary.days;

  return (
    <div className="p-4">
      {/* City filter chips */}
      {cities.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          <button
            onClick={() => setCityFilter(null)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              !cityFilter ? 'bg-[var(--lavender)] text-[var(--ink)]' : 'text-[var(--muted)] hover:bg-[var(--sage)]'
            }`}
          >
            All
          </button>
          {cities.map((c: any) => (
            <button
              key={c.name}
              onClick={() => setCityFilter(c.name)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                cityFilter === c.name ? 'bg-[var(--lavender)] text-[var(--ink)]' : 'text-[var(--muted)] hover:bg-[var(--sage)]'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {/* Day cards */}
      <div className="space-y-3">
        {filteredDays.map((day: any) => (
          <div key={day.dayNumber} className="rounded-lg bg-[var(--surface)] border border-[var(--border)] overflow-hidden">
            {/* Day header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[var(--ink)]">Day {day.dayNumber}</span>
                {day.location && (
                  <span className="text-xs text-[var(--muted)] flex items-center gap-0.5">
                    <MapPin className="w-3 h-3" />
                    {day.location}
                  </span>
                )}
              </div>
              {day.date && (
                <span className="text-xs text-[var(--muted)] flex items-center gap-0.5">
                  <Calendar className="w-3 h-3" />
                  {day.date}
                </span>
              )}
            </div>

            {/* Day description */}
            {day.subtitle && (
              <p className="px-4 py-2 text-xs text-[var(--muted)] leading-relaxed border-b border-[var(--border)]">
                {day.subtitle}
              </p>
            )}

            {/* Activities */}
            <div className="divide-y divide-[var(--border)]">
              {day.timeSlots?.map((slot: any, i: number) => {
                const activityName = slot.activity?.name || slot.activities?.map((a: any) => a.name).join(', ') || '';
                return (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--bg)] transition-colors">
                    <span className="text-[10px] text-[var(--muted)] uppercase tracking-wide w-16 shrink-0">
                      {slot.period || slot.timeSlot || ''}
                    </span>
                    <span className="text-xs text-[var(--ink)] flex-1 truncate">
                      {activityName || 'Free time'}
                    </span>
                    {slot.activity?.type && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--sage)] text-[var(--muted)] shrink-0">
                        {slot.activity.type}
                      </span>
                    )}
                  </div>
                );
              })}
              {/* Add item row */}
              <button className="flex items-center gap-2 px-4 py-2 text-xs text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--bg)] transition-colors w-full">
                <Plus className="w-3.5 h-3.5" />
                Add item
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BookingsTab() {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkStatus();
    const params = new URLSearchParams(window.location.search);
    if (params.get('gmail') === 'connected') {
      params.delete('gmail');
      window.history.replaceState({}, '', `${window.location.pathname}?${params}`);
      checkStatus();
    }
  }, []);

  const checkStatus = async () => {
    try {
      const res = await gmailApi.status();
      setConnected(res.data.connected);
      if (res.data.connected) {
        fetchBookings();
      }
    } catch {
      setConnected(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);
    try {
      const res = await gmailApi.oauthUrl();
      window.location.href = res.data.url;
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to start Gmail connection');
    } finally {
      setConnecting(false);
    }
  };

  const fetchBookings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await gmailApi.bookings();
      setBookings(res.data.bookings || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  };

  const bookingIcons: Record<string, any> = {
    flight: Plane,
    hotel: Hotel,
    restaurant: Utensils,
    other: Package,
  };

  if (connected && !loading && bookings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12 text-center px-6">
        <div className="w-10 h-10 rounded-lg bg-[var(--sage)] flex items-center justify-center mb-3">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
        </div>
        <p className="text-sm font-medium text-[var(--ink)] mb-1">Gmail connected</p>
        <p className="text-xs text-[var(--muted)] mb-4 max-w-[280px]">
          No booking confirmations found in the last 6 months. We'll check again when you book something new.
        </p>
        <button
          onClick={fetchBookings}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--muted)] hover:bg-[var(--sage)] transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12 text-center px-6">
        <div className="w-10 h-10 rounded-lg bg-[var(--sage)] flex items-center justify-center mb-3">
          <Mail className="w-5 h-5 text-[var(--muted)]" />
        </div>
        <p className="text-sm font-medium text-[var(--ink)] mb-1">No bookings yet</p>
        <p className="text-xs text-[var(--muted)] mb-4 max-w-[280px]">
          Connect your Gmail to automatically import flight and hotel confirmations.
        </p>
        {error && <p className="text-xs text-red-500 mb-3 max-w-[280px]">{error}</p>}
        <button
          onClick={handleConnect}
          disabled={connecting}
          className="px-4 py-2 rounded-lg bg-[var(--ink)] text-white text-xs font-medium hover:bg-[#292524] transition-colors disabled:opacity-50"
        >
          {connecting ? 'Connecting…' : 'Connect Gmail'}
        </button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          <span className="text-xs font-medium text-[var(--ink)]">Gmail connected</span>
        </div>
        <button
          onClick={fetchBookings}
          disabled={loading}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-[var(--muted)] hover:bg-[var(--sage)] transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-3 p-2.5 text-xs text-red-600 bg-red-50 rounded-lg">{error}</div>
      )}

      <div className="space-y-2">
        {bookings.map((booking) => {
          const Icon = bookingIcons[booking.type] || Package;
          return (
            <div key={booking.id} className="rounded-lg bg-[var(--surface)] border border-[var(--border)] p-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-md bg-[var(--sage)] flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-[var(--muted)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[var(--ink)] truncate">{booking.subject}</p>
                  <p className="text-[10px] text-[var(--muted)] truncate mt-0.5">{booking.sender}</p>
                  {booking.confirmationCode && (
                    <p className="text-[10px] text-[var(--muted)] mt-1">
                      Confirmation: <span className="font-mono font-medium text-[var(--ink)]">{booking.confirmationCode}</span>
                    </p>
                  )}
                  {booking.dates && (
                    <p className="text-[10px] text-[var(--muted)] mt-0.5">
                      {booking.dates.start}{booking.dates.end ? ` → ${booking.dates.end}` : ''}
                    </p>
                  )}
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--sage)] text-[var(--muted)] capitalize shrink-0">
                  {booking.type}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SavedTab() {
  return (
    <div className="flex flex-col items-center justify-center h-full py-12 text-center px-6">
      <div className="w-10 h-10 rounded-lg bg-[var(--sage)] flex items-center justify-center mb-3">
        <Bookmark className="w-5 h-5 text-[var(--muted)]" />
      </div>
      <p className="text-sm font-medium text-[var(--ink)] mb-1">No saved places yet</p>
      <p className="text-xs text-[var(--muted)] max-w-[280px]">
        Save restaurants, attractions, and hotels from your chat to revisit them here.
      </p>
    </div>
  );
}

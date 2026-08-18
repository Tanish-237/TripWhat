import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { MapPin, Plus, Mail, Bookmark, Calendar, Plane, Hotel, Utensils, Package, RefreshCw, CheckCircle2, Star, ExternalLink, Check, X, ArrowRight } from 'lucide-react';
import { ChatPanel } from '../components/Chat/ChatPanel';
import { TripMap } from '../components/map/TripMap';
import { PlaceDetailPanel } from '../components/PlaceDetailPanel';
import { FlightCard } from '../components/FlightCard';
import { useTripStore } from '../stores/tripStore';
import { useChatStore } from '../stores/chatStore';
import { useUIStore } from '../stores/uiStore';
import { gmailApi } from '../lib/api';

export default function TripWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const { tripState, fetchTrip, connectSocket, disconnectSocket, setTripState, updateTrip, pendingDiff, acceptDiff, rejectDiff } = useTripStore();
  const conversationId = useChatStore((s) => s.conversationId);
  const { activeTab, setActiveTab, cityFilter, setCityFilter } = useUIStore();
  const [tripLoading, setTripLoading] = useState(true);
  const [tripError, setTripError] = useState<string | null>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const pendingSaveRef = useRef<any>(null);

  useEffect(() => {
    if (id) {
      setTripLoading(true);
      setTripError(null);
      fetchTrip(id).catch((err) => setTripError(err?.message || 'Failed to load trip')).finally(() => setTripLoading(false));
    }
    connectSocket();
    return () => { disconnectSocket(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (conversationId) {
      connectSocket(conversationId);
    }
  }, [conversationId, connectSocket]);

  useEffect(() => {
    return () => {
      if (id && pendingSaveRef.current) {
        updateTrip(id, pendingSaveRef.current).catch(() => {});
      }
    };
  }, [id, updateTrip]);

  const handleTripStateUpdate = useCallback((newTripState: any) => {
    setTripState(newTripState);
    if (!newTripState || !id) return;

    const { conversationId, messages } = useChatStore.getState();
    const saveData = {
      generatedItinerary: newTripState.itinerary,
      cities: (newTripState.cities || []).map((c: any) => ({ name: c.name, days: c.nights ? c.nights + 1 : 1 })),
      totalDays: newTripState.duration || newTripState.itinerary?.days?.length,
      tripState: newTripState,
      conversationId: conversationId || undefined,
      chatHistory: messages?.length ? messages.map((m) => ({ role: m.role, content: m.content, timestamp: m.timestamp })) : undefined,
    };

    pendingSaveRef.current = saveData;
    (async () => {
      try {
        await updateTrip(id, saveData);
        pendingSaveRef.current = null;
      } catch (e) {
        console.error('Save failed:', e);
      }
    })();
  }, [id, setTripState, updateTrip]);

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
              <div className="flex-1 overflow-y-auto relative">
                {pendingDiff && (
                  <DiffOverlay
                    changeSummary={pendingDiff.changeSummary}
                    onAccept={acceptDiff}
                    onReject={rejectDiff}
                  />
                )}
                {activeTab === 'plan' && (
                  <PlanTab
                    itinerary={itinerary}
                    cityFilter={cityFilter}
                    setCityFilter={setCityFilter}
                    cities={cities}
                    onSelectPlace={setSelectedPlaceId}
                  />
                )}
                {activeTab === 'bookings' && <BookingsTab />}
                {activeTab === 'saved' && <SavedTab />}
                {selectedPlaceId && (
                  <PlaceDetailPanel
                    placeId={selectedPlaceId}
                    onClose={() => setSelectedPlaceId(null)}
                    onSelectAlternate={(pid) => setSelectedPlaceId(pid)}
                  />
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function PlanTab({ itinerary, cityFilter, setCityFilter, cities, onSelectPlace }: any) {
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
                const imageUrl = slot.activity?.imageUrl || slot.activity?.photos?.[0];
                const placeId = slot.activity?.placeId || '';
                return (
                  <div
                    key={i}
                    className={`flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--bg)] transition-colors ${placeId ? 'cursor-pointer' : ''}`}
                    onClick={() => placeId && onSelectPlace(placeId)}
                  >
                    {imageUrl && (
                      <img
                        src={imageUrl}
                        alt={activityName}
                        className="w-10 h-10 rounded-md object-cover shrink-0"
                        loading="lazy"
                      />
                    )}
                    <span className="text-[10px] text-[var(--muted)] uppercase tracking-wide w-16 shrink-0">
                      {slot.startTime && slot.endTime ? `${slot.startTime}–${slot.endTime}` : (slot.period || slot.timeSlot || '')}
                    </span>
                    <span className="text-xs text-[var(--ink)] flex-1 truncate">
                      {activityName || 'Free time'}
                    </span>
                    {slot.activity?.duration && (
                      <span className="text-[10px] text-[var(--muted)] shrink-0">
                        {slot.activity.duration}
                      </span>
                    )}
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

      {/* Flight options */}
      {itinerary.flightOptions?.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-2">
            <Plane className="w-4 h-4 text-[var(--muted)]" />
            <span className="text-xs font-semibold text-[var(--ink)]">Flight Options</span>
          </div>
          <div className="space-y-2">
            {itinerary.flightOptions.map((flight: any, i: number) => (
              <FlightCard key={i} flight={flight} />
            ))}
          </div>
        </div>
      )}

      {/* Hotel recommendations */}
      {itinerary.hotelRecommendations?.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-2">
            <Hotel className="w-4 h-4 text-[var(--muted)]" />
            <span className="text-xs font-semibold text-[var(--ink)]">Hotel Recommendations</span>
          </div>
          <div className="space-y-2">
            {itinerary.hotelRecommendations.map((hotel: any, i: number) => (
              <RecommendationCard key={i} item={hotel} onSelectPlace={onSelectPlace} />
            ))}
          </div>
        </div>
      )}

      {/* Restaurant recommendations */}
      {itinerary.restaurantRecommendations?.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-2">
            <Utensils className="w-4 h-4 text-[var(--muted)]" />
            <span className="text-xs font-semibold text-[var(--ink)]">Restaurant Recommendations</span>
          </div>
          <div className="space-y-2">
            {itinerary.restaurantRecommendations.map((rest: any, i: number) => (
              <RecommendationCard key={i} item={rest} onSelectPlace={onSelectPlace} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RecommendationCard({ item, onSelectPlace }: any) {
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--bg)] transition-colors ${item.placeId ? 'cursor-pointer' : ''}`}
      onClick={() => item.placeId && onSelectPlace(item.placeId)}
    >
      {item.imageUrl && (
        <img
          src={item.imageUrl}
          alt={item.name}
          className="w-12 h-12 rounded-md object-cover shrink-0"
          loading="lazy"
        />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-[var(--ink)] truncate">{item.name}</p>
        {item.address && (
          <p className="text-[10px] text-[var(--muted)] truncate mt-0.5">{item.address}</p>
        )}
        {item.description && (
          <p className="text-[10px] text-[var(--muted)] truncate mt-0.5">{item.description}</p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {item.rating != null && (
          <div className="flex items-center gap-0.5">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span className="text-[10px] font-medium text-[var(--ink)]">{item.rating}</span>
          </div>
        )}
        {item.cuisine && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--sage)] text-[var(--muted)] capitalize">
            {item.cuisine}
          </span>
        )}
        {item.website && (
          <a
            href={item.website}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-1 rounded hover:bg-[var(--sage)] text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
}

function DiffOverlay({ changeSummary, onAccept, onReject }: any) {
  const ACTION_ICONS: Record<string, any> = {
    add: Plus,
    remove: X,
    replace: ArrowRight,
    move: ArrowRight,
  };
  const ACTION_COLORS: Record<string, string> = {
    add: 'text-green-600',
    remove: 'text-red-500',
    replace: 'text-amber-600',
    move: 'text-blue-500',
  };

  return (
    <div className="sticky top-0 z-20 bg-[var(--surface)] border-b border-[var(--border)] shadow-sm">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-[var(--ink)]">Proposed changes</span>
          <div className="flex items-center gap-2">
            <button
              onClick={onReject}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-[var(--muted)] border border-[var(--border)] hover:bg-[var(--sage)] transition-colors"
            >
              <X className="w-3 h-3" />
              Reject
            </button>
            <button
              onClick={onAccept}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-white bg-[var(--ink)] hover:bg-[#292524] transition-colors"
            >
              <Check className="w-3 h-3" />
              Accept
            </button>
          </div>
        </div>
        <div className="space-y-1">
          {changeSummary.map((change: any, i: number) => {
            const Icon = ACTION_ICONS[change.action] || Plus;
            const color = ACTION_COLORS[change.action] || 'text-[var(--muted)]';
            const label = change.action === 'add'
              ? `Add ${change.target || change.added?.join(', ') || 'item'}`
              : change.action === 'remove'
              ? `Remove ${change.target || change.removed?.join(', ') || 'item'}`
              : change.action === 'replace'
              ? `Replace with ${change.target}`
              : change.action === 'move'
              ? `Move ${change.target}`
              : `${change.action}: ${change.target || ''}`;
            return (
              <div key={i} className="flex items-center gap-2 text-[10px]">
                <Icon className={`w-3 h-3 ${color} shrink-0`} />
                <span className="text-[var(--ink)]">{label}</span>
              </div>
            );
          })}
        </div>
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

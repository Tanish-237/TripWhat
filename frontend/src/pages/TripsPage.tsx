import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, MapPin, Calendar, Clock, MoreVertical } from 'lucide-react';
import { useTripStore } from '../stores/tripStore';
import { useReveal } from '../hooks/useReveal';

export default function TripsPage() {
  const { trips, loading, error, fetchTrips, deleteTrip } = useTripStore();
  const [tab, setTab] = useState<'all' | 'upcoming' | 'past'>('all');
  const { ref, visible } = useReveal<HTMLDivElement>();

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  const filtered = trips.filter((t) => {
    if (tab === 'all') return true;
    if (tab === 'upcoming') {
      const start = t.tripState?.dates?.start;
      return start && new Date(start) > new Date();
    }
    if (tab === 'past') {
      const end = t.tripState?.dates?.end;
      return end && new Date(end) < new Date();
    }
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto px-6 py-16 relative z-10">
      <div
        ref={ref}
        className="flex items-center justify-between mb-8"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(30px)',
          transition: 'opacity 0.8s ease-out, transform 0.8s ease-out',
        }}
      >
        <div>
          <h1 className="text-3xl font-bold text-[var(--ink)] tracking-tight">
            Your trips
          </h1>
          <p className="text-[var(--muted)] mt-1">
            Plan, explore, and revisit your travel adventures
          </p>
        </div>
        <Link
          to="/new"
          className="flex items-center gap-2 px-5 py-2.5 rounded-[1.25rem] bg-[var(--peach)] text-white text-sm font-medium hover:opacity-90 transition-opacity duration-300"
        >
          <Plus className="w-4 h-4" />
          New trip
        </Link>
      </div>

      <div className="flex gap-2 mb-6">
        {(['all', 'upcoming', 'past'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-full text-sm font-medium capitalize transition-all duration-300 ${
              tab === t
                ? 'bg-[var(--lavender)] text-[var(--ink)]'
                : 'text-[var(--muted)] hover:bg-[var(--sage)]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading && (
        <div className="text-center py-20 text-[var(--muted)]">Loading trips...</div>
      )}

      {error && (
        <div className="text-center py-20 text-red-500">{error}</div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-20">
          <MapPin className="w-12 h-12 text-[var(--muted)] mx-auto mb-4 opacity-40" />
          <p className="text-[var(--muted)] text-lg">
            No trips yet. Start planning your first adventure.
          </p>
          <Link
            to="/new"
            className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-[1.25rem] bg-[var(--peach)] text-white text-sm font-medium hover:opacity-90 transition-opacity duration-300"
          >
            <Plus className="w-4 h-4" />
            Plan a trip
          </Link>
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((trip, i) => (
            <TripCard key={trip._id} trip={trip} index={i} onDelete={deleteTrip} />
          ))}
        </div>
      )}
    </div>
  );
}

function TripCard({ trip, index, onDelete }: { trip: any; index: number; onDelete: (id: string) => void }) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  const cities = trip.tripState?.cities || [];
  const cityNames = cities.map((c: any) => c.name).join(' → ');
  const dates = trip.tripState?.dates;
  const duration = trip.tripState?.duration;

  return (
    <Link
      to={`/trip/${trip._id}`}
      ref={ref as any}
      className="block rounded-[2rem] bg-[var(--surface)] p-6 hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)] transition-shadow duration-300"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(30px)',
        transition: `opacity 0.8s ease-out ${index * 0.1}s, transform 0.8s ease-out ${index * 0.1}s`,
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-[var(--peach)]" />
          <span className="text-sm font-medium text-[var(--ink)]">
            {cityNames || 'Untitled trip'}
          </span>
        </div>
        <button
          onClick={(e) => {
            e.preventDefault();
            if (confirm('Delete this trip?')) onDelete(trip._id);
          }}
          className="text-[var(--muted)] hover:text-red-500 transition-colors"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-4 text-xs text-[var(--muted)]">
        {dates && (
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {dates.start} → {dates.end}
          </span>
        )}
        {duration && (
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {duration} days
          </span>
        )}
      </div>

      {trip.tripState?.itinerary && (
        <div className="mt-3 text-xs text-[var(--muted)]">
          {trip.tripState.itinerary.days?.length || 0} days planned
        </div>
      )}
    </Link>
  );
}

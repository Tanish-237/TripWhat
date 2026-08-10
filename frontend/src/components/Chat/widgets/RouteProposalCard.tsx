import React from 'react';
import { MapPin, Clock, Check } from 'lucide-react';

interface RouteProposalCardProps {
  data: {
    cities: Array<{ name: string; nights: number }>;
    totalNights: number;
  };
  onConfirm: () => void;
}

export function RouteProposalCard({ data, onConfirm }: RouteProposalCardProps) {
  return (
    <div
      className="rounded-2xl bg-[var(--surface)] p-5 mt-3"
      style={{
        boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)',
        animation: 'widgetMount 0.4s ease-out forwards',
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="w-4 h-4 text-[var(--peach)]" />
        <span className="text-sm font-medium text-[var(--ink)]">
          Proposed route · {data.totalNights} nights
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap mb-4">
        {data.cities.map((city, i) => (
          <React.Fragment key={city.name}>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--sage)]">
              <span className="text-sm font-medium text-[var(--ink)]">{city.name}</span>
              <span className="text-xs text-[var(--muted)] flex items-center gap-0.5">
                <Clock className="w-3 h-3" />
                {city.nights}n
              </span>
            </div>
            {i < data.cities.length - 1 && (
              <span className="text-[var(--muted)] text-sm">→</span>
            )}
          </React.Fragment>
        ))}
      </div>

      <button
        onClick={onConfirm}
        className="w-full py-2.5 px-4 rounded-[1.25rem] bg-[var(--peach)] text-white text-sm font-medium hover:opacity-90 transition-opacity duration-300 flex items-center justify-center gap-2"
      >
        <Check className="w-4 h-4" />
        Confirm route & build itinerary
      </button>
      <style>{`
        @keyframes widgetMount {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

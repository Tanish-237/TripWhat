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
      className="rounded-lg bg-[var(--surface)] border border-[var(--border)] p-3 mt-2"
      style={{ animation: 'widgetMount 0.3s ease-out forwards' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <MapPin className="w-3.5 h-3.5 text-[var(--muted)]" />
        <span className="text-xs font-medium text-[var(--ink)]">
          Proposed route · {data.totalNights} nights
        </span>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap mb-3">
        {data.cities.map((city, i) => (
          <React.Fragment key={city.name}>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--sage)]">
              <span className="text-xs font-medium text-[var(--ink)]">{city.name}</span>
              <span className="text-[10px] text-[var(--muted)] flex items-center gap-0.5">
                <Clock className="w-2.5 h-2.5" />
                {city.nights}n
              </span>
            </div>
            {i < data.cities.length - 1 && (
              <span className="text-[var(--muted)] text-xs">→</span>
            )}
          </React.Fragment>
        ))}
      </div>

      <button
        onClick={onConfirm}
        className="w-full py-2 px-3 rounded-md bg-[var(--ink)] text-white text-xs font-medium hover:bg-[#292524] transition-colors flex items-center justify-center gap-1.5"
      >
        <Check className="w-3.5 h-3.5" />
        Confirm route & build itinerary
      </button>
    </div>
  );
}

import React from 'react';
import { Sparkles } from 'lucide-react';

interface PlanCtaCardProps {
  data: { primaryAction: string; secondaryAction: string };
  onPrimary: () => void;
  onSecondary: () => void;
}

export function PlanCtaCard({ data, onPrimary, onSecondary }: PlanCtaCardProps) {
  return (
    <div
      className="rounded-2xl bg-[var(--surface)] p-5 mt-3"
      style={{
        boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)',
        animation: 'widgetMount 0.4s ease-out forwards',
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-[var(--peach)]" />
        <span className="text-sm font-medium text-[var(--ink)]">
          {data.primaryAction}
        </span>
      </div>
      <div className="flex gap-3">
        <button
          onClick={onPrimary}
          className="flex-1 py-2.5 px-4 rounded-[1.25rem] bg-[var(--peach)] text-white text-sm font-medium hover:opacity-90 transition-opacity duration-300"
        >
          {data.primaryAction}
        </button>
        <button
          onClick={onSecondary}
          className="flex-1 py-2.5 px-4 rounded-[1.25rem] bg-[var(--bg)] text-[var(--muted)] text-sm font-medium hover:bg-[var(--sage)] transition-colors duration-300"
        >
          {data.secondaryAction}
        </button>
      </div>
      <style>{`
        @keyframes widgetMount {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

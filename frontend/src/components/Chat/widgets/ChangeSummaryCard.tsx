import React from 'react';
import { Check, X, Edit, Plus, Minus, ArrowRight } from 'lucide-react';

interface ChangeSummaryCardProps {
  data: Array<{
    type: string;
    target?: string;
    description?: string;
    added?: string[];
    removed?: string[];
  }>;
}

export function ChangeSummaryCard({ data }: ChangeSummaryCardProps) {
  if (!data || data.length === 0) return null;

  return (
    <div
      className="rounded-2xl bg-[var(--surface)] p-5 mt-3"
      style={{
        boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)',
        animation: 'widgetMount 0.4s ease-out forwards',
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Edit className="w-4 h-4 text-[var(--peach)]" />
        <span className="text-sm font-medium text-[var(--ink)]">
          Updated plan with {data.length} {data.length === 1 ? 'change' : 'changes'}
        </span>
      </div>

      <div className="space-y-2">
        {data.map((change, i) => (
          <div key={i} className="flex items-start gap-2 text-sm">
            {change.type === 'add' && <Plus className="w-4 h-4 text-green-600 mt-0.5" />}
            {change.type === 'remove' && <Minus className="w-4 h-4 text-red-500 mt-0.5" />}
            {change.type === 'replace' && <ArrowRight className="w-4 h-4 text-[var(--peach)] mt-0.5" />}
            {change.type === 'modify' && <Edit className="w-4 h-4 text-[var(--muted)] mt-0.5" />}
            {!['add', 'remove', 'replace', 'modify'].includes(change.type) && (
              <Check className="w-4 h-4 text-[var(--muted)] mt-0.5" />
            )}
            <span className="text-[var(--ink)]">
              {change.description || change.target || `${change.type} ${change.target || ''}`}
            </span>
          </div>
        ))}
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

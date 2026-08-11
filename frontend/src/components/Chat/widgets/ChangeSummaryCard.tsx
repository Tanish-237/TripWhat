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
      className="rounded-lg bg-[var(--success-bg)] border border-[var(--success-border)] p-3 mt-2"
      style={{ animation: 'widgetMount 0.3s ease-out forwards' }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Edit className="w-3.5 h-3.5 text-[var(--success-text)]" />
        <span className="text-xs font-medium text-[var(--success-text)]">
          Updated plan with {data.length} {data.length === 1 ? 'change' : 'changes'}
        </span>
      </div>

      <div className="space-y-1.5">
        {data.map((change, i) => (
          <div key={i} className="flex items-start gap-2 text-xs">
            {change.type === 'add' && <Plus className="w-3.5 h-3.5 text-green-600 mt-0.5" />}
            {change.type === 'remove' && <Minus className="w-3.5 h-3.5 text-red-500 mt-0.5" />}
            {change.type === 'replace' && <ArrowRight className="w-3.5 h-3.5 text-[var(--peach)] mt-0.5" />}
            {change.type === 'modify' && <Edit className="w-3.5 h-3.5 text-[var(--muted)] mt-0.5" />}
            {!['add', 'remove', 'replace', 'modify'].includes(change.type) && (
              <Check className="w-3.5 h-3.5 text-[var(--muted)] mt-0.5" />
            )}
            <span className="text-[var(--ink)]">
              {change.description || change.target || `${change.type} ${change.target || ''}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

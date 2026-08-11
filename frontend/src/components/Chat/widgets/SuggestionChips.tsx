import React from 'react';

interface SuggestionChipsProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
}

export function SuggestionChips({ suggestions, onSelect }: SuggestionChipsProps) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {suggestions.map((s, i) => (
        <button
          key={i}
          onClick={() => onSelect(s)}
          className="text-xs px-2.5 py-1 rounded-md bg-[var(--sage)] text-[var(--ink)] hover:bg-[var(--lavender)] transition-colors"
          style={{ animation: 'widgetMount 0.3s ease-out forwards' }}
        >
          {s}
        </button>
      ))}
    </div>
  );
}

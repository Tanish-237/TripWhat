import React from 'react';

interface SuggestionChipsProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
}

export function SuggestionChips({ suggestions, onSelect }: SuggestionChipsProps) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {suggestions.map((s, i) => (
        <button
          key={i}
          onClick={() => onSelect(s)}
          className="text-xs px-3 py-1.5 rounded-full bg-[var(--lavender)] text-[var(--ink)] hover:bg-[var(--peach)] hover:text-white transition-all duration-300"
          style={{ animation: 'fadeInUp 0.4s ease-out forwards' }}
        >
          {s}
        </button>
      ))}
    </div>
  );
}

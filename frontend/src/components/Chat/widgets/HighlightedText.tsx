import type { ReactNode } from 'react';

export interface PlaceRef {
  name: string;
  placeId: string;
}

/** Render text with clickable, highlighted place names that open the detail panel. */
export function HighlightedText({
  text,
  places,
  onSelectPlace,
  className = '',
}: {
  text: string;
  places: PlaceRef[];
  onSelectPlace?: (pid: string) => void;
  className?: string;
}) {
  // Sort by name length (longest first) for greedy matching
  const refs = places
    .filter((p) => p.name && p.placeId)
    .sort((a, b) => b.name.length - a.name.length);

  if (refs.length === 0) {
    return <p className={className}>{text}</p>;
  }

  // Split text by place names and highlight them
  const parts: (string | ReactNode)[] = [text];
  for (const place of refs) {
    const newParts: (string | ReactNode)[] = [];
    for (const part of parts) {
      if (typeof part !== 'string') {
        newParts.push(part);
        continue;
      }
      const idx = part.toLowerCase().indexOf(place.name.toLowerCase());
      if (idx === -1) {
        newParts.push(part);
        continue;
      }
      const before = part.slice(0, idx);
      const match = part.slice(idx, idx + place.name.length);
      const after = part.slice(idx + place.name.length);
      if (before) newParts.push(before);
      newParts.push(
        <button
          key={`${place.name}-${idx}`}
          onClick={(e) => { e.stopPropagation(); onSelectPlace?.(place.placeId); }}
          className="font-medium text-[var(--ink)] underline decoration-[var(--peach)] decoration-2 underline-offset-2 hover:decoration-[var(--ink)] transition-colors cursor-pointer"
        >
          {match}
        </button>
      );
      if (after) newParts.push(after);
    }
    parts.length = 0;
    parts.push(...newParts);
  }

  return <p className={className}>{parts}</p>;
}

/** Render basic markdown (bold, numbered/bulleted lists, line breaks) as JSX. */
export function FormattedText({ text, className = '' }: { text: string; className?: string }) {
  const lines = text.split('\n');
  const elements: ReactNode[] = [];
  let listItems: ReactNode[] = [];
  let listType: 'ol' | 'ul' | null = null;

  const flushList = () => {
    if (listItems.length === 0) return;
    if (listType === 'ol') {
      elements.push(<ol key={`ol-${elements.length}`} className="list-decimal list-outside ml-4 space-y-1">{listItems}</ol>);
    } else {
      elements.push(<ul key={`ul-${elements.length}`} className="list-disc list-outside ml-4 space-y-1">{listItems}</ul>);
    }
    listItems = [];
    listType = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Numbered list item: "1. **Tokyo**: ..."
    const olMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    // Bulleted list item: "- **Tokyo**: ..."
    const ulMatch = trimmed.match(/^[-*]\s+(.*)/);

    if (olMatch) {
      if (listType !== 'ol') { flushList(); listType = 'ol'; }
      listItems.push(<li key={`li-${i}`}>{renderInline(olMatch[2])}</li>);
      continue;
    }
    if (ulMatch) {
      if (listType !== 'ul') { flushList(); listType = 'ul'; }
      listItems.push(<li key={`li-${i}`}>{renderInline(ulMatch[1])}</li>);
      continue;
    }

    flushList();
    if (trimmed === '') continue;
    elements.push(<p key={`p-${i}`}>{renderInline(trimmed)}</p>);
  }
  flushList();

  return <div className={className}>{elements}</div>;
}

/** Render inline markdown — **bold** and *italic*. */
function renderInline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  // Match **bold** first, then *italic*
  const regex = /\*\*(.+?)\*\*|\*(.+?)\*/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parts.push(text.slice(lastIdx, match.index));
    }
    if (match[1]) {
      parts.push(<strong key={`b-${key++}`} className="font-semibold text-[var(--ink)]">{match[1]}</strong>);
    } else if (match[2]) {
      parts.push(<em key={`i-${key++}`}>{match[2]}</em>);
    }
    lastIdx = regex.lastIndex;
  }
  if (lastIdx < text.length) {
    parts.push(text.slice(lastIdx));
  }
  return parts;
}

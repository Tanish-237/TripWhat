import type { ReactNode } from 'react';
import type { PlaceRef } from './HighlightedText';

export interface SearchResultPlace {
  name: string;
  placeId: string;
  imageUrl: string;
  rating?: number | null;
  type?: string;
  address?: string;
}

interface SearchResultsProps {
  data: { places: SearchResultPlace[] };
  text: string;
  onSelectPlace?: (placeId: string) => void;
}

export function SearchResults({ data, text, onSelectPlace }: SearchResultsProps) {
  const { places } = data;
  const refs: PlaceRef[] = places.map((p) => ({ name: p.name, placeId: p.placeId }));
  const photoPlaces = places.filter((p) => p.imageUrl).slice(0, 4);

  return (
    <div
      className="mt-2 mb-3 space-y-3"
      style={{ animation: 'widgetMount 0.4s ease-out forwards' }}
    >
      {/* Assistant text with markdown + clickable place names */}
      <FormattedTextWithPlaces
        text={text}
        places={refs}
        onSelectPlace={onSelectPlace}
        className="text-sm text-[var(--ink)] leading-relaxed space-y-1.5"
      />

      {/* Photo grid */}
      {photoPlaces.length > 0 && (
        <div className={`grid gap-2 ${photoPlaces.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {photoPlaces.map((p) => (
            <div key={p.placeId} className="group">
              <div
                className={`rounded-lg overflow-hidden bg-[var(--sage)] aspect-[4/3] ${p.placeId ? 'cursor-pointer' : ''}`}
                onClick={() => p.placeId && onSelectPlace?.(p.placeId)}
              >
                <img
                  src={p.imageUrl}
                  alt={p.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <div className="mt-1 flex items-center justify-between gap-1">
                <p className="text-[11px] font-medium text-[var(--ink)] leading-tight truncate">
                  {p.name}
                </p>
                {p.rating != null && (
                  <span className="text-[10px] text-[var(--muted)] shrink-0">
                    ★ {p.rating}
                  </span>
                )}
              </div>
              {p.type && (
                <p className="text-[10px] text-[var(--muted)] leading-tight truncate">{p.type}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Render markdown text (bold, lists) with place names as clickable links. */
function FormattedTextWithPlaces({
  text,
  places,
  onSelectPlace,
  className,
}: {
  text: string;
  places: PlaceRef[];
  onSelectPlace?: (pid: string) => void;
  className?: string;
}) {
  const refs = places
    .filter((p) => p.name && p.placeId)
    .sort((a, b) => b.name.length - a.name.length);

  const lines = text.split('\n');
  const elements: ReactNode[] = [];
  let listItems: ReactNode[] = [];
  let listType: 'ol' | 'ul' | null = null;

  const flushList = () => {
    if (listItems.length === 0) return;
    const Tag = listType === 'ol' ? 'ol' : 'ul';
    elements.push(
      <Tag
        key={`list-${elements.length}`}
        className={`list-outside ml-4 space-y-1.5 ${listType === 'ol' ? 'list-decimal' : 'list-disc'}`}
      >
        {listItems}
      </Tag>
    );
    listItems = [];
    listType = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    const olMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    const ulMatch = trimmed.match(/^[-*]\s+(.*)/);

    if (olMatch) {
      if (listType !== 'ol') { flushList(); listType = 'ol'; }
      listItems.push(<li key={`li-${i}`}>{renderInlineWithPlaces(olMatch[2], refs, onSelectPlace)}</li>);
      continue;
    }
    if (ulMatch) {
      if (listType !== 'ul') { flushList(); listType = 'ul'; }
      listItems.push(<li key={`li-${i}`}>{renderInlineWithPlaces(ulMatch[1], refs, onSelectPlace)}</li>);
      continue;
    }

    flushList();
    if (trimmed === '') continue;
    elements.push(<p key={`p-${i}`}>{renderInlineWithPlaces(trimmed, refs, onSelectPlace)}</p>);
  }
  flushList();

  return <div className={className}>{elements}</div>;
}

/** Render inline markdown (**bold**, *italic*) with place names as clickable buttons. */
function renderInlineWithPlaces(
  text: string,
  refs: PlaceRef[],
  onSelectPlace?: (pid: string) => void,
): ReactNode[] {
  // Split on place names first, then render markdown in text segments
  const segments = splitOnPlaces(text, refs, onSelectPlace);
  const result: ReactNode[] = [];
  let key = 0;

  for (const seg of segments) {
    if (seg.type === 'place') {
      result.push(seg.node);
    } else {
      result.push(...renderInlineMd(seg.text, key));
      key += 100;
    }
  }
  return result;
}

type Segment = { type: 'text'; text: string } | { type: 'place'; node: ReactNode };

function splitOnPlaces(
  text: string,
  refs: PlaceRef[],
  onSelectPlace?: (pid: string) => void,
): Segment[] {
  let segments: Segment[] = [{ type: 'text', text }];

  for (const place of refs) {
    const next: Segment[] = [];
    for (const seg of segments) {
      if (seg.type !== 'text') { next.push(seg); continue; }
      const idx = seg.text.toLowerCase().indexOf(place.name.toLowerCase());
      if (idx === -1) { next.push(seg); continue; }
      const before = seg.text.slice(0, idx);
      const match = seg.text.slice(idx, idx + place.name.length);
      const after = seg.text.slice(idx + place.name.length);
      if (before) next.push({ type: 'text', text: before });
      next.push({
        type: 'place',
        node: (
          <button
            key={`place-${place.placeId}-${idx}`}
            onClick={(e) => { e.stopPropagation(); onSelectPlace?.(place.placeId); }}
            className="font-medium text-[var(--ink)] underline decoration-[var(--peach)] decoration-2 underline-offset-2 hover:decoration-[var(--ink)] transition-colors cursor-pointer"
          >
            {match}
          </button>
        ),
      });
      if (after) next.push({ type: 'text', text: after });
    }
    segments = next;
  }
  return segments;
}

/** Render **bold** and *italic* in a text string. */
function renderInlineMd(text: string, baseKey: number): ReactNode[] {
  const parts: ReactNode[] = [];
  const regex = /\*\*(.+?)\*\*|\*(.+?)\*/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;
  let key = baseKey;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) parts.push(text.slice(lastIdx, match.index));
    if (match[1]) {
      parts.push(<strong key={`b-${key++}`} className="font-semibold text-[var(--ink)]">{match[1]}</strong>);
    } else if (match[2]) {
      parts.push(<em key={`i-${key++}`}>{match[2]}</em>);
    }
    lastIdx = regex.lastIndex;
  }
  if (lastIdx < text.length) parts.push(text.slice(lastIdx));
  return parts;
}

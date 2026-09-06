import { useState, useRef, useEffect } from 'react';
import { MoreVertical, Clock, MessageSquare, ArrowUpDown, Trash2, Check, X } from 'lucide-react';

interface ActivityData {
  id: string;
  name?: string;
  title?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
}

interface SlotData {
  id: string;
  startTime: string;
  endTime: string;
}

interface ActivityMenuProps {
  activity: ActivityData;
  day: number;
  totalDays: number;
  slot?: SlotData;
  onRemove: (activityId: string) => Promise<void>;
  onEditTime: (slotId: string, startTime: string, endTime: string) => Promise<void>;
  onAddCaption: (activityId: string, caption: string) => Promise<void>;
  onMove: (activityId: string, toDay: number) => Promise<void>;
}

export function ActivityMenu({
  activity, day, totalDays, slot,
  onRemove, onEditTime, onAddCaption, onMove,
}: ActivityMenuProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'menu' | 'time' | 'caption' | 'move'>('menu');
  const [loading, setLoading] = useState(false);
  const [startTime, setStartTime] = useState(slot?.startTime || '09:00');
  const [endTime, setEndTime] = useState(slot?.endTime || '12:00');
  const [caption, setCaption] = useState(activity.description || '');
  const [moveDay, setMoveDay] = useState(day);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
        setMode('menu');
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const reset = () => {
    setOpen(false);
    setMode('menu');
  };

  const handleRemove = async () => {
    setLoading(true);
    try {
      await onRemove(activity.id);
      reset();
    } catch (err) {
      console.error('[ActivityMenu] Remove failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTime = async () => {
    if (!slot) return;
    setLoading(true);
    try {
      await onEditTime(slot.id, startTime, endTime);
      reset();
    } catch (err) {
      console.error('[ActivityMenu] Edit time failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCaption = async () => {
    setLoading(true);
    try {
      await onAddCaption(activity.id, caption);
      reset();
    } catch (err) {
      console.error('[ActivityMenu] Caption failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMove = async () => {
    if (moveDay === day) {
      reset();
      return;
    }
    setLoading(true);
    try {
      await onMove(activity.id, moveDay);
      reset();
    } catch (err) {
      console.error('[ActivityMenu] Move failed:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className="p-1 rounded text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--bg)] transition-colors shrink-0"
        title="More options"
      >
        <MoreVertical className="w-3 h-3" />
      </button>
    );
  }

  return (
    <div ref={menuRef} className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => { setOpen(false); setMode('menu'); }}
        className="p-1 rounded text-[var(--ink)] bg-[var(--bg)] transition-colors"
      >
        <MoreVertical className="w-3 h-3" />
      </button>

      {mode === 'menu' && (
        <div className="absolute right-0 top-7 z-20 w-44 rounded-md border border-[var(--border)] bg-[var(--surface)] shadow-lg overflow-hidden">
          {slot && (
            <button
              onClick={() => setMode('time')}
              disabled={loading}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-[var(--ink)] hover:bg-[var(--bg)] transition-colors text-left"
            >
              <Clock className="w-3 h-3 text-[var(--muted)]" /> Edit time
            </button>
          )}
          <button
            onClick={() => setMode('caption')}
            disabled={loading}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-[var(--ink)] hover:bg-[var(--bg)] transition-colors text-left"
          >
            <MessageSquare className="w-3 h-3 text-[var(--muted)]" /> Add caption
          </button>
          {totalDays > 1 && (
            <button
              onClick={() => setMode('move')}
              disabled={loading}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-[var(--ink)] hover:bg-[var(--bg)] transition-colors text-left"
            >
              <ArrowUpDown className="w-3 h-3 text-[var(--muted)]" /> Move to another day
            </button>
          )}
          <div className="border-t border-[var(--border)]" />
          <button
            onClick={handleRemove}
            disabled={loading}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 transition-colors text-left"
          >
            <Trash2 className="w-3 h-3" /> Remove activity
          </button>
        </div>
      )}

      {mode === 'time' && slot && (
        <div className="absolute right-0 top-7 z-20 w-48 rounded-md border border-[var(--border)] bg-[var(--surface)] shadow-lg p-3">
          <p className="text-xs font-medium text-[var(--ink)] mb-2">Edit time</p>
          <div className="flex items-center gap-2 mb-2">
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="text-xs px-2 py-1 border border-[var(--border)] rounded bg-[var(--bg)] text-[var(--ink)]"
            />
            <span className="text-xs text-[var(--muted)]">→</span>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="text-xs px-2 py-1 border border-[var(--border)] rounded bg-[var(--bg)] text-[var(--ink)]"
            />
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleSaveTime}
              disabled={loading}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-[var(--ink)] text-white rounded hover:opacity-90 transition-opacity"
            >
              <Check className="w-3 h-3" /> Save
            </button>
            <button
              onClick={() => setMode('menu')}
              disabled={loading}
              className="flex items-center gap-1 px-2 py-1 text-xs text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
            >
              <X className="w-3 h-3" /> Cancel
            </button>
          </div>
        </div>
      )}

      {mode === 'caption' && (
        <div className="absolute right-0 top-7 z-20 w-56 rounded-md border border-[var(--border)] bg-[var(--surface)] shadow-lg p-3">
          <p className="text-xs font-medium text-[var(--ink)] mb-2">Add caption</p>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Add a note or description..."
            rows={3}
            className="w-full text-xs px-2 py-1.5 border border-[var(--border)] rounded bg-[var(--bg)] text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--muted)] resize-none mb-2"
            autoFocus
          />
          <div className="flex items-center gap-1">
            <button
              onClick={handleSaveCaption}
              disabled={loading}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-[var(--ink)] text-white rounded hover:opacity-90 transition-opacity"
            >
              <Check className="w-3 h-3" /> Save
            </button>
            <button
              onClick={() => setMode('menu')}
              disabled={loading}
              className="flex items-center gap-1 px-2 py-1 text-xs text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
            >
              <X className="w-3 h-3" /> Cancel
            </button>
          </div>
        </div>
      )}

      {mode === 'move' && (
        <div className="absolute right-0 top-7 z-20 w-44 rounded-md border border-[var(--border)] bg-[var(--surface)] shadow-lg p-3">
          <p className="text-xs font-medium text-[var(--ink)] mb-2">Move to day</p>
          <div className="flex flex-wrap gap-1 mb-2">
            {Array.from({ length: totalDays }, (_, i) => i + 1).map((d) => (
              <button
                key={d}
                onClick={() => setMoveDay(d)}
                disabled={loading}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  moveDay === d
                    ? 'bg-[var(--lavender)] text-[var(--ink)]'
                    : 'text-[var(--muted)] hover:bg-[var(--sage)]'
                }`}
              >
                Day {d}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleMove}
              disabled={loading || moveDay === day}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-[var(--ink)] text-white rounded hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <Check className="w-3 h-3" /> Move
            </button>
            <button
              onClick={() => setMode('menu')}
              disabled={loading}
              className="flex items-center gap-1 px-2 py-1 text-xs text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
            >
              <X className="w-3 h-3" /> Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

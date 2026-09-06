import { useEffect } from 'react';
import { Hotel, Plane, MapPin, Utensils, Trash2, ExternalLink, Star } from 'lucide-react';
import { useSavedStore } from '../stores/savedStore';
import { imgUrl } from '../lib/image';

const TYPE_ICONS: Record<string, any> = {
  hotel: Hotel,
  flight: Plane,
  place: MapPin,
  restaurant: Utensils,
};

export function SavedTab() {
  const { items, fetchItems, removeItem, loading } = useSavedStore();

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  if (loading && items.length === 0) {
    return (
      <div className="flex items-center justify-center h-full py-12">
        <p className="text-sm text-[var(--muted)]">Loading saved items...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12 text-center">
        <div className="w-10 h-10 rounded-lg bg-[var(--sage)] flex items-center justify-center mb-3">
          <MapPin className="w-5 h-5 text-[var(--muted)]" />
        </div>
        <p className="text-sm text-[var(--muted)]">
          Save hotels, flights, and places by tapping the bookmark icon.
        </p>
      </div>
    );
  }

  // Group by type
  const grouped: Record<string, typeof items> = {};
  for (const item of items) {
    if (!grouped[item.itemType]) grouped[item.itemType] = [];
    grouped[item.itemType].push(item);
  }

  const typeLabels: Record<string, string> = {
    hotel: 'Hotels',
    flight: 'Flights',
    place: 'Places',
    restaurant: 'Restaurants',
  };

  return (
    <div className="p-4 space-y-6">
      {Object.entries(grouped).map(([type, typeItems]) => {
        const Icon = TYPE_ICONS[type] || MapPin;
        return (
          <div key={type}>
            <div className="flex items-center gap-2 mb-2">
              <Icon className="w-4 h-4 text-[var(--muted)]" />
              <span className="text-xs font-semibold text-[var(--ink)]">{typeLabels[type] || type}</span>
              <span className="text-[10px] text-[var(--muted)]">({typeItems.length})</span>
            </div>
            <div className="space-y-2">
              {typeItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-[var(--surface)] border border-[var(--border)]"
                >
                  {item.data?.imageUrl && (
                    <img
                      src={imgUrl(item.data.imageUrl)}
                      alt={item.name}
                      className="w-12 h-12 rounded-md object-cover shrink-0"
                      loading="lazy"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[var(--ink)] truncate">{item.name}</p>
                    {item.data?.address && (
                      <p className="text-[10px] text-[var(--muted)] truncate mt-0.5">{item.data.address}</p>
                    )}
                    {item.data?.ratePerNight != null && (
                      <p className="text-[10px] text-[var(--ink)] mt-0.5">
                        {item.data.currency || '$'}{item.data.ratePerNight.toLocaleString()}/night
                      </p>
                    )}
                    {item.data?.price != null && (
                      <p className="text-[10px] text-[var(--ink)] mt-0.5">
                        {item.data.currency || '$'}{item.data.price.toLocaleString()}
                      </p>
                    )}
                    {item.data?.rating != null && (
                      <div className="flex items-center gap-0.5 mt-0.5">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span className="text-[10px] text-[var(--ink)]">{item.data.rating}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {item.data?.bookingLink && (
                      <a
                        href={item.data.bookingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-1 rounded-md bg-[var(--ink)] text-white text-[10px] font-medium hover:bg-[#292524] transition-colors"
                      >
                        Book
                      </a>
                    )}
                    {item.data?.website && !item.data?.bookingLink && (
                      <a
                        href={item.data.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded hover:bg-[var(--sage)] text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-1 rounded hover:bg-[var(--sage)] text-[var(--muted)] hover:text-red-500 transition-colors"
                      title="Remove"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

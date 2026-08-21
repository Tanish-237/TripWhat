import { useEffect, useState } from 'react';
import {
  X, Star, MapPin, Phone, Globe, Clock, ChevronLeft, ChevronRight,
  Navigation, ExternalLink, ArrowRight, Loader2,
} from 'lucide-react';
import { placesApi } from '../lib/api';

interface PlaceDetails {
  placeId: string;
  name: string;
  address: string;
  phoneNumber: string;
  internationalPhone: string;
  website: string;
  mapsUrl: string;
  rating: number | null;
  userRatingsTotal: number;
  photos: string[];
  reviews: {
    author: string;
    rating: number;
    text: string;
    time: number;
    profilePhoto: string;
    language: string;
  }[];
  openingHours: string[];
  isOpen: boolean | null;
  priceLevel: number | null;
  businessStatus: string;
  types: string[];
  coordinates: { lat: number; lng: number };
  description: string;
  area: string;
  locality: string;
  country: string;
  alternates: {
    placeId: string;
    name: string;
    address: string;
    rating: number | null;
    coordinates: { lat: number; lng: number };
  }[];
}

interface Props {
  placeId: string;
  onClose: () => void;
  onSelectAlternate?: (placeId: string) => void;
}

const PRICE_LABELS = ['', 'Inexpensive', 'Moderate', 'Expensive', 'Very Expensive'];

const TYPE_LABELS: Record<string, string> = {
  tourist_attraction: 'Attraction',
  restaurant: 'Restaurant',
  lodging: 'Hotel',
  museum: 'Museum',
  amusement_park: 'Theme Park',
  cafe: 'Cafe',
  bar: 'Bar',
  shopping_mall: 'Shopping',
  park: 'Park',
  church: 'Landmark',
  hindu_temple: 'Temple',
  mosque: 'Mosque',
  art_gallery: 'Gallery',
  point_of_interest: 'Point of Interest',
  establishment: 'Establishment',
};

export function PlaceDetailPanel({ placeId, onClose, onSelectAlternate }: Props) {
  const [details, setDetails] = useState<PlaceDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPhotoIndex(0);
    placesApi
      .details(placeId)
      .then((res) => {
        if (!cancelled) setDetails(res.data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.detail || 'Failed to load details');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [placeId]);

  const displayType = details?.types
    ?.map((t) => TYPE_LABELS[t])
    .filter(Boolean)
    .slice(0, 2)
    .join(' · ');

  return (
    <div className="absolute inset-0 z-30 bg-[var(--surface)] flex flex-col overflow-hidden animate-in slide-in-from-right">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-12 border-b border-[var(--border)] shrink-0">
        <span className="text-sm font-medium text-[var(--ink)] truncate">Place Details</span>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md hover:bg-[var(--sage)] text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[520px] mx-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full">
              <Loader2 className="w-6 h-6 text-[var(--muted)] animate-spin mb-2" />
              <p className="text-xs text-[var(--muted)]">Loading details...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full px-6 text-center">
              <p className="text-sm text-red-500 mb-2">{error}</p>
              <button
                onClick={onClose}
                className="text-xs text-[var(--muted)] hover:text-[var(--ink)] underline"
              >
                Go back
              </button>
            </div>
          ) : details ? (
            <>
              {/* Photo carousel */}
              {details.photos.length > 0 && (
                <div className="relative h-64 bg-[var(--sage)] shrink-0">
                  <img
                    src={details.photos[photoIndex]}
                    alt={details.name}
                    className="w-full h-full object-cover"
                  />
                  {details.photos.length > 1 && (
                    <>
                      <button
                        onClick={() => setPhotoIndex((i) => (i - 1 + details.photos.length) % details.photos.length)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setPhotoIndex((i) => (i + 1) % details.photos.length)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                        {details.photos.map((_, i) => (
                          <span
                            key={i}
                            className={`w-1.5 h-1.5 rounded-full transition-colors ${
                              i === photoIndex ? 'bg-white' : 'bg-white/40'
                            }`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Title section */}
              <div className="px-4 py-3 border-b border-[var(--border)]">
                <h2 className="text-base font-semibold text-[var(--ink)] leading-tight">
                  {details.name}
                </h2>
                {displayType && (
                  <p className="text-[10px] text-[var(--muted)] uppercase tracking-wide mt-1">
                    {displayType}
                  </p>
                )}
                {/* Rating + status row */}
                <div className="flex items-center gap-3 mt-2">
                  {details.rating != null && (
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span className="text-xs font-medium text-[var(--ink)]">{details.rating}</span>
                      {details.userRatingsTotal > 0 && (
                        <span className="text-[10px] text-[var(--muted)]">
                          ({details.userRatingsTotal.toLocaleString()})
                        </span>
                      )}
                    </div>
                  )}
                  {details.priceLevel != null && details.priceLevel > 0 && (
                    <span className="text-[10px] text-[var(--muted)]">
                      {'$'.repeat(details.priceLevel)} · {PRICE_LABELS[details.priceLevel]}
                    </span>
                  )}
                  {details.isOpen != null && (
                    <span
                      className={`text-[10px] font-medium ${
                        details.isOpen ? 'text-green-600' : 'text-red-500'
                      }`}
                    >
                      {details.isOpen ? 'Open now' : 'Closed'}
                    </span>
                  )}
                  {details.businessStatus && details.businessStatus !== 'OPERATIONAL' && (
                    <span className="text-[10px] text-amber-600 capitalize">
                      {details.businessStatus.replace(/_/g, ' ').toLowerCase()}
                    </span>
                  )}
                </div>
              </div>

              {/* Description */}
              {details.description && (
                <div className="px-4 py-3 border-b border-[var(--border)]">
                  <p className="text-xs text-[var(--ink)] leading-relaxed">{details.description}</p>
                </div>
              )}

              {/* Info rows */}
              <div className="px-4 py-2 border-b border-[var(--border)] space-y-2">
                {details.address && (
                  <InfoRow icon={MapPin} text={details.address} />
                )}
                {(details.locality || details.area || details.country) && (
                  <InfoRow
                    icon={Navigation}
                    text={[details.area, details.locality, details.country].filter(Boolean).join(', ')}
                  />
                )}
                {(details.phoneNumber || details.internationalPhone) && (
                  <a
                    href={`tel:${details.internationalPhone || details.phoneNumber}`}
                    className="flex items-start gap-2 text-xs text-[var(--ink)] hover:text-[var(--lavender)] transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5 text-[var(--muted)] shrink-0 mt-0.5" />
                    <span>{details.internationalPhone || details.phoneNumber}</span>
                  </a>
                )}
                {details.website && (
                  <a
                    href={details.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-2 text-xs text-[var(--ink)] hover:text-[var(--lavender)] transition-colors"
                  >
                    <Globe className="w-3.5 h-3.5 text-[var(--muted)] shrink-0 mt-0.5" />
                    <span className="truncate">{details.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
                    <ExternalLink className="w-3 h-3 text-[var(--muted)] shrink-0 mt-0.5" />
                  </a>
                )}
                {details.mapsUrl && (
                  <a
                    href={details.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-2 text-xs text-[var(--ink)] hover:text-[var(--lavender)] transition-colors"
                  >
                    <MapPin className="w-3.5 h-3.5 text-[var(--muted)] shrink-0 mt-0.5" />
                    <span>View on Google Maps</span>
                    <ExternalLink className="w-3 h-3 text-[var(--muted)] shrink-0 mt-0.5" />
                  </a>
                )}
              </div>

              {/* Opening hours */}
              {details.openingHours.length > 0 && (
                <div className="px-4 py-3 border-b border-[var(--border)]">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Clock className="w-3.5 h-3.5 text-[var(--muted)]" />
                    <span className="text-xs font-medium text-[var(--ink)]">Opening Hours</span>
                  </div>
                  <div className="space-y-0.5">
                    {details.openingHours.map((h, i) => (
                      <p key={i} className="text-[10px] text-[var(--muted)] leading-relaxed">
                        {h}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Reviews */}
              {details.reviews.length > 0 && (
                <div className="px-4 py-3 border-b border-[var(--border)]">
                  <span className="text-xs font-medium text-[var(--ink)] block mb-2">
                    Top Reviews
                  </span>
                  <div className="space-y-3">
                    {details.reviews.map((r, i) => (
                      <div key={i} className="flex gap-2.5">
                        {r.profilePhoto ? (
                          <img
                            src={r.profilePhoto}
                            alt={r.author}
                            className="w-6 h-6 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-[var(--sage)] flex items-center justify-center shrink-0">
                            <span className="text-[10px] font-medium text-[var(--muted)]">
                              {r.author.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-medium text-[var(--ink)] truncate">
                              {r.author}
                            </span>
                            <div className="flex items-center gap-0.5 shrink-0">
                              <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                              <span className="text-[10px] text-[var(--muted)]">{r.rating}</span>
                            </div>
                          </div>
                          <p className="text-[10px] text-[var(--muted)] leading-relaxed mt-0.5 line-clamp-3">
                            {r.text}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Alternates */}
              {details.alternates.length > 0 && (
                <div className="px-4 py-3">
                  <span className="text-xs font-medium text-[var(--ink)] block mb-2">
                    Similar nearby
                  </span>
                  <div className="space-y-1.5">
                    {details.alternates.map((alt) => (
                      <button
                        key={alt.placeId}
                        onClick={() => onSelectAlternate?.(alt.placeId)}
                        className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-[var(--sage)] transition-colors text-left group"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-[var(--ink)] truncate">{alt.name}</p>
                          {alt.address && (
                            <p className="text-[10px] text-[var(--muted)] truncate mt-0.5">{alt.address}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          {alt.rating != null && (
                            <div className="flex items-center gap-0.5">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              <span className="text-[10px] text-[var(--muted)]">{alt.rating}</span>
                            </div>
                          )}
                          <ArrowRight className="w-3 h-3 text-[var(--muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}


function InfoRow({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-3.5 h-3.5 text-[var(--muted)] shrink-0 mt-0.5" />
      <span className="text-xs text-[var(--ink)] leading-relaxed">{text}</span>
    </div>
  );
}

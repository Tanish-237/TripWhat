// GeoJSON response format from OpenTripMap
export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

export interface GeoJSONFeature {
  type: 'Feature';
  id: string;
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [lon, lat]
  };
  properties: {
    xid: string;
    name: string;
    dist?: number;
    rate?: number;
    osm?: string;
    wikidata?: string;
    kinds: string;
  };
}

// OpenTripMap API types
export interface OpenTripMapPlace {
  xid: string;
  name: string;
  dist?: number;
  point: {
    lon: number;
    lat: number;
  };
  kinds: string;
  osm?: string;
  wikidata?: string;
}

export interface PlaceDetails {
  xid: string;
  name: string;
  address?: {
    road?: string;
    city?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
  rate: number; // 1-7, tourist rating
  kinds: string;
  sources: {
    geometry: string;
    attributes: string[];
  };
  otm?: string;
  wikipedia?: string;
  image?: string;
  preview?: {
    source: string;
    height: number;
    width: number;
  };
  wikipedia_extracts?: {
    title: string;
    text: string;
    html: string;
  };
  point: {
    lon: number;
    lat: number;
  };
}

// Our structured output
export interface Destination {
  id: string;
  name: string;
  description?: string;
  location: {
    latitude: number;
    longitude: number;
  };
  category: string[];
  rating?: number;
  image?: string;
  distance?: number;
}

export interface SearchDestinationsParams {
  query: string;
  limit?: number;
}

export interface GetPlaceDetailsParams {
  placeId: string;
}

export interface GetNearbyAttractionsParams {
  latitude: number;
  longitude: number;
  radius: number; // in meters
  limit?: number;
  kinds?: string; // e.g., "museums,parks,monuments"
}

import axios from 'axios';

const OPENTRIPMAP_BASE = 'https://api.opentripmap.com/0.1/en/places';
const GEODB_BASE = 'https://wft-geo-db.p.rapidapi.com/v1/geo';

export interface PlaceResult {
  id: string;
  name: string;
  location: string;
  country: string;
  state: string;
  description: string;
  type: string;
  coordinates: { lat: number; lon: number };
  imageUrl: string;
  searchTerms: string[];
  rating: number;
  kinds: string;
}

export interface AutocompleteResult {
  id: string;
  name: string;
  location: string;
  country: string;
  state: string;
  description: string;
  type: string;
  coordinates: { lat: number; lon: number };
  searchTerms: string[];
  population?: number;
}

function getTypeLabel(type: string): string {
  switch (type?.toLowerCase()) {
    case 'major_city': return 'Major City';
    case 'city': return 'City';
    case 'town': return 'Town';
    case 'capital': return 'Capital City';
    default: return 'Place';
  }
}

export class PlacesService {
  private get otmApiKey(): string {
    return process.env.OPENTRIPMAP_API_KEY || '';
  }
  private get geodbApiKey(): string {
    return process.env.GEODB_API_KEY || '';
  }
  private get geodbHost(): string {
    return process.env.GEODB_HOST || '';
  }

  async searchPlaces(query: string, limit: number = 10): Promise<PlaceResult[]> {
    if (!this.otmApiKey) return [];

    const queryVariations = [query, `${query} city`, query.replace(/\s+/g, '')];

    let lat = 0, lon = 0, locationName = '', country = '', state = '';

    for (const qv of queryVariations) {
      try {
        const geoRes = await axios.get(`${OPENTRIPMAP_BASE}/geoname`, {
          params: { name: qv, apikey: this.otmApiKey },
          timeout: 5000,
        });
        if (geoRes.data?.lat) {
          ({ lat, lon, name: locationName, country } = geoRes.data);
          state = geoRes.data.state || '';
          break;
        }
      } catch { continue; }
    }

    if (!lat || !lon) return [];

    await new Promise((r) => setTimeout(r, 100));

    const placesRes = await axios.get(`${OPENTRIPMAP_BASE}/radius`, {
      params: {
        radius: 10000, lon, lat,
        limit: Math.min(limit, 20),
        format: 'geojson', rate: 3,
        apikey: this.otmApiKey,
      },
      timeout: 10000,
    });

    const features = placesRes.data?.features;
    if (!features || !Array.isArray(features)) return [];

    const places: PlaceResult[] = [];
    for (let i = 0; i < Math.min(features.length, limit); i++) {
      const feature = features[i];
      const props = feature.properties;
      const coords = feature.geometry.coordinates;

      if (i > 0) await new Promise((r) => setTimeout(r, 200));

      let details: any = null;
      try {
        if (props.xid) {
          const detailRes = await axios.get(`${OPENTRIPMAP_BASE}/xid/${props.xid}`, {
            params: { apikey: this.otmApiKey },
            timeout: 5000,
          });
          details = detailRes.data;
        }
      } catch { /* skip */ }

      const kinds = props.kinds || '';
      let type = 'attraction';
      if (kinds.includes('museums')) type = 'museum';
      else if (kinds.includes('historic')) type = 'historic';
      else if (kinds.includes('natural')) type = 'natural';
      else if (kinds.includes('cultural')) type = 'cultural';
      else if (kinds.includes('religion') || kinds.includes('architecture')) type = 'historic';

      places.push({
        id: props.xid || `otm_${Math.random().toString(36).slice(2, 11)}`,
        name: props.name || 'Unknown Place',
        location: locationName,
        country: country || '',
        state,
        description: details?.wikipedia_extracts?.text?.slice(0, 200) ||
          details?.info?.descr || kinds.split(',').join(', ') || 'Tourist attraction',
        type,
        coordinates: { lat: coords[1], lon: coords[0] },
        imageUrl: details?.preview?.source || details?.image ||
          `https://source.unsplash.com/800x600/?${encodeURIComponent(props.name + ' ' + locationName)}`,
        searchTerms: [
          props.name?.toLowerCase(),
          locationName?.toLowerCase(),
          country?.toLowerCase(),
          ...kinds.split(',').filter((k: string) => k.trim()),
        ].filter(Boolean) as string[],
        rating: props.rate || 0,
        kinds,
      });
    }

    return places
      .filter((p) => p.name && p.name !== 'Unknown Place')
      .sort((a, b) => (b.rating || 0) - (a.rating || 0));
  }

  async getAutocomplete(query: string, limit: number = 8): Promise<AutocompleteResult[]> {
    if (!this.geodbApiKey || !query || query.length < 2) return [];

    try {
      const res = await axios.get(`${GEODB_BASE}/cities`, {
        params: {
          namePrefix: query, limit,
          minPopulation: 1000, sort: '-population',
          languageCode: 'en',
        },
        headers: {
          'X-RapidAPI-Key': this.geodbApiKey,
          'X-RapidAPI-Host': this.geodbHost,
        },
        timeout: 5000,
      });

      if (!res.data?.data) return [];

      return res.data.data.map((city: any) => {
        let type = 'city';
        if (city.population > 1000000) type = 'major_city';
        else if (city.population > 100000) type = 'city';
        else if (city.population > 10000) type = 'town';
        else type = 'place';

        const locationParts = [city.region, city.country].filter(Boolean);
        const locationDesc = locationParts.join(', ');

        return {
          id: `geodb_${city.id}`,
          name: city.name,
          location: locationDesc,
          country: city.country || '',
          state: city.region || '',
          description: `${getTypeLabel(type)}${locationDesc ? ` in ${locationDesc}` : ''}${city.population ? ` (pop. ${city.population.toLocaleString()})` : ''}`,
          type,
          coordinates: { lat: city.latitude, lon: city.longitude },
          searchTerms: [city.name?.toLowerCase(), city.country?.toLowerCase(), city.region?.toLowerCase()].filter(Boolean) as string[],
          population: city.population,
        };
      });
    } catch {
      return [];
    }
  }
}

export const placesService = new PlacesService();

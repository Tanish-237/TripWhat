import type { FlightProvider, HotelProvider } from './types';
import { SerpApiProvider } from './serpapi/serpApiProvider';

/**
 * Inventory module — provider-agnostic factory.
 *
 * Reads INVENTORY_PROVIDER env var and exports the active provider.
 * To swap providers (e.g. Duffel), implement the FlightProvider/HotelProvider
 * interfaces and add a case here.
 */

let _flightProvider: FlightProvider | null = null;
let _hotelProvider: HotelProvider | null = null;

function getProvider(): { flight: FlightProvider; hotel: HotelProvider } {
  if (_flightProvider && _hotelProvider) {
    return { flight: _flightProvider, hotel: _hotelProvider };
  }

  const providerName = process.env.INVENTORY_PROVIDER || 'serpapi';

  switch (providerName) {
    case 'serpapi': {
      const apiKey = process.env.SERPAPI_API_KEY || '';
      if (!apiKey) {
        console.warn('[INVENTORY] SERPAPI_API_KEY not configured');
      }
      const provider = new SerpApiProvider(apiKey);
      _flightProvider = provider;
      _hotelProvider = provider;
      break;
    }
    default:
      throw new Error(`Unknown inventory provider: ${providerName}`);
  }

  return { flight: _flightProvider!, hotel: _hotelProvider! };
}

export function getFlightProvider(): FlightProvider {
  return getProvider().flight;
}

export function getHotelProvider(): HotelProvider {
  return getProvider().hotel;
}

export function resetProviders(): void {
  _flightProvider = null;
  _hotelProvider = null;
}

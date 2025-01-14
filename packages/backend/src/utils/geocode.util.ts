import axios from 'axios';
import { Logger } from '@nestjs/common';

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

export class GeocodingError extends Error {
  constructor(message: string, public readonly originalError?: Error) {
    super(message);
    this.name = 'GeocodingError';
  }
}

export async function geocodeAddress(
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  },
  apiKey: string
): Promise<GeocodeResult> {
  const logger = new Logger('GeocodeUtil');
  logger.log('key', apiKey);

  console.log(`Geocoding API key: ${apiKey}`);
  try {
    const response = await axios.get(
      'https://api.opencagedata.com/geocode/v1/json',
      {
        params: {
          q: `${address.street}, ${address.city}, ${address.state} ${address.zip}, ${address.country}`,
          key: apiKey,
          limit: 1,
        },
      }
    );

    console.log(`Geocoding response: ${JSON.stringify(response.data)}`);

    if (response.data.results.length === 0) {
      throw new Error('No results found for the address');
    }

    const result = response.data.results[0];
    return {
      latitude: result.geometry.lat,
      longitude: result.geometry.lng,
      formattedAddress: result.formatted,
    };
  } catch (error) {
    logger.error(`Geocoding failed: ${error.message}`);
    throw new GeocodingError(
      'Failed to geocode address', 
      error instanceof Error ? error : undefined
    );
  }
} 
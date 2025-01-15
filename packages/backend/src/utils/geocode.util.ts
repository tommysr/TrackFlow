import axios from 'axios';
import { Logger } from '@nestjs/common';

export interface GeocodeResult {
  latitude: number;
  longitude: number;
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
    zip: string;
    country: string;
  },
  apiKey: string
): Promise<GeocodeResult> {
  const logger = new Logger('GeocodeUtil');
  const searchText = `${address.street}, ${address.city}, ${address.zip}, ${address.country}`;

  logger.log(`Geocoding query: ${searchText}`);
  
  try {
    const response = await axios.get(
      'https://api.openrouteservice.org/geocode/search',
      {
        params: {
          api_key: apiKey,
          text: searchText,
          size: 1,
        },
      }
    );

    if (!response.data.features || response.data.features.length === 0) {
      throw new Error('No results found for the address');
    }

    const feature = response.data.features[0];
    const [longitude, latitude] = feature.geometry.coordinates;

    logger.log(`Geocoding result: ${JSON.stringify(feature)}`);
    
    return {
      latitude,
      longitude
    };
  } catch (error) {
    logger.error(`Geocoding failed: ${error.message}`);
    throw new GeocodingError(
      'Failed to geocode address',
      error instanceof Error ? error : undefined
    );
  }
} 
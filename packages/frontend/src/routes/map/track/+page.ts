import type { PageLoad } from './$types';
import type { PublicShipmentTrackingDto } from '../../../lib/types/shipment.types';

export const load: PageLoad = async ({ url }): Promise<{ shipment: PublicShipmentTrackingDto | null }> => {
  try {
    const token = url.searchParams.get('token');
    const response = await fetch(`http://localhost:5000/shipments/tracking?token=${token}`);
    
    if (!response.ok) {
      return { shipment: null };
    }

    const shipment: PublicShipmentTrackingDto = await response.json();
    return { shipment };
  } catch (error) {
    console.error('Failed to fetch tracking information:', error);
    return { shipment: null };
  }
}; 
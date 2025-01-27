import type { PageLoad } from './$types';
import type { PublicShipmentTrackingDto } from '../../../../lib/types/shipment.types';

export const load: PageLoad = async ({ params }): Promise<{ shipment: PublicShipmentTrackingDto | null }> => {
  try {
    const response = await fetch(`http://localhost:5000/shipments/tracking?token=${params.token}`);
    
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
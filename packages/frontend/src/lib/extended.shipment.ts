import type { Shipment } from '../../../declarations/canister/canister.did';

export interface ExtendedShipment extends Shipment {
	pickupDate?: Date;
	deliveryDate?: Date;
	lastUpdate?: Date;
	eta?: number; // minutes
	currentLocation?: {
		lat: number;
		lng: number;
	};
	routeSegment?: {
		points: Array<{lat: number, lng: number}>;
	};
}
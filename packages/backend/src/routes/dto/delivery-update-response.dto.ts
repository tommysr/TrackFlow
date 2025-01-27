import { RouteStop } from '../entities/routeStop.entity';
import { Shipment } from '../../shipments/entities/shipment.entity';
import { ApiProperty } from '@nestjs/swagger';

export class DeliveryUpdateResponseDto {
  @ApiProperty({ 
    type: () => RouteStop, 
    required: false,
    description: 'Updated stop information after delivery attempt'
  })
  updatedStop?: RouteStop;

  @ApiProperty({ 
    type: () => Shipment, 
    required: false,
    description: 'Updated shipment information after delivery attempt'
  })
  updatedShipment?: Shipment;

  @ApiProperty({ 
    type: 'boolean',
    description: 'Indicates if the delivery update was successful',
    example: true
  })
  wasUpdated: boolean;
}


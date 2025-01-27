import { ApiProperty } from "@nestjs/swagger";


export class DeliveryUpdateDto {
  @ApiProperty({
    type: 'string',
    description: 'The ID of the route to update',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  routeId: string;

  @ApiProperty({
    type: 'string',
    description: 'The ID of the shipment to update',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  shipmentId: string;
}

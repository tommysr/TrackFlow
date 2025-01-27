import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsNotEmpty } from 'class-validator';

export class LocationDto {
  @ApiProperty({
    description: 'Latitude',
    type: Number,
  })
  @IsNumber()
  @IsNotEmpty()
  lat: number;

  @ApiProperty({
    description: 'Longitude',
    type: Number,
  })
  @IsNumber()
  @IsNotEmpty()
  lng: number;

  // Helper to convert to GeoJSON Point
  static toGeoJSON(lng: number, lat: number) {
    const dto = new LocationDto();
    dto.lng = lng;
    dto.lat = lat;

    return {
      type: 'Point' as const,
      coordinates: [dto.lng, dto.lat] as [number, number],
    };
  }

  // Helper to convert from GeoJSON Point
  static fromGeoJSON(point: { type: 'Point'; coordinates: [number, number] }) {
    const dto = new LocationDto();
    dto.lng = point.coordinates[0];
    dto.lat = point.coordinates[1];
    return dto;
  }
}

// src/aggregation/entities/route.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Shipment } from '../../shipments/entities/shipment.entity';

@Entity()
export class Route {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Shipment, (shipment) => shipment.id)
  shipment: Shipment;

  @Column('jsonb')
  path: Array<{ latitude: number; longitude: number; timestamp: Date }>;

  @Column('decimal', { precision: 10, scale: 2 })
  distance: number; // in kilometers

  @Column('decimal', { precision: 5, scale: 2 })
  averageSpeed: number; // in km/h

  @Column('int')
  stops: number;

  @Column('int')

  

  @Column('timestamp', { default: () => 'CURRENT_TIMESTAMP' })
  processedAt: Date;
}

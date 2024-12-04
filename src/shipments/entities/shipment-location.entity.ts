import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Shipment } from './shipment.entity';

@Entity()
export class ShipmentLocation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Shipment, (shipment) => shipment.locations)
  shipment: Shipment;

  @Column()
  street: string;

  @Column('decimal', { precision: 9, scale: 6 })
  latitude: number;

  @Column('decimal', { precision: 9, scale: 6 })
  longitude: number;
} 
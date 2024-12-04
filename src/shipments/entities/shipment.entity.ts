import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Carrier } from '../../carriers/entities/carrier.entity';
import { ShipmentLocation } from './shipment-location.entity';

export enum ShipmentStatus {
  CREATED = 'created',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
}

@Entity()
export class Shipment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.shipments)
  customer: User;

  @ManyToOne(() => Carrier, (carrier) => carrier.shipments)
  carrier: Carrier;

  @Column({ type: 'enum', enum: ShipmentStatus, default: ShipmentStatus.CREATED })
  status: ShipmentStatus;

  @OneToMany(() => ShipmentLocation, (location) => location.shipment, { cascade: true })
  locations: ShipmentLocation[];

  @Column('decimal', { precision: 10, scale: 2 })
  value: number;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column()
  size: string;

  @Column('timestamp', { default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
} 
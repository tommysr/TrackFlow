import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, UpdateDateColumn, CreateDateColumn, JoinColumn, OneToOne, PrimaryColumn, OneToMany } from 'typeorm';
import { Carrier } from 'src/carriers/entities/carrier.entity';
import { Address } from './address.entity';
import { Shipper } from 'src/auth/entities/shipper.entity';
import { Transform } from 'class-transformer';
import { ShipmentRouteHistory } from 'src/routes/entities/shipment-route-history.entity';
// import { Route } from 'src/aggregation/entities/route.entity';

export enum ShipmentStatus {
  PENDING = 'PENDING',
  BOUGHT = 'BOUGHT',
  ROUTE_SET = 'ROUTE_SET',
  PICKED_UP = 'PICKED_UP',
  IN_TRANSIT = 'IN_TRANSIT',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

@Entity()
export class Shipment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('bigint', {unique: true})
  canisterShipmentId: string;

  @ManyToOne(() => Shipper, (shipper) => shipper.shipments, { nullable: false })
  shipper: Shipper;

  @ManyToOne(() => Carrier, (carrier) => carrier.shipments, { nullable: true })
  carrier: Carrier;

  @Column({ type: 'enum', enum: ShipmentStatus, default: ShipmentStatus.PENDING })
  status: ShipmentStatus;

  @Column('decimal', { precision: 10, scale: 2 })
  @Transform(({ value }) => Number(value))
  value: number;

  @Column('decimal', { precision: 10, scale: 2 })
  @Transform(({ value }) => Number(value))
  price: number;

  @Column({ type: 'text' })
  size: string; 

  @Column('text', { nullable: true })
  hashedSecret: string; // from canister

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column('timestamp', { nullable: true })
  eta: Date;

  @Column('timestamp', { nullable: true })
  estimatedPickupTime: Date;

  @Column('timestamp', { nullable: true })
  estimatedDeliveryTime: Date;

  @OneToOne(() => Address, address => address.pickupForShipment, { 
    cascade: true,
    eager: true,
    nullable: true
  })
  @JoinColumn()
  pickupAddress?: Address;

  @OneToOne(() => Address, address => address.deliveryForShipment, { 
    cascade: true,
    eager: true,
    nullable: true
  })
  @JoinColumn()
  deliveryAddress?: Address;

  @Column('timestamp', { nullable: true })
  deliveryDate: Date;

  @Column('timestamp', { nullable: true })
  pickupDate: Date;

  @Column('jsonb', { nullable: true })
  lastRouteSegment: { lat: number; lng: number }[];

  @Column({ nullable: true })
  trackingToken: string;

  @Column('timestamp', { nullable: true })
  pickupWindowStart?: Date;

  @Column('timestamp', { nullable: true })
  pickupWindowEnd?: Date;

  @Column('timestamp', { nullable: true })
  deliveryWindowStart?: Date;

  @Column('timestamp', { nullable: true })
  deliveryWindowEnd?: Date;

  @OneToMany(() => ShipmentRouteHistory, history => history.shipment)
  routeHistory: ShipmentRouteHistory[];
} 

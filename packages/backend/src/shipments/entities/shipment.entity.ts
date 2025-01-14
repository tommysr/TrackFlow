import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, UpdateDateColumn, CreateDateColumn, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { Carrier } from 'src/carriers/entities/carrier.entity';
import { Address } from './address.entity';
import { Shipper } from 'src/auth/entities/shipper.entity';

export enum ShipmentStatus {
  // Initial states
  PENDING_NO_ADDRESS = 'PENDING_NO_ADDRESS',
  PENDING_WITH_ADDRESS = 'PENDING_WITH_ADDRESS',
  
  // Purchase states
  BOUGHT_NO_ADDRESS = 'BOUGHT_NO_ADDRESS',     // New state
  BOUGHT_WITH_ADDRESS = 'BOUGHT_WITH_ADDRESS', // New state
  
  // Active states
  READY_FOR_PICKUP = 'READY_FOR_PICKUP',
  PICKED_UP = 'PICKED_UP',
  IN_TRANSIT = 'IN_TRANSIT',
  
  // Final states
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED'
}

@Entity()
export class Shipment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @PrimaryColumn('bigint')
  canisterShipmentId: number;

  @ManyToOne(() => Shipper, (shipper) => shipper.shipments, { nullable: false })
  shipper: Shipper;

  @ManyToOne(() => Carrier, (carrier) => carrier.carriedShipments, { nullable: true })
  assignedCarrier: Carrier;

  @Column({ type: 'enum', enum: ShipmentStatus, default: ShipmentStatus.PENDING_NO_ADDRESS })
  status: ShipmentStatus;

  @Column('decimal', { precision: 10, scale: 2 })
  value: number;

  @Column('decimal', { precision: 10, scale: 2 })
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
    eager: true 
  })
  @JoinColumn()
  pickupAddress: Address;

  @OneToOne(() => Address, address => address.deliveryForShipment, { 
    cascade: true,
    eager: true 
  })
  @JoinColumn()
  deliveryAddress: Address;

  @Column('timestamp', { nullable: true })
  deliveryDate: Date;

  @Column('timestamp', { nullable: true })
  pickupDate: Date;

  // @ManyToOne(() => Route, (route) => route.shipments, { nullable: true })
  // route: Route;

  @Column('jsonb', { nullable: true })
  lastRouteSegment: { lat: number; lng: number }[];

  @Column('timestamp', { nullable: true })
  requiredDeliveryDate: Date;

  @Column({ nullable: true })
  trackingToken: string;
} 

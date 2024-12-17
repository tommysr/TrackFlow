import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, UpdateDateColumn, CreateDateColumn } from 'typeorm';
import { ShipmentLocation } from './shipment-location.entity';
import { IcpUser } from 'src/auth/entities/icp.user.entity';
import { Carrier } from 'src/carriers/entities/carrier.entity';
import { ShipmentEvent } from './shipment-event.entity';

export enum ShipmentStatus {
  CREATED = 'CREATED',         // Local state when created but not synced or not on canister yet
  PENDING = 'PENDING',         // Matches canister Pending
  READY_FOR_PICKUP = 'READY_FOR_PICKUP',  // Local intermediate
  PICKED_UP = 'PICKED_UP',     // Local intermediate
  IN_TRANSIT = 'IN_TRANSIT',   // Matches canister InTransit
  DELIVERED = 'DELIVERED',     // Matches canister Delivered
  CANCELLED = 'CANCELLED',     // Matches canister Cancelled
}


@Entity()
export class Shipment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('bigint', { nullable: true })
  canisterShipmentId: number;

  @ManyToOne(() => IcpUser, (user) => user.shipments, { nullable: false })
  shipper: IcpUser;

  // If assigned to a carrier principal
  @ManyToOne(() => IcpUser, { nullable: true })
  carrierPrincipal: IcpUser;

  @ManyToOne(() => Carrier, { nullable: true })
  assignedCarrier: Carrier;

  @Column({ type: 'enum', enum: ShipmentStatus, default: ShipmentStatus.CREATED })
  status: ShipmentStatus;

  @OneToMany(() => ShipmentLocation, (location) => location.shipment, { cascade: true })
  locations: ShipmentLocation[];

  @OneToMany(() => ShipmentEvent, (event) => event.shipment, { cascade: true })
  events: ShipmentEvent[];

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
} 
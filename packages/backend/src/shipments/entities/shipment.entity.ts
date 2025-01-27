import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, UpdateDateColumn, CreateDateColumn, JoinColumn, OneToOne, PrimaryColumn, OneToMany } from 'typeorm';
import { Carrier } from '../../carriers/entities/carrier.entity';
import { Address } from './address.entity';
import { Shipper } from '../../auth/entities/shipper.entity';
import { Transform } from 'class-transformer';
import { ShipmentRouteHistory } from '../../routes/entities/shipment-route-history.entity';
// import { Route } from 'src/aggregation/entities/route.entity';

export enum ShipmentStatus {
  PENDING = 'PENDING',
  BOUGHT = 'BOUGHT',
  ROUTE_SET = 'ROUTE_SET',
  PICKED_UP = 'PICKED_UP',
  IN_DELIVERY = 'IN_DELIVERY',
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
  carrier?: Carrier;

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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

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

  @Column({ nullable: true })
  trackingToken?: string;

  @Column('timestamptz', { nullable: true })
  pickupWindowStart?: Date;

  @Column('timestamptz', { nullable: true })
  pickupWindowEnd?: Date;

  @Column('timestamptz', { nullable: true })
  deliveryWindowStart?: Date;

  @Column('timestamptz', { nullable: true })
  deliveryWindowEnd?: Date;

  @OneToMany(() => ShipmentRouteHistory, history => history.shipment)
  routeHistory?: ShipmentRouteHistory[];
} 

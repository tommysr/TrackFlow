import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Shipment } from '../../shipments/entities/shipment.entity';
import { Route } from './route.entity';

export enum ShipmentOperationType {
  PICKUP = 'PICKUP',
  DELIVERY = 'DELIVERY',
  FAILED = 'FAILED'
}

@Entity()
export class ShipmentRouteHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Shipment, shipment => shipment.routeHistory)
  shipment: Shipment;

  @ManyToOne(() => Route, route => route.shipmentHistory, { onDelete: 'CASCADE' })
  route: Route;

  @Column({
    type: 'enum',
    enum: ShipmentOperationType
  })
  operationType: ShipmentOperationType;

  @Column('timestamp')
  assignedAt: Date;

  @Column('timestamp', { nullable: true })
  completedAt: Date;

  @Column('boolean', { default: false })
  isSuccessful: boolean;

  @Column('text', { nullable: true })
  failureReason?: string;
} 
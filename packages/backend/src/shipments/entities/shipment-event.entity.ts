import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, JoinColumn } from 'typeorm';
import { Shipment } from './shipment.entity';

export enum EventType {
  PICKUP_SCHEDULED = 'PICKUP_SCHEDULED',
  PICKUP_COMPLETED = 'PICKUP_COMPLETED',
  DELIVERY_SCHEDULED = 'DELIVERY_SCHEDULED',
  DELIVERY_COMPLETED = 'DELIVERY_COMPLETED',
  STATUS_CHANGED = 'STATUS_CHANGED',
}

@Entity()
export class ShipmentEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Shipment, shipment => shipment.events)
  @JoinColumn({ name: 'shipment_id' })
  shipment: Shipment;

  @Column({
    type: 'enum',
    enum: EventType,
  })
  type: EventType;

  @CreateDateColumn()
  eventTime: Date;

  @Column('text', { nullable: true })
  notes?: string;

  @Column('jsonb', { nullable: true })
  metadata?: Record<string, any>;
}

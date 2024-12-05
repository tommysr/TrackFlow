// src/aggregation/entities/statistics.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Carrier } from '../../carriers/entities/carrier.entity';

@Entity()
export class Statistics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Carrier, (carrier) => carrier.id)
  carrier: Carrier;

  @Column('date')
  date: Date;

  @Column('decimal', { precision: 10, scale: 2 })
  totalDistance: number; // in kilometers

  @Column('decimal', { precision: 5, scale: 2 })
  averageSpeed: number; // in km/h

  @Column('int')
  deliveries: number;

  @Column('timestamp', { default: () => 'CURRENT_TIMESTAMP' })
  computedAt: Date;
}

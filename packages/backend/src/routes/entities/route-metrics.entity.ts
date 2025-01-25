import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { Route } from './route.entity';

@Entity()
export class RouteMetrics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Route, route => route.metrics, { onDelete: 'CASCADE' })
  @JoinColumn()
  route: Route;

  @Column('int')
  completedStops: number;

  @Column('int')
  totalStops: number;

  @Column('decimal', { precision: 10, scale: 2 })
  completedDistance: number;

  @Column('decimal', { precision: 10, scale: 2 })
  remainingDistance: number;

  @Column('boolean')
  isDelayed: boolean;

  @Column('int', { nullable: true })
  delayMinutes?: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  actualTotalTime?: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  actualFuelConsumption?: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  deviationFromOptimal?: number;
} 
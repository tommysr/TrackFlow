// src/aggregation/entities/route.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
} from 'typeorm';
import { Carrier } from '../../carriers/entities/carrier.entity';
import { RouteSegment } from './routeSegment.entity';
import { RouteStop } from './routeStop.entity';
import { Transform } from 'class-transformer';
import { RouteMetrics } from './route-metrics.entity';
import { RouteDistanceMatrix } from './route-distance-matrix.entity';
import { ShipmentRouteHistory } from './shipment-route-history.entity';

export enum RouteStatus {
  PENDING = 'pending', // Route created but not started
  ACTIVE = 'active', // Route in progress
  COMPLETED = 'completed', // Route finished
  CANCELLED = 'cancelled', // Route cancelled
}

@Entity()
export class Route {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Carrier, (carrier) => carrier.routes)
  carrier: Carrier;

  @Column('decimal', { precision: 10, scale: 2 })
  @Transform(({ value }) => Number(value))
  totalDistance: number; // in kilometers

  @Column('decimal', { precision: 10, scale: 2 })
  @Transform(({ value }) => Number(value))
  totalFuelCost: number; // in currency

  @Column('decimal', { precision: 10, scale: 2 })
  @Transform(({ value }) => Number(value))
  fuelConsumption: number; // in liters

  @Column('decimal', { precision: 10, scale: 2 })
  @Transform(({ value }) => Number(value))
  estimatedTime: number; // in minutes

  @Column('timestamptz')
  date: Date;

  @Column('boolean', { default: false })
  isCompleted: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({
    type: 'enum',
    enum: RouteStatus,
    default: RouteStatus.PENDING,
  })
  status: RouteStatus;

  @Column('timestamptz', { nullable: true })
  lastLocationUpdate: Date;

  @Column('geometry', {
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  lastLocation?: object;

  // Store full route path for complete visualization
  @Column('geometry', {
    spatialFeatureType: 'LineString',
    srid: 4326,
    nullable: true,
  })
  fullPath?: object;

  @OneToOne(() => RouteMetrics, (metrics) => metrics.route, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  metrics: RouteMetrics;

  @OneToOne(() => RouteDistanceMatrix, (matrix) => matrix.route, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  distanceMatrix: RouteDistanceMatrix;

  @OneToMany(() => RouteStop, (stop) => stop.route, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  stops: RouteStop[];

  @OneToMany(() => RouteSegment, (segment) => segment.route, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  segments: RouteSegment[];

  @Column({ type: 'timestamptz', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date;

  @OneToMany(() => ShipmentRouteHistory, (history) => history.route, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  shipmentHistory: ShipmentRouteHistory[];
}

// src/aggregation/entities/route.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Shipment } from '../../shipments/entities/shipment.entity';
import { Carrier } from '../../carriers/entities/carrier.entity';
import { RouteSegment } from '../../routes/route-optimization.service';
import { RouteStop } from './routeStop.entity';

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
  totalDistance: number; // in kilometers

  // @Column('decimal', { precision: 10, scale: 2 })
  // totalProfit: number; // in currency
  @Column('decimal', { precision: 10, scale: 2 })
  totalFuelCost: number; // in currency

  @Column('decimal', { precision: 10, scale: 2 })
  fuelConsumption: number; // in liters

  @Column('decimal', { precision: 10, scale: 2 })
  estimatedTime: number; // in minutes

  // @Column('decimal', { precision: 10, scale: 6, nullable: true })
  // currentLatitude: number;

  // @Column('decimal', { precision: 10, scale: 6, nullable: true })
  // currentLongitude: number;

  @Column('timestamp')
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

  @Column('timestamp', { nullable: true })
  lastLocationUpdate: Date;

  // Store full route path for complete visualization
  @Column('geometry', {
    spatialFeatureType: 'LineString',
    srid: 4326,
    nullable: true,
  })
  fullPath?: object;

  // optionally
  @Column('jsonb', { nullable: true })
  distanceMatrix?: {
    durations: number[][]; // seconds
    distances: number[][]; // meters
  };

  // right now leave it as it is, cause its only used without more broad joins
  @Column('jsonb', { nullable: true })
  metrics?: {
    actualTotalTime?: number;
    actualFuelConsumption?: number;
    deviationFromOptimal?: number;
    progress?: {
      completedStops: number;
      totalStops: number;
      completedDistance: number;
      remainingDistance: number;
      isDelayed: boolean;
      delayMinutes?: number;
    };
  };

  // optional
  @OneToMany(() => RouteStop, stop => stop.route)
  stops: RouteStop[];
}

import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { RouteStop } from "./routeStop.entity";

@Entity()
export class RouteDelay {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => RouteStop)
  stop: RouteStop;

  @Column('timestamp')
  recordedAt: Date;

  @Column('int')
  delayMinutes: number;

  @Column('geometry', {
    spatialFeatureType: 'Point',
    srid: 4326,
  })
  location: object;

  @Column('jsonb', { nullable: true })
  metadata?: {
    cause?: string;
    originalEta?: Date;
    updatedEta?: Date;
  };
} 
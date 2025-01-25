import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, JoinColumn } from 'typeorm';
import { Route } from './route.entity';
import { Shipment } from '../../shipments/entities/shipment.entity';
import { StopType } from '../types/location.types';

@Entity()
export class RouteStop {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Route, route => route.stops, { onDelete: 'CASCADE' })
  route: Route;

  @ManyToOne(() => Shipment, { nullable: true })
  @JoinColumn({ name: 'shipmentId' })
  shipment?: Shipment;

  @Column({ nullable: true })
  shipmentId?: string;

  @Column({
    type: 'enum',
    enum: StopType,
  })
  stopType: StopType;

  @Column('int')
  sequenceIndex: number;

  // Store just the point location of the stop
  @Column('geometry', {
    spatialFeatureType: 'Point',
    srid: 4326,
  })
  location: object;

  @Column('timestamp', { nullable: true })
  estimatedArrival?: Date;

  @Column('timestamp', { nullable: true })
  actualArrival?: Date;
}

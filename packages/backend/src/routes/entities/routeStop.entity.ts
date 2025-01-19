import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Route } from './route.entity';
import { Shipment } from '../../shipments/entities/shipment.entity';

@Entity()
export class RouteStop {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Route, { onDelete: 'CASCADE' })
  route: Route;

  // If a single stop corresponds to exactly one Shipment pickup or delivery:
  // guess i could do shipmentsRoutes table, but i dont think i need it
  @ManyToOne(() => Shipment, { nullable: false })
  shipment: Shipment;

  @Column({
    type: 'enum',
    enum: ['PICKUP', 'DELIVERY'],
  })
  stopType: 'PICKUP' | 'DELIVERY';

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

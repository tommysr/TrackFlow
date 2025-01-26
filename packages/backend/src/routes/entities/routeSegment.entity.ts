import { Column } from "typeorm";

import { Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Route } from "./route.entity";
import { RouteStop } from "./routeStop.entity";
import { Transform } from "class-transformer";


// i could need it, but i dont think i need it
// i could also use fullPath from route entity
@Entity()
export class RouteSegment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Route, route => route.segments, { onDelete: 'CASCADE' })
  route: Route;

  // fromStop & toStop define which stops are connected:
  @ManyToOne(() => RouteStop)
  fromStop: RouteStop;

  @ManyToOne(() => RouteStop)
  toStop: RouteStop;

  @Column('geometry', {
    spatialFeatureType: 'LineString',
    srid: 4326,
  })
  path: object;

  @Column('decimal', { precision: 10, scale: 2 })
  @Transform(({ value }) => Number(value))
  distance: number; // kilometers

  @Column('decimal', { precision: 10, scale: 2 })
  duration: number; // in minutes
}

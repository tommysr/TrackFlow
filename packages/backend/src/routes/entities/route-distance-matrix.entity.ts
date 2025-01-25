import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { Route } from './route.entity';

@Entity()
export class RouteDistanceMatrix {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Route, route => route.distanceMatrix, { onDelete: 'CASCADE' })
  @JoinColumn()
  route: Route;

  @Column('float', { array: true })
  durations: number[][];

  @Column('float', { array: true })
  distances: number[][];
} 
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, OneToOne, JoinColumn } from 'typeorm';
import { Route } from '../../aggregation/entities/route.entity';
import { IcpUser } from 'src/auth/entities/icp.user.entity';
import { Shipment } from 'src/shipments/entities/shipment.entity';
import { GPSData } from '../../gps/entities/gps-data.entity';

@Entity()
export class Carrier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  identityId: string;

  @OneToOne(() => IcpUser)
  @JoinColumn({ name: 'identityId' })
  identity: IcpUser;

  @Column()
  name: string;

  @Column()
  contactInfo: string;

  @Column('float', { default: 12 }) // km per liter
  fuelEfficiency: number;

  @Column('float', { default: 1.5 }) // currency per liter
  fuelCostPerLiter: number;

  @OneToMany(() => Route, (route) => route.carrier)
  routes: Route[];

  @OneToMany(() => Shipment, (shipment) => shipment.assignedCarrier)
  carriedShipments: Shipment[];

  @Column('int', { default: 1 })
  maxDailyRoutes: number;

  @OneToMany(() => GPSData, (gpsData) => gpsData.carrier)
  gpsData: GPSData[];
} 

import { Entity, PrimaryGeneratedColumn, Column, OneToMany, OneToOne, JoinColumn, PrimaryColumn } from 'typeorm';
// import { `Route } from '../../aggregation/entities/route.entity';
import { IcpUser } from 'src/auth/entities/icp.user.entity';
import { Shipment } from 'src/shipments/entities/shipment.entity';
import { GPSData } from '../../gps/entities/gps-data.entity';
import { Route } from 'src/routes/entities/route.entity';
import { CarrierConfiguration } from 'src/carriers/entities/carrier-configuration.entity';

@Entity()
export class Carrier {
  @PrimaryColumn()
  principal: string;

  @OneToOne(() => IcpUser, {nullable: false})
  @JoinColumn({ name: 'principal' })
  user: IcpUser;

  @OneToOne(() => CarrierConfiguration, config => config.carrier, { cascade: true })
  configuration: CarrierConfiguration;

  @OneToMany(() => Route, (r) => r.carrier)
  routes: Route[];

  @OneToMany(() => Shipment, (s) => s.carrier)
  shipments: Shipment[];

  @OneToMany(() => GPSData, (g) => g.carrier)
  gpsData: GPSData[];

  @Column('geometry', {
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  currentLocation?: object; // or { type: 'Point', coordinates: [lng, lat] }
} 

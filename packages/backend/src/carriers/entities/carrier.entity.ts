import { Entity, PrimaryGeneratedColumn, Column, OneToMany, OneToOne, JoinColumn, PrimaryColumn } from 'typeorm';
// import { `Route } from '../../aggregation/entities/route.entity';
import { IcpUser } from 'src/auth/entities/icp.user.entity';
import { Shipment } from 'src/shipments/entities/shipment.entity';
import { Route } from 'src/routes/entities/route.entity';
import { CarrierConfiguration } from 'src/carriers/entities/carrier-configuration.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity()
export class Carrier {
  @ApiProperty({
    description: 'Internet Computer Principal ID of the carrier',
    example: 'rrkah-fqaaa-aaaaa-aaaaq-cai'
  })
  @PrimaryColumn()
  principal: string;

  @ApiProperty({
    description: 'User associated with this carrier',
    type: () => IcpUser
  })
  @OneToOne(() => IcpUser, {nullable: false})
  @JoinColumn({ name: 'principal' })
  user: IcpUser;

  @ApiProperty({
    description: 'Carrier configuration settings',
    type: () => CarrierConfiguration
  })
  @OneToOne(() => CarrierConfiguration, config => config.carrier, { cascade: true })
  configuration: CarrierConfiguration;

  @ApiProperty({
    description: 'List of routes assigned to this carrier',
    type: () => [Route]
  })
  @OneToMany(() => Route, (r) => r.carrier)
  routes: Route[];

  @ApiProperty({
    description: 'List of shipments assigned to this carrier',
    type: () => [Shipment]
  })
  @OneToMany(() => Shipment, (s) => s.carrier)
  shipments: Shipment[];

  @ApiProperty({
    description: 'Current location of the carrier',
    example: { type: 'Point', coordinates: [21.017532, 52.237049] }
  })
  @Column('geometry', {
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  currentLocation?: object; 
} 

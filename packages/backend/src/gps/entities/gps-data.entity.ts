import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, Index } from 'typeorm';
import { Carrier } from '../../carriers/entities/carrier.entity';

@Entity()
export class GPSData {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Carrier, (carrier) => carrier.gpsData)
  @Index()
  carrier: Carrier;

  @Column('geometry', { 
    spatialFeatureType: 'Point', 
    srid: 4326 
  })
  location: object;
  @Column('timestamp')
  @Index()
  timestamp: Date;
} 
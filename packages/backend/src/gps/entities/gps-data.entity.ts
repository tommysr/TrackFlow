import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, Index } from 'typeorm';
import { Carrier } from '../../carriers/entities/carrier.entity';

@Entity()
export class GPSData {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Carrier, (carrier) => carrier.gpsData)
  @Index()
  carrier: Carrier;

  @Column('decimal', { precision: 9, scale: 6 })
  latitude: number;

  @Column('decimal', { precision: 9, scale: 6 })
  longitude: number;

  @Column('timestamp')
  @Index()
  timestamp: Date;
} 
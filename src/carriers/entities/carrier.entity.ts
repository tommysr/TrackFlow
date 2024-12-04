import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { GPSData } from '../../gps/entities/gps-data.entity';
import { Shipment } from '../../shipments/entities/shipment.entity';

@Entity()
export class Carrier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  contactInfo: string;

  @OneToMany(() => GPSData, (gpsData) => gpsData.carrier)
  gpsData: GPSData[];

  @OneToMany(() => Shipment, (shipment) => shipment.carrier)
  shipments: Shipment[];
} 
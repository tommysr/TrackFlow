import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne } from 'typeorm';
import { GPSData } from '../../gps/entities/gps-data.entity';
import { Shipment } from '../../shipments/entities/shipment.entity';
import { IcpUser } from 'src/auth/entities/icp.user.entity';

@Entity()
export class Carrier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => IcpUser, (user) => user.shipments, { nullable: false })
  principal: IcpUser;

  @Column()
  name: string;

  @Column()
  contactInfo: string;

  @OneToMany(() => GPSData, (gpsData) => gpsData.carrier)
  gpsData: GPSData[];

  @OneToMany(() => Shipment, (shipment) => shipment.assignedCarrier)
  shipments: Shipment[];
} 
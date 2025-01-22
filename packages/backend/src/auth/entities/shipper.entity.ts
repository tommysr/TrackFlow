import { Entity, OneToMany, OneToOne, JoinColumn, PrimaryColumn } from 'typeorm';
import { IcpUser } from './icp.user.entity';
import { Shipment } from 'src/shipments/entities/shipment.entity';

@Entity()
export class Shipper {
  @PrimaryColumn()
  principal: string;

  // this refers to the principal of the shipper
  @OneToOne(() => IcpUser, {nullable: false})
  @JoinColumn({ name: 'principal' })
  user: IcpUser;

  @OneToMany(() => Shipment, (s) => s.shipper)
  shipments: Shipment[];
} 
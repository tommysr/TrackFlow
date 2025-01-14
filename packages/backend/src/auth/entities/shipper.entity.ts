import { Entity, OneToMany, OneToOne, JoinColumn, PrimaryColumn } from 'typeorm';
import { IcpUser } from './icp.user.entity';
import { Shipment } from 'src/shipments/entities/shipment.entity';

@Entity()
export class Shipper {
  @PrimaryColumn()
  identityId: string;

  @OneToOne(() => IcpUser)
  @JoinColumn({ name: 'identityId' })
  identity: IcpUser;

  @OneToMany(() => Shipment, (shipment) => shipment.shipper)
  shipments: Shipment[];
} 
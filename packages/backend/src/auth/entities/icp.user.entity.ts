import { Shipment } from 'src/shipments/entities/shipment.entity';
import { Entity, Column, PrimaryColumn, OneToMany } from 'typeorm';

export enum UserRole {
  UNKNOWN = 'UNKNOWN',
  SHIPPER = 'SHIPPER',
  CARRIER = 'CARRIER',
  RECEIVER = 'RECEIVER',
  ADMIN = 'ADMIN',
}

@Entity()
export class IcpUser {
  @PrimaryColumn({ unique: true })
  principal: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.UNKNOWN,
  })
  role: UserRole;

  @OneToMany(() => Shipment, (shipment) => shipment.shipper)
  shipments: Shipment[];

  @OneToMany(() => Shipment, (shipment) => shipment.carrierPrincipal)
  carriedShipments: Shipment[];
}

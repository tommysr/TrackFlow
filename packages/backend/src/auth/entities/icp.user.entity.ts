import { Entity, Column, PrimaryColumn, OneToOne } from 'typeorm';
import { Shipper } from './shipper.entity';
import { Carrier } from 'src/carriers/entities/carrier.entity';

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
  SHIPPER = 'SHIPPER',
  CARRIER = 'CARRIER',
}

@Entity()
export class IcpUser {
  @PrimaryColumn({ unique: true })
  principal: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @OneToOne(() => Shipper, (shipper) => shipper.identity, { nullable: true })
  shipper: Shipper;

  @OneToOne(() => Carrier, (carrier) => carrier.identity, { nullable: true })
  carrier: Carrier;
}

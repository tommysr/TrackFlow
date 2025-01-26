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
  @PrimaryColumn()
  principal: string;

  @Column({
    type: 'simple-array',
    enum: UserRole,
    default: [UserRole.USER],
  })
  roles: UserRole[];

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  contact: string;
}

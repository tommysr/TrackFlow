import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Exclude } from 'class-transformer';
import { Shipment } from '../../shipments/entities/shipment.entity';

export enum UserRole {
  ADMIN = 'admin',
  CARRIER = 'carrier',
  CUSTOMER = 'customer',
}

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  username: string;

  @Column()
  @Exclude() // Excludes password from serialization
  passwordHash: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.CUSTOMER,
  })
  role: UserRole;

  // Uncomment these relationships
  @OneToMany(() => Shipment, (shipment) => shipment.customer)
  shipments: Shipment[];
} 
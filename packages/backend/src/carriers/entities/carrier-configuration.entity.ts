import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { Carrier } from './carrier.entity';

@Entity()
export class CarrierConfiguration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Carrier, carrier => carrier.configuration)
  @JoinColumn()
  carrier: Carrier;

  @Column('float', { nullable: true })
  fuelEfficiency?: number;

  @Column('float', { nullable: true })
  fuelCostPerLiter?: number;
} 
import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { Carrier } from './carrier.entity';

@Entity()
export class CarrierConfiguration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Carrier, carrier => carrier.configuration)
  @JoinColumn()
  carrier: Carrier;

  @Column('float')
  fuelEfficiency: number;

  @Column('float')
  fuelCostPerLiter: number;

  @Column('jsonb', { nullable: true })
  additionalSettings?: object;
} 
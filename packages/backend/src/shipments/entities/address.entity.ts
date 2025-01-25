import { Entity, PrimaryGeneratedColumn, Column, OneToOne } from 'typeorm';
import { Shipment } from './shipment.entity';

@Entity()
export class Address {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  street: string;

  @Column({ nullable: false })
  city: string;

  @Column({ nullable: false })
  zip: string;

  @Column({ nullable: false })
  country: string;

  @Column('float', { nullable: false })
  lat: number;

  @Column('float', { nullable: false })
  lng: number;

  @OneToOne(() => Shipment, (shipment) => shipment.pickupAddress)
  pickupForShipment: Shipment;

  @OneToOne(() => Shipment, (shipment) => shipment.deliveryAddress)
  deliveryForShipment: Shipment;
}

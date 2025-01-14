import { Entity, PrimaryGeneratedColumn, Column, OneToOne } from 'typeorm';
import { Shipment } from './shipment.entity';

@Entity()
export class Address {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  street: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  state: string;

  @Column({ nullable: true })
  zip: string;

  @Column({ nullable: true })
  country: string;

  @Column('float', { nullable: true })
  latitude: number;

  @Column('float', { nullable: true })
  longitude: number;

  @Column('float')
  icpLat: number;

  @Column('float')
  icpLng: number;

  @OneToOne(() => Shipment, shipment => shipment.pickupAddress)
  pickupForShipment: Shipment;

  @OneToOne(() => Shipment, shipment => shipment.deliveryAddress)
  deliveryForShipment: Shipment;

  isComplete(): boolean {
    return !!(this.street && this.city && this.state && this.zip && this.country && this.latitude && this.longitude);
  }

  getCurrentLocation(): { lat: number; lng: number } {
    return {
      lat: this.latitude || this.icpLat,
      lng: this.longitude || this.icpLng
    };
  }
}

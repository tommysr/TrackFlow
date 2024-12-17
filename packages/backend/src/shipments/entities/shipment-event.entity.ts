import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Shipment, ShipmentStatus } from "./shipment.entity";

@Entity()
export class ShipmentEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Shipment, (shipment) => shipment.events)
  shipment: Shipment;

  // @Column({ type: 'enum', enum: ShipmentStatus, default: ShipmentStatus.CREATED })
  // status: ShipmentStatus;

  @CreateDateColumn()
  eventTime: Date;

  @Column('text', { nullable: true })
  notes?: string;
}

import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class ShipmentSequence {
  @PrimaryColumn()
  id: string = 'shipment_sequence'; // Single row identifier

  @Column('bigint')
  lastProcessedSequence: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastUpdated: Date;
} 
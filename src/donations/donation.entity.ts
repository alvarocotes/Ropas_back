import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DonationStatus } from '../common/enums.js';
import { DonationItem } from './donation-item.entity.js';

@Entity('donations')
export class Donation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'donor_name', type: 'varchar', length: 120, nullable: true })
  donorName: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  contact: string | null;

  @Column({ type: 'varchar', length: 32, default: DonationStatus.RECIBIDO })
  status: DonationStatus;

  @Column({ type: 'varchar', length: 500, nullable: true })
  notes: string | null;

  @OneToMany(() => DonationItem, (item) => item.donation, { cascade: true, eager: true })
  items: DonationItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

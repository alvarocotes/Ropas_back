import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Donation } from './donation.entity.js';
import { Product } from '../inventory/product.entity.js';

@Entity('donation_items')
export class DonationItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'donation_id' })
  donationId: number;

  @ManyToOne(() => Donation, (donation) => donation.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'donation_id' })
  donation: Donation;

  @Column({ name: 'product_id', type: 'int', nullable: true })
  productId: number | null;

  @ManyToOne(() => Product, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'product_id' })
  product: Product | null;

  @Column({ name: 'product_name' })
  productName: string;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ default: 'unidad' })
  unit: string;
}

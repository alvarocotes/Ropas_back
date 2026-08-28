import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Product } from '../inventory/product.entity.js';

@Entity('public_needs')
export class PublicNeed {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'product_id', type: 'int', nullable: true })
  productId: number | null;

  @ManyToOne(() => Product, { nullable: true, onDelete: 'SET NULL', eager: true })
  @JoinColumn({ name: 'product_id' })
  product: Product | null;

  @Column()
  title: string;

  @Column({ name: 'quantity_needed', type: 'int', default: 1 })
  quantityNeeded: number;

  @Column({ type: 'varchar', length: 400, nullable: true })
  message: string | null;

  @Column({ name: 'is_visible', default: true })
  isVisible: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Product } from '../inventory/product.entity.js';
// Import de tipo para romper el ciclo en ESM: la relación se resuelve por nombre.
import type { HelpRequest } from './help-request.entity.js';

/** Producto del inventario que el voluntario alista para entregar en una solicitud. */
@Entity('help_request_items')
export class HelpRequestItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'help_request_id' })
  helpRequestId: number;

  @ManyToOne('HelpRequest', (request: HelpRequest) => request.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'help_request_id' })
  helpRequest: HelpRequest;

  @Column({ name: 'product_id', type: 'int', nullable: true })
  productId: number | null;

  @ManyToOne(() => Product, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'product_id' })
  product: Product | null;

  /** Copia del nombre para que el histórico no cambie si el producto se renombra. */
  @Column({ name: 'product_name' })
  productName: string;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ default: 'unidad' })
  unit: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

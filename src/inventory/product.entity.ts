import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { InventoryMovement } from './inventory-movement.entity.js';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ default: 'unidad' })
  unit: string;

  @Column({ type: 'int', default: 0 })
  quantity: number;

  @Column({ name: 'min_quantity', type: 'int', default: 0 })
  minQuantity: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  /** Si está activo, el producto aparece en las necesidades públicas al bajar del mínimo. */
  @Column({ name: 'publish_when_low', default: false })
  publishWhenLow: boolean;

  /** Texto opcional que verán los donantes en lugar del mensaje automático. */
  @Column({ name: 'public_note', type: 'varchar', length: 300, nullable: true })
  publicNote: string | null;

  /** Para quién es la prenda: woman, man, girl, boy, baby. */
  @Column({ type: 'varchar', length: 16, nullable: true })
  audience: string | null;

  /** Talla catalogada, sin distinguir prenda superior o inferior. */
  @Column({ name: 'size_label', type: 'varchar', length: 40, nullable: true })
  sizeLabel: string | null;

  @Column({ type: 'varchar', length: 16, nullable: true })
  garment: string | null;

  /** Cómo se muestra a quien pide ayuda: Blusa, Camisa hombre, Inferior… */
  @Column({ name: 'request_label', type: 'varchar', length: 80, nullable: true })
  requestLabel: string | null;

  @OneToMany(() => InventoryMovement, (movement) => movement.product)
  movements: InventoryMovement[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RequestStatus } from '../common/enums.js';
import { User } from '../users/user.entity.js';
import { HelpRequestItem } from './help-request-item.entity.js';

@Entity('help_requests')
export class HelpRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'full_name', default: '' })
  fullName: string;

  @Column({ name: 'identification_number', default: '' })
  identificationNumber: string;

  @Column({ name: 'residence_before', type: 'varchar', length: 300, default: '' })
  residenceBefore: string;

  @Column({ name: 'residence_after', type: 'varchar', length: 300, default: '' })
  residenceAfter: string;

  @Column({ name: 'phone_whatsapp', length: 40, default: '' })
  phoneWhatsapp: string;

  @Column({ name: 'affectation_type', type: 'varchar', length: 200, default: '' })
  affectationType: string;

  @Column({ name: 'clothing_scope', type: 'varchar', length: 32, default: 'familiar' })
  clothingScope: string;

  @Column({ name: 'people_count', type: 'int', default: 1 })
  peopleCount: number;

  @Column({ name: 'has_own_transport', type: 'boolean', default: false })
  hasOwnTransport: boolean;

  @Column({ name: 'baby_sizes', type: 'varchar', length: 200, nullable: true })
  babySizes: string | null;

  @Column({ name: 'girl_shirt_sizes', type: 'varchar', length: 200, nullable: true })
  girlShirtSizes: string | null;

  @Column({ name: 'girl_pants_sizes', type: 'varchar', length: 200, nullable: true })
  girlPantsSizes: string | null;

  @Column({ name: 'woman_shirt_sizes', type: 'varchar', length: 200, nullable: true })
  womanShirtSizes: string | null;

  @Column({ name: 'woman_pants_sizes', type: 'varchar', length: 200, nullable: true })
  womanPantsSizes: string | null;

  @Column({ name: 'boy_shirt_sizes', type: 'varchar', length: 200, nullable: true })
  boyShirtSizes: string | null;

  @Column({ name: 'boy_pants_sizes', type: 'varchar', length: 200, nullable: true })
  boyPantsSizes: string | null;

  @Column({ name: 'man_shirt_sizes', type: 'varchar', length: 200, nullable: true })
  manShirtSizes: string | null;

  @Column({ name: 'man_pants_sizes', type: 'varchar', length: 200, nullable: true })
  manPantsSizes: string | null;

  @Column({ name: 'underwear_needs', type: 'varchar', length: 400, nullable: true })
  underwearNeeds: string | null;

  @Column({ name: 'needs_linens', type: 'boolean', default: false })
  needsLinens: boolean;

  @Column({ name: 'needs_diapers', type: 'boolean', default: false })
  needsDiapers: boolean;

  /** Etapas de pañal pedidas (p. ej. "Etapa 1, Etapa 3"), si needsDiapers es true. */
  @Column({ name: 'diaper_stage', type: 'varchar', length: 200, nullable: true })
  diaperStage: string | null;

  @Column({ name: 'needs_sanitary', type: 'boolean', default: false })
  needsSanitary: boolean;

  @Column({ name: 'additional_needs', type: 'text', nullable: true })
  additionalNeeds: string | null;

  @Column({ type: 'varchar', length: 32, default: RequestStatus.RECIBIDO })
  status: RequestStatus;

  /** 'formulario' para las que entran por la web, 'historial' para las importadas. */
  @Column({ type: 'varchar', length: 20, default: 'formulario' })
  source: string;

  /** Identificador del registro original, evita importar dos veces la misma fila. */
  @Column({ name: 'external_ref', type: 'varchar', length: 120, nullable: true, unique: true })
  externalRef: string | null;

  /**
   * Prendas entregadas que no salieron del inventario de la plataforma (jornadas y
   * entregas anteriores). Se suman a las del paquete para el total público.
   */
  @Column({ name: 'manual_items_delivered', type: 'int', default: 0 })
  manualItemsDelivered: number;

  /** Coordenadas de la dirección de entrega, para ubicarla en el mapa público. */
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude: string | null;

  /**
   * Nombre del sector devuelto por el geocodificador (barrio y ciudad). Es lo único
   * de la ubicación que se muestra en público: la dirección exacta nunca se expone.
   */
  @Column({ name: 'geo_label', type: 'varchar', length: 160, nullable: true })
  geoLabel: string | null;

  @Column({ name: 'internal_notes', type: 'varchar', length: 500, nullable: true })
  internalNotes: string | null;

  @Column({ name: 'assigned_to_id', type: 'int', nullable: true })
  assignedToId: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigned_to_id' })
  assignedTo: User | null;

  @Column({ name: 'reception_user_id', type: 'int', nullable: true })
  receptionUserId: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reception_user_id' })
  receptionUser: User | null;

  @Column({ name: 'transport_notes', type: 'varchar', length: 500, nullable: true })
  transportNotes: string | null;

  @OneToMany(() => HelpRequestItem, (item) => item.helpRequest, { cascade: ['remove'] })
  items: HelpRequestItem[];

  @Column({ name: 'ready_at', type: 'datetime', nullable: true })
  readyAt: Date | null;

  @Column({ name: 'delivered_at', type: 'datetime', nullable: true })
  deliveredAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

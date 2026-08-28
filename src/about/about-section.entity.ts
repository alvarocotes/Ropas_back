import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/** Bloque de texto institucional que se muestra en la página pública "Nosotros". */
@Entity('about_sections')
export class AboutSection {
  @PrimaryGeneratedColumn()
  id: number;

  /** Identificador estable (historia, que-hacemos, como-trabajamos, proposito). */
  @Column({ name: 'section_key', type: 'varchar', length: 60, unique: true })
  sectionKey: string;

  @Column({ type: 'varchar', length: 150 })
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'int', default: 0 })
  position: number;

  @Column({ name: 'is_visible', default: true })
  isVisible: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

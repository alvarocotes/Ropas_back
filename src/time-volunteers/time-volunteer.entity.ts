import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TimeVolunteerStatus } from '../common/enums.js';

/** Un tramo horario de alguien que se ofrece a ayudar con tiempo (1 = lunes … 7 = domingo). */
@Entity('time_volunteer_slots')
@Index(['volunteerId', 'weekday'], { unique: true })
export class TimeVolunteerSlot {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'volunteer_id' })
  volunteerId: number;

  @ManyToOne('TimeVolunteer', 'slots', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'volunteer_id' })
  volunteer: object;

  @Column({ type: 'int' })
  weekday: number;

  @Column({ name: 'start_time', type: 'varchar', length: 5 })
  startTime: string;

  @Column({ name: 'end_time', type: 'varchar', length: 5 })
  endTime: string;
}

/** Persona del público que quiere ayudar con tiempo (no es una cuenta del sistema). */
@Entity('time_volunteers')
export class TimeVolunteer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'full_name', length: 150 })
  fullName: string;

  @Column({ length: 40 })
  phone: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  email: string | null;

  /** En qué puede ayudar, escrito por la persona. */
  @Column({ type: 'varchar', length: 1000, nullable: true })
  notes: string | null;

  /** Notas internas de admin o recepción al coordinar. */
  @Column({ name: 'staff_notes', type: 'varchar', length: 1000, nullable: true })
  staffNotes: string | null;

  @Column({ type: 'varchar', length: 32, default: TimeVolunteerStatus.NUEVO })
  status: TimeVolunteerStatus;

  @OneToMany(() => TimeVolunteerSlot, (slot) => slot.volunteer, { cascade: true })
  slots: TimeVolunteerSlot[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

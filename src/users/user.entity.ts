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
import { UserRole } from '../common/enums.js';

/** Un tramo horario del voluntario para un día de la semana (1 = lunes … 7 = domingo). */
@Entity('volunteer_availabilities')
@Index(['userId', 'weekday'], { unique: true })
export class VolunteerAvailability {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne('User', 'availability', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: object;

  @Column({ type: 'int' })
  weekday: number;

  @Column({ name: 'start_time', type: 'varchar', length: 5 })
  startTime: string;

  @Column({ name: 'end_time', type: 'varchar', length: 5 })
  endTime: string;
}

/** Un turno de asistencia en una fecha concreta (admin, recepción o voluntario). */
@Entity('user_attendances')
@Index(['userId', 'workDate', 'startTime'], { unique: true })
export class UserAttendance {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne('User', 'attendances', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: object;

  /** Fecha local YYYY-MM-DD, sin zona horaria. */
  @Column({ name: 'work_date', type: 'varchar', length: 10 })
  workDate: string;

  @Column({ name: 'start_time', type: 'varchar', length: 5 })
  startTime: string;

  @Column({ name: 'end_time', type: 'varchar', length: 5 })
  endTime: string;
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ type: 'varchar', length: 32, default: UserRole.VOLUNTEER })
  role: UserRole;

  @Column({ name: 'full_name' })
  fullName: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  /** Módulos internos. `null` = los del rol. El administrador entra a todos. */
  @Column({ type: 'simple-json', nullable: true })
  modules: string[] | null;

  @OneToMany(() => VolunteerAvailability, (slot) => slot.user)
  availability: VolunteerAvailability[];

  @OneToMany(() => UserAttendance, (row) => row.user)
  attendances: UserAttendance[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

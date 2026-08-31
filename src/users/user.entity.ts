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

  @OneToMany(() => VolunteerAvailability, (slot) => slot.user)
  availability: VolunteerAvailability[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

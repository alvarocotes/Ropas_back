import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity.js';

/** Un tramo horario del voluntario para un día de la semana (1 = lunes … 7 = domingo). */
@Entity('volunteer_availabilities')
@Index(['userId', 'weekday'], { unique: true })
export class VolunteerAvailability {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => User, (user) => user.availability, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'int' })
  weekday: number;

  @Column({ name: 'start_time', type: 'varchar', length: 5 })
  startTime: string;

  @Column({ name: 'end_time', type: 'varchar', length: 5 })
  endTime: string;
}

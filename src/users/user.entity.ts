import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserRole } from '../common/enums.js';
import { VolunteerAvailability } from './volunteer-availability.entity.js';

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

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { In, Repository } from 'typeorm';
import { UserRole } from '../common/enums.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateAvailabilityDto } from './dto/update-availability.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { User, VolunteerAvailability } from './user.entity.js';

export type AvailabilitySlot = {
  weekday: number;
  startTime: string;
  endTime: string;
};

export type SafeUser = Omit<User, 'passwordHash' | 'availability'> & {
  availability: AvailabilitySlot[];
};

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(VolunteerAvailability)
    private readonly availabilityRepository: Repository<VolunteerAvailability>,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureAvailabilityTable();
    // Solo con SEED_ON_START=true: en serverless este chequeo se pagaría en
    // cada arranque en frío, antes de responder la primera petición.
    if (this.configService.get<string>('SEED_ON_START', 'false') === 'true') {
      await this.seedAdmin();
    }
  }

  /**
   * La tabla de horarios es nueva. Si DB_SYNC está en false (producción) no se
   * crea sola y GET /users reventaría al hacer el join. Se crea aquí si falta.
   */
  private async ensureAvailabilityTable(): Promise<void> {
    const dbType = this.configService.get<string>('DB_TYPE', 'sqlite');
    try {
      if (dbType === 'mysql') {
        await this.availabilityRepository.query(`
          CREATE TABLE IF NOT EXISTS volunteer_availabilities (
            id INT NOT NULL AUTO_INCREMENT,
            user_id INT NOT NULL,
            weekday INT NOT NULL,
            start_time VARCHAR(5) NOT NULL,
            end_time VARCHAR(5) NOT NULL,
            PRIMARY KEY (id),
            UNIQUE KEY IDX_avail_user_weekday (user_id, weekday)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
      } else {
        await this.availabilityRepository.query(`
          CREATE TABLE IF NOT EXISTS volunteer_availabilities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            weekday INTEGER NOT NULL,
            start_time VARCHAR(5) NOT NULL,
            end_time VARCHAR(5) NOT NULL,
            UNIQUE (user_id, weekday)
          )
        `);
      }
    } catch (err) {
      console.error('No se pudo asegurar la tabla volunteer_availabilities:', err);
    }
  }

  toSafe(user: User, slots?: VolunteerAvailability[]): SafeUser {
    const { passwordHash: _passwordHash, availability, ...safe } = user;
    return {
      ...safe,
      availability: this.serializeAvailability(slots ?? availability),
    };
  }

  serializeAvailability(slots?: VolunteerAvailability[]): AvailabilitySlot[] {
    return (slots ?? [])
      .slice()
      .sort((a, b) => a.weekday - b.weekday)
      .map((slot) => ({
        weekday: slot.weekday,
        startTime: slot.startTime,
        endTime: slot.endTime,
      }));
  }

  private async loadSlotsByUserIds(
    userIds: number[],
  ): Promise<Map<number, VolunteerAvailability[]>> {
    const map = new Map<number, VolunteerAvailability[]>();
    if (userIds.length === 0) {
      return map;
    }
    try {
      const slots = await this.availabilityRepository.find({
        where: { userId: In(userIds) },
      });
      for (const slot of slots) {
        const list = map.get(slot.userId) ?? [];
        list.push(slot);
        map.set(slot.userId, list);
      }
    } catch (err) {
      console.error('No se pudieron leer los horarios de voluntarios:', err);
    }
    return map;
  }

  async seedAdmin(): Promise<void> {
    const email = this.configService.get<string>('ADMIN_EMAIL');
    const password = this.configService.get<string>('ADMIN_PASSWORD');
    const fullName = this.configService.get<string>('ADMIN_NAME') ?? 'Administrador ABRIGAR';
    if (!email || !password) {
      return;
    }
    const existing = await this.usersRepository.findOne({ where: { email } });
    if (existing) {
      return;
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const admin = this.usersRepository.create({
      email,
      passwordHash,
      fullName,
      role: UserRole.ADMIN,
      isActive: true,
    });
    await this.usersRepository.save(admin);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findById(id: number): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async getProfile(id: number): Promise<SafeUser> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    const slots = await this.loadSlotsByUserIds([id]);
    return this.toSafe(user, slots.get(id) ?? []);
  }

  async countActiveVolunteers(): Promise<number> {
    return this.usersRepository.count({
      where: { role: UserRole.VOLUNTEER, isActive: true },
    });
  }

  async findAll(): Promise<SafeUser[]> {
    const users = await this.usersRepository.find({ order: { createdAt: 'DESC' } });
    const slots = await this.loadSlotsByUserIds(users.map((user) => user.id));
    return users.map((user) => this.toSafe(user, slots.get(user.id) ?? []));
  }

  async findVolunteerSchedule(): Promise<
    { id: number; fullName: string; availability: AvailabilitySlot[] }[]
  > {
    const volunteers = await this.usersRepository.find({
      where: { role: UserRole.VOLUNTEER, isActive: true },
      order: { fullName: 'ASC' },
    });
    const slots = await this.loadSlotsByUserIds(volunteers.map((user) => user.id));
    return volunteers.map((user) => ({
      id: user.id,
      fullName: user.fullName,
      availability: this.serializeAvailability(slots.get(user.id) ?? []),
    }));
  }

  async create(dto: CreateUserDto): Promise<SafeUser> {
    const existing = await this.findByEmail(dto.email);
    if (existing) {
      throw new BadRequestException('Ya existe un usuario con ese correo');
    }
    const role = dto.role ?? UserRole.VOLUNTEER;
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.usersRepository.create({
      email: dto.email,
      passwordHash,
      fullName: dto.fullName,
      phone: dto.phone ?? null,
      role,
      isActive: true,
    });
    const saved = await this.usersRepository.save(user);
    return this.toSafe(saved, []);
  }

  async update(id: number, dto: UpdateUserDto, actorId?: number): Promise<SafeUser> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    if (dto.isActive === false && actorId === id) {
      throw new BadRequestException('No puedes desactivar tu propia cuenta');
    }
    if (dto.fullName !== undefined) user.fullName = dto.fullName;
    if (dto.phone !== undefined) user.phone = dto.phone;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;
    if (dto.role !== undefined) {
      user.role = dto.role;
      if (dto.role !== UserRole.VOLUNTEER) {
        try {
          await this.availabilityRepository.delete({ userId: user.id });
        } catch (err) {
          console.error('No se pudieron borrar horarios al cambiar el rol:', err);
        }
      }
    }
    if (dto.password) {
      user.passwordHash = await bcrypt.hash(dto.password, 10);
    }
    await this.usersRepository.save(user);
    return this.getProfile(id);
  }

  async updateProfile(id: number, dto: UpdateProfileDto): Promise<SafeUser> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    if (dto.email && dto.email !== user.email) {
      const existing = await this.findByEmail(dto.email);
      if (existing) {
        throw new BadRequestException('Ya existe un usuario con ese correo');
      }
      user.email = dto.email;
    }
    if (dto.fullName !== undefined) user.fullName = dto.fullName;
    if (dto.phone !== undefined) user.phone = dto.phone.trim() ? dto.phone.trim() : null;
    if (dto.password) {
      if (!dto.currentPassword) {
        throw new BadRequestException('Escribe la contraseña actual para cambiarla');
      }
      const matches = await bcrypt.compare(dto.currentPassword, user.passwordHash);
      if (!matches) {
        throw new BadRequestException('La contraseña actual no es correcta');
      }
      user.passwordHash = await bcrypt.hash(dto.password, 10);
    }
    await this.usersRepository.save(user);
    return this.getProfile(id);
  }

  async replaceAvailability(
    id: number,
    slots: UpdateAvailabilityDto['slots'],
  ): Promise<AvailabilitySlot[]> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    if (user.role !== UserRole.VOLUNTEER) {
      throw new ForbiddenException('Solo los voluntarios registran horario semanal');
    }
    const weekdays = new Set<number>();
    for (const slot of slots) {
      if (weekdays.has(slot.weekday)) {
        throw new BadRequestException('Hay un día repetido en el horario');
      }
      weekdays.add(slot.weekday);
      if (slot.startTime >= slot.endTime) {
        throw new BadRequestException(
          'La hora de salida debe ser posterior a la de entrada en cada día',
        );
      }
    }
    await this.ensureAvailabilityTable();
    await this.availabilityRepository.delete({ userId: id });
    if (slots.length > 0) {
      await this.availabilityRepository.save(
        slots.map((slot) =>
          this.availabilityRepository.create({
            userId: id,
            weekday: slot.weekday,
            startTime: slot.startTime,
            endTime: slot.endTime,
          }),
        ),
      );
    }
    const saved = await this.loadSlotsByUserIds([id]);
    return this.serializeAvailability(saved.get(id) ?? []);
  }

  async remove(id: number, actorId?: number): Promise<void> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    if (user.role === UserRole.ADMIN) {
      throw new BadRequestException('No se puede eliminar al administrador');
    }
    if (actorId === id) {
      throw new BadRequestException('No puedes desactivar tu propia cuenta');
    }
    user.isActive = false;
    await this.usersRepository.save(user);
  }
}

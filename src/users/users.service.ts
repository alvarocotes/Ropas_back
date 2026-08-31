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
import { Repository } from 'typeorm';
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
    // Solo con SEED_ON_START=true: en serverless este chequeo se pagaría en
    // cada arranque en frío, antes de responder la primera petición.
    if (this.configService.get<string>('SEED_ON_START', 'false') === 'true') {
      await this.seedAdmin();
    }
  }

  toSafe(user: User): SafeUser {
    const { passwordHash: _passwordHash, availability, ...safe } = user;
    return {
      ...safe,
      availability: this.serializeAvailability(availability),
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
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: { availability: true },
    });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return this.toSafe(user);
  }

  async countActiveVolunteers(): Promise<number> {
    return this.usersRepository.count({
      where: { role: UserRole.VOLUNTEER, isActive: true },
    });
  }

  async findAll(): Promise<SafeUser[]> {
    const users = await this.usersRepository.find({
      relations: { availability: true },
      order: { createdAt: 'DESC' },
    });
    return users.map((user) => this.toSafe(user));
  }

  async findVolunteerSchedule(): Promise<
    { id: number; fullName: string; availability: AvailabilitySlot[] }[]
  > {
    const volunteers = await this.usersRepository.find({
      where: { role: UserRole.VOLUNTEER, isActive: true },
      relations: { availability: true },
      order: { fullName: 'ASC' },
    });
    return volunteers.map((user) => ({
      id: user.id,
      fullName: user.fullName,
      availability: this.serializeAvailability(user.availability),
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
    return this.toSafe(saved);
  }

  async update(id: number, dto: UpdateUserDto): Promise<SafeUser> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    if (dto.fullName !== undefined) user.fullName = dto.fullName;
    if (dto.phone !== undefined) user.phone = dto.phone;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;
    if (dto.role !== undefined) {
      user.role = dto.role;
      if (dto.role !== UserRole.VOLUNTEER) {
        await this.availabilityRepository.delete({ userId: user.id });
      }
    }
    if (dto.password) {
      user.passwordHash = await bcrypt.hash(dto.password, 10);
    }
    const saved = await this.usersRepository.save(user);
    return this.getProfile(saved.id);
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
    return this.serializeAvailability(
      await this.availabilityRepository.find({ where: { userId: id } }),
    );
  }

  async remove(id: number): Promise<void> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    if (user.role === UserRole.ADMIN) {
      throw new BadRequestException('No se puede eliminar al administrador');
    }
    user.isActive = false;
    await this.usersRepository.save(user);
  }
}

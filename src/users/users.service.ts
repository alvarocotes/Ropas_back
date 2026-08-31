import {
  BadRequestException,
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
import { UpdateUserDto } from './dto/update-user.dto.js';
import { User } from './user.entity.js';

export type SafeUser = Omit<User, 'passwordHash'>;

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
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
    const { passwordHash: _passwordHash, ...safe } = user;
    return safe;
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

  async countActiveVolunteers(): Promise<number> {
    return this.usersRepository.count({
      where: { role: UserRole.VOLUNTEER, isActive: true },
    });
  }

  async findAll(): Promise<SafeUser[]> {
    const users = await this.usersRepository.find({ order: { createdAt: 'DESC' } });
    return users.map((user) => this.toSafe(user));
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
    if (dto.role !== undefined) user.role = dto.role;
    if (dto.password) {
      user.passwordHash = await bcrypt.hash(dto.password, 10);
    }
    const saved = await this.usersRepository.save(user);
    return this.toSafe(saved);
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

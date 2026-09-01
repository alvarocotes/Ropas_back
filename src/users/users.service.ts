import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { In, Repository } from 'typeorm';
import { UserRole, effectiveModules, sanitizeModules } from '../common/enums.js';
import { CreateAttendanceDto } from './dto/create-attendance.dto.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateAvailabilityDto } from './dto/update-availability.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { User, UserAttendance, VolunteerAvailability } from './user.entity.js';

export type AvailabilitySlot = {
  weekday: number;
  startTime: string;
  endTime: string;
};

export type AttendanceRecord = {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
};

export type SafeUser = Omit<User, 'passwordHash' | 'availability' | 'attendances'> & {
  availability: AvailabilitySlot[];
  attendances: AttendanceRecord[];
  modules: string[];
};

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(VolunteerAvailability)
    private readonly availabilityRepository: Repository<VolunteerAvailability>,
    @InjectRepository(UserAttendance)
    private readonly attendanceRepository: Repository<UserAttendance>,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureAvailabilityTable();
    await this.ensureAttendanceTable();
    await this.ensureModulesColumn();
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

  private async ensureAttendanceTable(): Promise<void> {
    const dbType = this.configService.get<string>('DB_TYPE', 'sqlite');
    try {
      if (dbType === 'mysql') {
        await this.attendanceRepository.query(`
          CREATE TABLE IF NOT EXISTS user_attendances (
            id INT NOT NULL AUTO_INCREMENT,
            user_id INT NOT NULL,
            work_date VARCHAR(10) NOT NULL,
            start_time VARCHAR(5) NOT NULL,
            end_time VARCHAR(5) NOT NULL,
            PRIMARY KEY (id),
            UNIQUE KEY IDX_att_user_date_start (user_id, work_date, start_time)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
      } else {
        await this.attendanceRepository.query(`
          CREATE TABLE IF NOT EXISTS user_attendances (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            work_date VARCHAR(10) NOT NULL,
            start_time VARCHAR(5) NOT NULL,
            end_time VARCHAR(5) NOT NULL,
            UNIQUE (user_id, work_date, start_time)
          )
        `);
      }
    } catch (err) {
      console.error('No se pudo asegurar la tabla user_attendances:', err);
    }
  }

  private async ensureModulesColumn(): Promise<void> {
    try {
      await this.usersRepository.query(`ALTER TABLE users ADD COLUMN modules TEXT NULL`);
    } catch {
      /* ya existe */
    }
  }

  toSafe(
    user: User,
    slots?: VolunteerAvailability[],
    attendances?: UserAttendance[],
  ): SafeUser {
    const { passwordHash: _passwordHash, availability, attendances: _att, ...safe } = user;
    return {
      ...safe,
      modules: effectiveModules(user.role, user.modules),
      availability: this.serializeAvailability(slots ?? availability),
      attendances: this.serializeAttendances(attendances),
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

  serializeAttendances(rows?: UserAttendance[]): AttendanceRecord[] {
    return (rows ?? [])
      .slice()
      .sort((a, b) => a.workDate.localeCompare(b.workDate) || a.startTime.localeCompare(b.startTime))
      .map((row) => ({
        id: row.id,
        date: row.workDate,
        startTime: row.startTime,
        endTime: row.endTime,
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

  private async loadAttendancesByUserIds(
    userIds: number[],
  ): Promise<Map<number, UserAttendance[]>> {
    const map = new Map<number, UserAttendance[]>();
    if (userIds.length === 0) {
      return map;
    }
    try {
      const rows = await this.attendanceRepository.find({
        where: { userId: In(userIds) },
      });
      for (const row of rows) {
        const list = map.get(row.userId) ?? [];
        list.push(row);
        map.set(row.userId, list);
      }
    } catch (err) {
      console.error('No se pudieron leer las asistencias por fecha:', err);
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
    const attendances = await this.loadAttendancesByUserIds([id]);
    return this.toSafe(user, slots.get(id) ?? [], attendances.get(id) ?? []);
  }

  async countActiveVolunteers(): Promise<number> {
    return this.usersRepository.count({
      where: { role: UserRole.VOLUNTEER, isActive: true },
    });
  }

  async findAll(): Promise<SafeUser[]> {
    const users = await this.usersRepository.find({ order: { createdAt: 'DESC' } });
    const slots = await this.loadSlotsByUserIds(users.map((user) => user.id));
    const attendances = await this.loadAttendancesByUserIds(users.map((user) => user.id));
    return users.map((user) =>
      this.toSafe(user, slots.get(user.id) ?? [], attendances.get(user.id) ?? []),
    );
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

  async listAttendance(userId: number): Promise<AttendanceRecord[]> {
    await this.ensureAttendanceTable();
    const rows = await this.loadAttendancesByUserIds([userId]);
    return this.serializeAttendances(rows.get(userId) ?? []);
  }

  async addAttendance(userId: number, dto: CreateAttendanceDto): Promise<AttendanceRecord[]> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    if (!isValidIsoDate(dto.date)) {
      throw new BadRequestException('La fecha no es válida');
    }
    if (dto.startTime >= dto.endTime) {
      throw new BadRequestException('La hora de salida debe ser posterior a la de entrada');
    }
    await this.ensureAttendanceTable();
    const exists = await this.attendanceRepository.findOne({
      where: { userId, workDate: dto.date, startTime: dto.startTime },
    });
    if (exists) {
      throw new BadRequestException('Ya registraste ese horario en esa fecha');
    }
    await this.attendanceRepository.save(
      this.attendanceRepository.create({
        userId,
        workDate: dto.date,
        startTime: dto.startTime,
        endTime: dto.endTime,
      }),
    );
    return this.listAttendance(userId);
  }

  async removeAttendance(userId: number, attendanceId: number): Promise<AttendanceRecord[]> {
    await this.ensureAttendanceTable();
    const row = await this.attendanceRepository.findOne({
      where: { id: attendanceId, userId },
    });
    if (!row) {
      throw new NotFoundException('Ese registro de horario no existe');
    }
    await this.attendanceRepository.remove(row);
    return this.listAttendance(userId);
  }

  async findAttendanceForDate(date?: string): Promise<
    {
      id: number;
      userId: number;
      fullName: string;
      role: UserRole;
      date: string;
      startTime: string;
      endTime: string;
    }[]
  > {
    const workDate = date && isValidIsoDate(date) ? date : todayBogota();
    await this.ensureAttendanceTable();
    let rows: UserAttendance[] = [];
    try {
      rows = await this.attendanceRepository.find({ where: { workDate } });
    } catch (err) {
      console.error('No se pudieron leer las asistencias por fecha:', err);
      return [];
    }
    if (rows.length === 0) {
      return [];
    }
    const users = await this.usersRepository.find({
      where: { id: In(rows.map((row) => row.userId)), isActive: true },
    });
    const byId = new Map(users.map((user) => [user.id, user]));
    return rows
      .filter((row) => byId.has(row.userId))
      .sort((a, b) => {
        const time = a.startTime.localeCompare(b.startTime);
        if (time !== 0) return time;
        return byId.get(a.userId)!.fullName.localeCompare(byId.get(b.userId)!.fullName, 'es');
      })
      .map((row) => {
        const user = byId.get(row.userId)!;
        return {
          id: row.id,
          userId: row.userId,
          fullName: user.fullName,
          role: user.role,
          date: row.workDate,
          startTime: row.startTime,
          endTime: row.endTime,
        };
      });
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
      modules: role === UserRole.ADMIN ? null : sanitizeModules(dto.modules),
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
    if (dto.role !== undefined && actorId === id && dto.role !== user.role) {
      throw new BadRequestException('No puedes cambiar tu propio rol');
    }
    await this.assertNotLastActiveAdmin(user, dto.role, dto.isActive);
    if (dto.email !== undefined && dto.email !== user.email) {
      const existing = await this.findByEmail(dto.email);
      if (existing) {
        throw new BadRequestException('Ya existe un usuario con ese correo');
      }
      user.email = dto.email;
    }
    if (dto.fullName !== undefined) user.fullName = dto.fullName;
    if (dto.phone !== undefined) user.phone = dto.phone?.trim() ? dto.phone.trim() : null;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;
    if (dto.role !== undefined) {
      user.role = dto.role;
    }
    if (user.role === UserRole.ADMIN) {
      user.modules = null;
    } else if (dto.modules !== undefined && actorId !== id) {
      user.modules = sanitizeModules(dto.modules);
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
    if (actorId === id) {
      throw new BadRequestException('No puedes desactivar tu propia cuenta');
    }
    await this.assertNotLastActiveAdmin(user, undefined, false);
    user.isActive = false;
    await this.usersRepository.save(user);
  }

  /** No dejar el sistema sin un administrador activo. */
  private async assertNotLastActiveAdmin(
    user: User,
    nextRole?: UserRole,
    nextActive?: boolean,
  ): Promise<void> {
    const staysAdmin =
      (nextRole ?? user.role) === UserRole.ADMIN && (nextActive ?? user.isActive) !== false;
    if (staysAdmin || user.role !== UserRole.ADMIN || !user.isActive) {
      return;
    }
    const admins = await this.usersRepository.count({
      where: { role: UserRole.ADMIN, isActive: true },
    });
    if (admins <= 1) {
      throw new BadRequestException('Debe quedar al menos un administrador activo');
    }
  }
}

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function todayBogota(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
}

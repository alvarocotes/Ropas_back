import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TimeVolunteerHelpType, TimeVolunteerStatus } from '../common/enums.js';
import { CreateTimeVolunteerDto } from './dto/create-time-volunteer.dto.js';
import { UpdateTimeVolunteerDto } from './dto/update-time-volunteer.dto.js';
import { TimeVolunteer, TimeVolunteerSlot } from './time-volunteer.entity.js';

@Injectable()
export class TimeVolunteersService implements OnModuleInit {
  constructor(
    @InjectRepository(TimeVolunteer)
    private readonly volunteersRepository: Repository<TimeVolunteer>,
    @InjectRepository(TimeVolunteerSlot)
    private readonly slotsRepository: Repository<TimeVolunteerSlot>,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureTables();
  }

  private async ensureTables(): Promise<void> {
    const dbType = this.configService.get<string>('DB_TYPE', 'sqlite');
    try {
      if (dbType === 'mysql') {
        await this.volunteersRepository.query(`
          CREATE TABLE IF NOT EXISTS time_volunteers (
            id INT NOT NULL AUTO_INCREMENT,
            full_name VARCHAR(150) NOT NULL,
            phone VARCHAR(40) NOT NULL,
            email VARCHAR(150) NULL,
            notes VARCHAR(1000) NULL,
            staff_notes VARCHAR(1000) NULL,
            help_type VARCHAR(32) NOT NULL DEFAULT 'transporte',
            has_vehicle TINYINT(1) NOT NULL DEFAULT 0,
            vehicle_type VARCHAR(32) NULL,
            vehicle_info VARCHAR(200) NULL,
            status VARCHAR(32) NOT NULL DEFAULT 'nuevo',
            created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
            updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
            PRIMARY KEY (id)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
        await this.slotsRepository.query(`
          CREATE TABLE IF NOT EXISTS time_volunteer_slots (
            id INT NOT NULL AUTO_INCREMENT,
            volunteer_id INT NOT NULL,
            weekday INT NOT NULL,
            start_time VARCHAR(5) NOT NULL,
            end_time VARCHAR(5) NOT NULL,
            PRIMARY KEY (id),
            UNIQUE KEY IDX_tv_vol_weekday (volunteer_id, weekday)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
      } else {
        await this.volunteersRepository.query(`
          CREATE TABLE IF NOT EXISTS time_volunteers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name VARCHAR(150) NOT NULL,
            phone VARCHAR(40) NOT NULL,
            email VARCHAR(150),
            notes VARCHAR(1000),
            staff_notes VARCHAR(1000),
            help_type VARCHAR(32) NOT NULL DEFAULT 'transporte',
            has_vehicle INTEGER NOT NULL DEFAULT 0,
            vehicle_type VARCHAR(32),
            vehicle_info VARCHAR(200),
            status VARCHAR(32) NOT NULL DEFAULT 'nuevo',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
        await this.slotsRepository.query(`
          CREATE TABLE IF NOT EXISTS time_volunteer_slots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            volunteer_id INTEGER NOT NULL,
            weekday INTEGER NOT NULL,
            start_time VARCHAR(5) NOT NULL,
            end_time VARCHAR(5) NOT NULL,
            UNIQUE (volunteer_id, weekday)
          )
        `);
      }
      await this.ensureTransportColumns(dbType);
      await this.dropOrphanSlots();
    } catch (err) {
      console.error('No se pudieron asegurar las tablas de voluntarios de transporte:', err);
    }
  }

  private async dropOrphanSlots(): Promise<void> {
    const dbType = this.configService.get<string>('DB_TYPE', 'sqlite');
    try {
      if (dbType === 'mysql') {
        await this.slotsRepository.query(`
          DELETE s FROM time_volunteer_slots s
          LEFT JOIN time_volunteers v ON v.id = s.volunteer_id
          WHERE v.id IS NULL
        `);
      } else {
        await this.slotsRepository.query(`
          DELETE FROM time_volunteer_slots
          WHERE volunteer_id NOT IN (SELECT id FROM time_volunteers)
        `);
      }
    } catch (err) {
      console.error('No se pudieron limpiar horarios de voluntarios huérfanos:', err);
    }
  }

  private async ensureTransportColumns(dbType: string): Promise<void> {
    const columns =
      dbType === 'mysql'
        ? [
            { name: 'has_vehicle', sql: 'TINYINT(1) NOT NULL DEFAULT 0' },
            { name: 'vehicle_info', sql: 'VARCHAR(200) NULL' },
            { name: 'help_type', sql: "VARCHAR(32) NOT NULL DEFAULT 'transporte'" },
            { name: 'vehicle_type', sql: 'VARCHAR(32) NULL' },
          ]
        : [
            { name: 'has_vehicle', sql: 'INTEGER NOT NULL DEFAULT 0' },
            { name: 'vehicle_info', sql: 'VARCHAR(200)' },
            { name: 'help_type', sql: "VARCHAR(32) NOT NULL DEFAULT 'transporte'" },
            { name: 'vehicle_type', sql: 'VARCHAR(32)' },
          ];
    const existing = new Set<string>();
    if (dbType === 'mysql') {
      const rows: Array<{ Field?: string }> = await this.volunteersRepository.query(
        'SHOW COLUMNS FROM time_volunteers',
      );
      for (const row of rows) {
        if (row.Field) existing.add(row.Field);
      }
    } else {
      const rows: Array<{ name: string }> = await this.volunteersRepository.query(
        'PRAGMA table_info(time_volunteers)',
      );
      for (const row of rows) existing.add(row.name);
    }
    for (const column of columns) {
      if (existing.has(column.name)) continue;
      await this.volunteersRepository.query(
        `ALTER TABLE time_volunteers ADD COLUMN ${column.name} ${column.sql}`,
      );
    }
  }

  private toPublic(volunteer: TimeVolunteer) {
    return {
      id: volunteer.id,
      fullName: volunteer.fullName,
      phone: volunteer.phone,
      email: volunteer.email,
      notes: volunteer.notes,
      staffNotes: volunteer.staffNotes,
      helpType: volunteer.helpType ?? TimeVolunteerHelpType.TRANSPORTE,
      hasVehicle: Boolean(volunteer.hasVehicle),
      vehicleType: volunteer.vehicleType ?? null,
      vehicleInfo: volunteer.vehicleInfo,
      status: volunteer.status,
      createdAt: volunteer.createdAt,
      availability: (volunteer.slots ?? [])
        .slice()
        .sort((a, b) => a.weekday - b.weekday)
        .map((slot) => ({
          weekday: slot.weekday,
          startTime: slot.startTime,
          endTime: slot.endTime,
        })),
    };
  }

  private validateSlots(slots: CreateTimeVolunteerDto['slots'] = []) {
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
  }

  async create(dto: CreateTimeVolunteerDto) {
    const slots = dto.slots ?? [];
    this.validateSlots(slots);
    if (slots.length === 0) {
      throw new BadRequestException('Marca al menos un día y de qué hora a qué hora puedes ayudar');
    }
    const helpType = dto.helpType;
    if (helpType === TimeVolunteerHelpType.TRANSPORTE && !dto.vehicleType) {
      throw new BadRequestException('Indica si tienes moto, carro u otro vehículo');
    }
    await this.ensureTables();
    const vehicleType = helpType === TimeVolunteerHelpType.TRANSPORTE ? (dto.vehicleType ?? null) : null;
    const saved = await this.volunteersRepository.save(
      this.volunteersRepository.create({
        fullName: dto.fullName.trim(),
        phone: dto.phone.trim(),
        email: dto.email?.trim() ? dto.email.trim() : null,
        notes: dto.notes?.trim() ? dto.notes.trim() : null,
        helpType,
        hasVehicle: helpType === TimeVolunteerHelpType.TRANSPORTE,
        vehicleType,
        vehicleInfo:
          helpType === TimeVolunteerHelpType.TRANSPORTE && dto.vehicleInfo?.trim()
            ? dto.vehicleInfo.trim()
            : null,
        status: TimeVolunteerStatus.NUEVO,
      }),
    );
    if (slots.length > 0) {
      await this.slotsRepository.save(
        slots.map((slot) =>
          this.slotsRepository.create({
            volunteerId: saved.id,
            weekday: slot.weekday,
            startTime: slot.startTime,
            endTime: slot.endTime,
          }),
        ),
      );
    }
    return this.toPublic(await this.findEntity(saved.id));
  }

  async findAll() {
    try {
      const list = await this.volunteersRepository.find({
        relations: { slots: true },
        order: { createdAt: 'DESC' },
      });
      return list.map((item) => this.toPublic(item));
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (message.includes('does not exist') || message.includes("doesn't exist")) {
        await this.ensureTables();
        return [];
      }
      if (message.includes('Unknown column') || message.includes('no such column')) {
        await this.ensureTables();
        const list = await this.volunteersRepository.find({
          relations: { slots: true },
          order: { createdAt: 'DESC' },
        });
        return list.map((item) => this.toPublic(item));
      }
      throw err;
    }
  }

  private async findEntity(id: number) {
    const volunteer = await this.volunteersRepository.findOne({
      where: { id },
      relations: { slots: true },
    });
    if (!volunteer) {
      throw new NotFoundException('Registro no encontrado');
    }
    return volunteer;
  }

  async update(id: number, dto: UpdateTimeVolunteerDto) {
    const volunteer = await this.findEntity(id);
    if (dto.status !== undefined) volunteer.status = dto.status;
    if (dto.staffNotes !== undefined) volunteer.staffNotes = dto.staffNotes;
    await this.volunteersRepository.save(volunteer);
    return this.toPublic(await this.findEntity(id));
  }
}

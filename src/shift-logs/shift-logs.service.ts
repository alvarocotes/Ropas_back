import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '../common/enums.js';
import { CreateShiftLogDto } from './dto/create-shift-log.dto.js';
import { UpdateShiftLogDto } from './dto/update-shift-log.dto.js';
import { ShiftLog } from './shift-log.entity.js';

export type ShiftLogDto = {
  id: number;
  userId: number;
  authorName: string;
  workDate: string;
  startTime: string;
  endTime: string;
  summary: string;
  followUp: string;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class ShiftLogsService implements OnModuleInit {
  constructor(
    @InjectRepository(ShiftLog)
    private readonly logsRepository: Repository<ShiftLog>,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureTable();
  }

  private async ensureTable(): Promise<void> {
    const dbType = this.configService.get<string>('DB_TYPE', 'sqlite');
    try {
      if (dbType === 'mysql') {
        await this.logsRepository.query(`
          CREATE TABLE IF NOT EXISTS shift_logs (
            id INT NOT NULL AUTO_INCREMENT,
            user_id INT NOT NULL,
            work_date VARCHAR(10) NOT NULL,
            start_time VARCHAR(5) NOT NULL,
            end_time VARCHAR(5) NOT NULL,
            summary TEXT NOT NULL,
            follow_up TEXT NOT NULL,
            created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
            updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
            PRIMARY KEY (id),
            KEY IDX_shift_logs_date (work_date)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
      } else {
        await this.logsRepository.query(`
          CREATE TABLE IF NOT EXISTS shift_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            work_date VARCHAR(10) NOT NULL,
            start_time VARCHAR(5) NOT NULL,
            end_time VARCHAR(5) NOT NULL,
            summary TEXT NOT NULL,
            follow_up TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
      }
    } catch (err) {
      console.error('No se pudo asegurar la tabla de bitácora:', err);
    }
  }

  private assertTimes(startTime: string, endTime: string) {
    if (startTime >= endTime) {
      throw new BadRequestException('La hora de fin debe ser posterior a la de inicio');
    }
  }

  private toDto(row: ShiftLog): ShiftLogDto {
    return {
      id: row.id,
      userId: row.userId,
      authorName: row.user?.fullName ?? 'Sin nombre',
      workDate: row.workDate,
      startTime: row.startTime,
      endTime: row.endTime,
      summary: row.summary,
      followUp: row.followUp,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async findAll(date?: string): Promise<ShiftLogDto[]> {
    await this.ensureTable();
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BadRequestException('La fecha no es válida');
    }
    const rows = await this.logsRepository.find({
      where: date ? { workDate: date } : undefined,
      relations: { user: true },
      order: { workDate: 'DESC', startTime: 'DESC', id: 'DESC' },
    });
    return rows.map((row) => this.toDto(row));
  }

  async create(userId: number, dto: CreateShiftLogDto): Promise<ShiftLogDto> {
    await this.ensureTable();
    this.assertTimes(dto.startTime, dto.endTime);
    const saved = await this.logsRepository.save(
      this.logsRepository.create({
        userId,
        workDate: dto.workDate,
        startTime: dto.startTime,
        endTime: dto.endTime,
        summary: dto.summary,
        followUp: dto.followUp,
      }),
    );
    const full = await this.logsRepository.findOne({
      where: { id: saved.id },
      relations: { user: true },
    });
    if (!full) throw new NotFoundException('No se encontró la bitácora');
    return this.toDto(full);
  }

  async update(
    id: number,
    dto: UpdateShiftLogDto,
    actor: { id: number; role: UserRole },
  ): Promise<ShiftLogDto> {
    await this.ensureTable();
    const row = await this.logsRepository.findOne({ where: { id }, relations: { user: true } });
    if (!row) throw new NotFoundException('No se encontró la bitácora');
    if (actor.role !== UserRole.ADMIN && row.userId !== actor.id) {
      throw new ForbiddenException('Solo puedes editar tu propia bitácora');
    }
    const startTime = dto.startTime ?? row.startTime;
    const endTime = dto.endTime ?? row.endTime;
    this.assertTimes(startTime, endTime);
    if (dto.workDate !== undefined) row.workDate = dto.workDate;
    if (dto.startTime !== undefined) row.startTime = dto.startTime;
    if (dto.endTime !== undefined) row.endTime = dto.endTime;
    if (dto.summary !== undefined) row.summary = dto.summary;
    if (dto.followUp !== undefined) row.followUp = dto.followUp;
    await this.logsRepository.save(row);
    const full = await this.logsRepository.findOne({ where: { id }, relations: { user: true } });
    if (!full) throw new NotFoundException('No se encontró la bitácora');
    return this.toDto(full);
  }

  async remove(id: number, actor: { id: number; role: UserRole }): Promise<void> {
    await this.ensureTable();
    const row = await this.logsRepository.findOne({ where: { id } });
    if (!row) throw new NotFoundException('No se encontró la bitácora');
    if (actor.role !== UserRole.ADMIN && row.userId !== actor.id) {
      throw new ForbiddenException('Solo puedes borrar tu propia bitácora');
    }
    await this.logsRepository.remove(row);
  }
}

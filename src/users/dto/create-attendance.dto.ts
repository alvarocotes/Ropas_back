import { Transform } from 'class-transformer';
import { Matches } from 'class-validator';

function toHm(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const match = value.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return value;
  const hours = Number(match[1]);
  const minutes = match[2];
  if (hours > 23) return value;
  return `${String(hours).padStart(2, '0')}:${minutes}`;
}

export class CreateAttendanceDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'La fecha no es válida' })
  date: string;

  @Transform(({ value }) => toHm(value))
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'La hora de entrada no es válida' })
  startTime: string;

  @Transform(({ value }) => toHm(value))
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'La hora de salida no es válida' })
  endTime: string;
}

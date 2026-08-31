import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

const emptyToUndefined = ({ value }: { value: unknown }) =>
  value === '' || value === null || value === undefined ? undefined : value;

function toHm(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const match = value.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return value;
  const hours = Number(match[1]);
  const minutes = match[2];
  if (hours > 23) return value;
  return `${String(hours).padStart(2, '0')}:${minutes}`;
}

export class TimeVolunteerSlotDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(7)
  weekday: number;

  @Transform(({ value }) => toHm(value))
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'La hora de entrada no es válida' })
  startTime: string;

  @Transform(({ value }) => toHm(value))
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'La hora de salida no es válida' })
  endTime: string;
}

export class CreateTimeVolunteerDto {
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  fullName: string;

  @IsString()
  @MinLength(7)
  @MaxLength(40)
  phone: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsEmail({}, { message: 'El correo no es válido' })
  @MaxLength(150)
  email?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Marca al menos un día y un horario' })
  @ValidateNested({ each: true })
  @Type(() => TimeVolunteerSlotDto)
  slots: TimeVolunteerSlotDto[];
}

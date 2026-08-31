import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { UserRole } from '../../common/enums.js';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const trimLower = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

const emptyToNull = ({ value }: { value: unknown }) =>
  value === '' || value === undefined ? null : value;

export class UpdateUserDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  fullName?: string;

  @IsOptional()
  @Transform(trimLower)
  @IsEmail()
  email?: string;

  @IsOptional()
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(30)
  phone?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

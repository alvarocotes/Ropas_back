import { Transform } from 'class-transformer';
import { IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { UserRole } from '../../common/enums.js';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const trimLower = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

const emptyToUndefined = ({ value }: { value: unknown }) =>
  value === '' || value === null || value === undefined ? undefined : value;

export class CreateUserDto {
  @Transform(trimLower)
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password: string;

  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  fullName: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

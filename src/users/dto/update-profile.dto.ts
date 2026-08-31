import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const trimLower = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class UpdateProfileDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(2)
  fullName?: string;

  @IsOptional()
  @Transform(trimLower)
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsString()
  currentPassword?: string;
}

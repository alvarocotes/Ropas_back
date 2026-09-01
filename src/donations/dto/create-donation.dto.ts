import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateDonationItemDto {
  @IsOptional()
  @IsInt()
  productId?: number;

  @IsString()
  productName: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsString()
  unit?: string;
}

export class CreateDonationDto {
  @Transform(trim)
  @IsString()
  @MinLength(2, { message: 'Escribe tu nombre' })
  @MaxLength(120)
  donorName: string;

  @Transform(trim)
  @IsString()
  @MinLength(7, { message: 'Escribe un celular o correo de contacto' })
  @MaxLength(120)
  contact: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateDonationItemDto)
  items: CreateDonationItemDto[];
}

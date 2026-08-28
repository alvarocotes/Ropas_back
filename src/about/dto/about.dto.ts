import {
  IsBoolean,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateSectionDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  title?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsInt()
  position?: number;

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;
}

export class UpdateLocationDto {
  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @IsOptional()
  @IsLongitude()
  longitude?: number;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  geoLabel?: string;

  /** Prendas entregadas fuera del inventario (jornadas, entregas anteriores). */
  @IsOptional()
  @IsInt()
  @Min(0)
  manualItemsDelivered?: number;

  /** Personas atendidas en esa entrega, para corregir el dato del historial. */
  @IsOptional()
  @IsInt()
  @Min(1)
  peopleCount?: number;
}

export class CreateSectionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  sectionKey: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title: string;

  @IsString()
  body: string;

  @IsOptional()
  @IsInt()
  position?: number;

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;
}

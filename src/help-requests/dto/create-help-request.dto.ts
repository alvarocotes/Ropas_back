import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const emptyToUndefined = ({ value }: { value: unknown }) =>
  value === '' || value === null || value === undefined ? undefined : value;

export class CreateHelpRequestDto {
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  fullName: string;

  @IsString()
  @MinLength(4)
  @MaxLength(40)
  identificationNumber: string;

  @IsString()
  @MinLength(3)
  @MaxLength(300)
  residenceBefore: string;

  @IsString()
  @MinLength(3)
  @MaxLength(300)
  residenceAfter: string;

  @IsString()
  @MinLength(7)
  @MaxLength(40)
  phoneWhatsapp: string;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  affectationType: string;

  @IsIn(['familiar', 'comunidad'])
  clothingScope: 'familiar' | 'comunidad';

  @IsInt()
  @Min(1)
  peopleCount: number;

  @IsBoolean()
  hasOwnTransport: boolean;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(200)
  babySizes?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(200)
  girlShirtSizes?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(200)
  girlPantsSizes?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(200)
  womanShirtSizes?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(200)
  womanPantsSizes?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(200)
  boyShirtSizes?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(200)
  boyPantsSizes?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(200)
  manShirtSizes?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(200)
  manPantsSizes?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(400)
  underwearNeeds?: string;

  @IsBoolean()
  needsLinens: boolean;

  @IsBoolean()
  needsDiapers: boolean;

  @IsBoolean()
  needsSanitary: boolean;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(1000)
  additionalNeeds?: string;
}

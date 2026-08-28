import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { DonationStatus } from '../../common/enums.js';

export class UpdateDonationItemDto {
  @IsInt()
  id: number;

  @IsOptional()
  @IsInt()
  productId?: number;
}

export class UpdateDonationDto {
  @IsOptional()
  @IsEnum(DonationStatus)
  status?: DonationStatus;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateDonationItemDto)
  items?: UpdateDonationItemDto[];
}

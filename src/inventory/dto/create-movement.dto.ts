import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { MovementType } from '../../common/enums.js';

export class CreateMovementDto {
  @IsInt()
  productId: number;

  @IsEnum(MovementType)
  type: MovementType;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsString()
  note?: string;
}

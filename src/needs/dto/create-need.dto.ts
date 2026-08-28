import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateNeedDto {
  @IsOptional()
  @IsInt()
  productId?: number;

  @IsString()
  title: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantityNeeded?: number;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;
}

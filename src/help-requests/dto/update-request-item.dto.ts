import { IsInt, Min } from 'class-validator';

export class UpdateRequestItemDto {
  @IsInt()
  @Min(1)
  quantity: number;
}

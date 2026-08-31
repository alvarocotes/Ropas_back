import { Type } from 'class-transformer';
import { IsArray, IsInt, Matches, Max, Min, ValidateNested } from 'class-validator';

export class AvailabilitySlotDto {
  @IsInt()
  @Min(1)
  @Max(7)
  weekday: number;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  startTime: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  endTime: string;
}

export class UpdateAvailabilityDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvailabilitySlotDto)
  slots: AvailabilitySlotDto[];
}

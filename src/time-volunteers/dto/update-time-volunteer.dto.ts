import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { TimeVolunteerStatus } from '../../common/enums.js';

const emptyToNull = ({ value }: { value: unknown }) =>
  value === '' || value === undefined ? null : value;

export class UpdateTimeVolunteerDto {
  @IsOptional()
  @IsIn(Object.values(TimeVolunteerStatus))
  status?: TimeVolunteerStatus;

  @IsOptional()
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(1000)
  staffNotes?: string | null;
}

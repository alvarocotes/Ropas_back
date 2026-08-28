import { IsEnum, IsOptional, IsString } from 'class-validator';
import { RequestStatus } from '../../common/enums.js';

export class UpdateHelpRequestDto {
  @IsOptional()
  @IsEnum(RequestStatus)
  status?: RequestStatus;

  @IsOptional()
  @IsString()
  internalNotes?: string;

  @IsOptional()
  @IsString()
  transportNotes?: string;
}

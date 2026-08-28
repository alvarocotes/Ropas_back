import { PartialType } from '@nestjs/mapped-types';
import { CreateNeedDto } from './create-need.dto.js';

export class UpdateNeedDto extends PartialType(CreateNeedDto) {}

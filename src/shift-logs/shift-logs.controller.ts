import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Modules } from '../common/decorators/modules.decorator.js';
import { AppModule } from '../common/enums.js';
import type { SafeUser } from '../users/users.service.js';
import { CreateShiftLogDto } from './dto/create-shift-log.dto.js';
import { UpdateShiftLogDto } from './dto/update-shift-log.dto.js';
import { ShiftLogsService } from './shift-logs.service.js';

@Modules(AppModule.SHIFT_LOG)
@Controller('shift-logs')
export class ShiftLogsController {
  constructor(private readonly shiftLogsService: ShiftLogsService) {}

  @Get()
  findAll(@Query('date') date?: string) {
    return this.shiftLogsService.findAll(date);
  }

  @Post()
  create(@Body() dto: CreateShiftLogDto, @CurrentUser() user: SafeUser) {
    return this.shiftLogsService.create(user.id, dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateShiftLogDto,
    @CurrentUser() user: SafeUser,
  ) {
    return this.shiftLogsService.update(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: SafeUser) {
    return this.shiftLogsService.remove(id, user);
  }
}

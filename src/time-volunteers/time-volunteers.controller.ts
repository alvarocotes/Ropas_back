import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator.js';
import { Modules } from '../common/decorators/modules.decorator.js';
import { AppModule } from '../common/enums.js';
import { CreateTimeVolunteerDto } from './dto/create-time-volunteer.dto.js';
import { UpdateTimeVolunteerDto } from './dto/update-time-volunteer.dto.js';
import { TimeVolunteersService } from './time-volunteers.service.js';

@Modules(AppModule.TIME_VOLUNTEERS)
@Controller('time-volunteers')
export class TimeVolunteersController {
  constructor(private readonly timeVolunteersService: TimeVolunteersService) {}

  @Public()
  @Post()
  create(@Body() dto: CreateTimeVolunteerDto) {
    return this.timeVolunteersService.create(dto);
  }

  @Get()
  findAll() {
    return this.timeVolunteersService.findAll();
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTimeVolunteerDto) {
    return this.timeVolunteersService.update(id, dto);
  }
}

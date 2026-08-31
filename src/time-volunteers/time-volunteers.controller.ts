import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '../common/enums.js';
import { CreateTimeVolunteerDto } from './dto/create-time-volunteer.dto.js';
import { UpdateTimeVolunteerDto } from './dto/update-time-volunteer.dto.js';
import { TimeVolunteersService } from './time-volunteers.service.js';

@Roles(UserRole.ADMIN, UserRole.RECEPTION)
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

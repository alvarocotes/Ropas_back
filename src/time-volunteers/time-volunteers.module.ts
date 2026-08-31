import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TimeVolunteer, TimeVolunteerSlot } from './time-volunteer.entity.js';
import { TimeVolunteersController } from './time-volunteers.controller.js';
import { TimeVolunteersService } from './time-volunteers.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([TimeVolunteer, TimeVolunteerSlot])],
  controllers: [TimeVolunteersController],
  providers: [TimeVolunteersService],
})
export class TimeVolunteersModule {}

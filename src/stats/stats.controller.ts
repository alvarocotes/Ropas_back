import { Controller, Get, Query } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator.js';
import { UsersService } from '../users/users.service.js';

@Controller('stats')
export class StatsController {
  constructor(private readonly usersService: UsersService) {}

  @Public()
  @Get('volunteers-count')
  async volunteersCount() {
    return { count: await this.usersService.countActiveVolunteers() };
  }

  @Get('volunteer-schedule')
  volunteerSchedule() {
    return this.usersService.findVolunteerSchedule();
  }

  /** Quién asiste un día concreto. El cliente debe mandar la fecha local YYYY-MM-DD. */
  @Get('staff-attendance')
  staffAttendance(@Query('date') date?: string) {
    return this.usersService.findAttendanceForDate(date);
  }
}

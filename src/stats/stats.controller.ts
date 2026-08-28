import { Controller, Get } from '@nestjs/common';
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
}

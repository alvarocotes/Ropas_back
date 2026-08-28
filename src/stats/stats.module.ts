import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import { StatsController } from './stats.controller.js';

@Module({
  imports: [UsersModule],
  controllers: [StatsController],
})
export class StatsModule {}

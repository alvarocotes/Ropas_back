import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShiftLog } from './shift-log.entity.js';
import { ShiftLogsController } from './shift-logs.controller.js';
import { ShiftLogsService } from './shift-logs.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([ShiftLog])],
  controllers: [ShiftLogsController],
  providers: [ShiftLogsService],
})
export class ShiftLogsModule {}

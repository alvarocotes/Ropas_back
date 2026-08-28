import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryModule } from '../inventory/inventory.module.js';
import { HelpRequest } from './help-request.entity.js';
import { HelpRequestItem } from './help-request-item.entity.js';
import { HelpRequestsController } from './help-requests.controller.js';
import { HelpRequestsService } from './help-requests.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([HelpRequest, HelpRequestItem]), InventoryModule],
  controllers: [HelpRequestsController],
  providers: [HelpRequestsService],
})
export class HelpRequestsModule {}

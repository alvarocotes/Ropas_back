import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryModule } from '../inventory/inventory.module.js';
import { DonationItem } from './donation-item.entity.js';
import { Donation } from './donation.entity.js';
import { DonationsController } from './donations.controller.js';
import { DonationsService } from './donations.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Donation, DonationItem]), InventoryModule],
  controllers: [DonationsController],
  providers: [DonationsService],
})
export class DonationsModule {}

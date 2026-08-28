import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../inventory/product.entity.js';
import { NeedsController } from './needs.controller.js';
import { NeedsService } from './needs.service.js';
import { PublicNeed } from './public-need.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([PublicNeed, Product])],
  controllers: [NeedsController],
  providers: [NeedsService],
})
export class NeedsModule {}

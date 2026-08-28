import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HelpRequestItem } from '../help-requests/help-request-item.entity.js';
import { HelpRequest } from '../help-requests/help-request.entity.js';
import { User } from '../users/user.entity.js';
import { AboutSection } from './about-section.entity.js';
import { AboutController } from './about.controller.js';
import { AboutService } from './about.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([AboutSection, HelpRequest, HelpRequestItem, User]),
  ],
  controllers: [AboutController],
  providers: [AboutService],
})
export class AboutModule {}

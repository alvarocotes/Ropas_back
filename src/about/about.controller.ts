import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '../common/enums.js';
import { AboutService } from './about.service.js';
import {
  CreateSectionDto,
  UpdateLocationDto,
  UpdateSectionDto,
} from './dto/about.dto.js';

@Controller('about')
export class AboutController {
  constructor(private readonly aboutService: AboutService) {}

  @Public()
  @Get('sections')
  findPublicSections() {
    return this.aboutService.findPublicSections();
  }

  @Public()
  @Get('impact')
  findImpact() {
    return this.aboutService.findImpact();
  }

  @Roles(UserRole.ADMIN)
  @Get('sections/admin')
  findAllSections() {
    return this.aboutService.findAllSections();
  }

  @Roles(UserRole.ADMIN)
  @Post('sections')
  createSection(@Body() dto: CreateSectionDto) {
    return this.aboutService.createSection(dto);
  }

  @Roles(UserRole.ADMIN)
  @Patch('sections/:id')
  updateSection(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSectionDto) {
    return this.aboutService.updateSection(id, dto);
  }

  @Roles(UserRole.ADMIN)
  @Get('locations')
  findLocations() {
    return this.aboutService.findLocations();
  }

  @Roles(UserRole.ADMIN)
  @Patch('locations/:id')
  updateLocation(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateLocationDto) {
    return this.aboutService.updateLocation(id, dto);
  }

}

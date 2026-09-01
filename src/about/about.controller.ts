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
import { Modules } from '../common/decorators/modules.decorator.js';
import { AppModule } from '../common/enums.js';
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

  @Modules(AppModule.CONTENT)
  @Get('sections/admin')
  findAllSections() {
    return this.aboutService.findAllSections();
  }

  @Modules(AppModule.CONTENT)
  @Post('sections')
  createSection(@Body() dto: CreateSectionDto) {
    return this.aboutService.createSection(dto);
  }

  @Modules(AppModule.CONTENT)
  @Patch('sections/:id')
  updateSection(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSectionDto) {
    return this.aboutService.updateSection(id, dto);
  }

  @Modules(AppModule.CONTENT)
  @Get('locations')
  findLocations() {
    return this.aboutService.findLocations();
  }

  @Modules(AppModule.CONTENT)
  @Patch('locations/:id')
  updateLocation(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateLocationDto) {
    return this.aboutService.updateLocation(id, dto);
  }

}

import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator.js';
import { Modules } from '../common/decorators/modules.decorator.js';
import { AppModule } from '../common/enums.js';
import { CreateNeedDto } from './dto/create-need.dto.js';
import { UpdateNeedDto } from './dto/update-need.dto.js';
import { NeedsService } from './needs.service.js';

@Modules(AppModule.NEEDS)
@Controller('needs')
export class NeedsController {
  constructor(private readonly needsService: NeedsService) {}

  @Public()
  @Get()
  findPublic() {
    return this.needsService.findPublic();
  }

  @Get('admin')
  findAll() {
    return this.needsService.findAll();
  }

  @Post()
  create(@Body() dto: CreateNeedDto) {
    return this.needsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateNeedDto) {
    return this.needsService.update(id, dto);
  }
}

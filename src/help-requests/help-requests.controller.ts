import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';
import { Modules } from '../common/decorators/modules.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { AppModule, UserRole } from '../common/enums.js';
import type { SafeUser } from '../users/users.service.js';
import { AddRequestItemDto } from './dto/add-request-item.dto.js';
import { CreateHelpRequestDto } from './dto/create-help-request.dto.js';
import { UpdateHelpRequestDto } from './dto/update-help-request.dto.js';
import { UpdateRequestItemDto } from './dto/update-request-item.dto.js';
import { HelpRequestsService } from './help-requests.service.js';

@Modules(AppModule.REQUESTS)
@Controller('help-requests')
export class HelpRequestsController {
  constructor(private readonly helpRequestsService: HelpRequestsService) {}

  @Public()
  @Post()
  create(@Body() dto: CreateHelpRequestDto) {
    return this.helpRequestsService.create(dto);
  }

  @Get()
  findAll() {
    return this.helpRequestsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.helpRequestsService.findOne(id);
  }

  @Roles(UserRole.ADMIN, UserRole.VOLUNTEER)
  @Post(':id/claim')
  claim(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: SafeUser) {
    return this.helpRequestsService.claim(id, user);
  }

  @Roles(UserRole.ADMIN, UserRole.VOLUNTEER)
  @Post(':id/release')
  release(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: SafeUser) {
    return this.helpRequestsService.release(id, user);
  }

  @Roles(UserRole.ADMIN, UserRole.RECEPTION)
  @Post(':id/claim-reception')
  claimReception(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: SafeUser) {
    return this.helpRequestsService.claimReception(id, user);
  }

  @Roles(UserRole.ADMIN, UserRole.VOLUNTEER)
  @Post(':id/items')
  addItem(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddRequestItemDto,
    @CurrentUser() user: SafeUser,
  ) {
    return this.helpRequestsService.addItem(id, dto, user);
  }

  @Roles(UserRole.ADMIN, UserRole.VOLUNTEER)
  @Patch(':id/items/:itemId')
  updateItem(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: UpdateRequestItemDto,
    @CurrentUser() user: SafeUser,
  ) {
    return this.helpRequestsService.updateItem(id, itemId, dto.quantity, user);
  }

  @Roles(UserRole.ADMIN, UserRole.VOLUNTEER)
  @Delete(':id/items/:itemId')
  removeItem(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @CurrentUser() user: SafeUser,
  ) {
    return this.helpRequestsService.removeItem(id, itemId, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateHelpRequestDto,
    @CurrentUser() user: SafeUser,
  ) {
    return this.helpRequestsService.update(id, dto, user);
  }
}

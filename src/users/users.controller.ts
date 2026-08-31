import { Controller, Get, Post, Patch, Param, Body, ParseIntPipe } from '@nestjs/common';
import { UserRole } from '../common/enums.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UsersService, type SafeUser } from './users.service.js';

@Roles(UserRole.ADMIN)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: SafeUser,
  ) {
    return this.usersService.update(id, dto, actor.id);
  }

  @Patch(':id/deactivate')
  deactivate(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: SafeUser) {
    return this.usersService.remove(id, actor.id);
  }
}

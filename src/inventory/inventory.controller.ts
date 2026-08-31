import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '../common/enums.js';
import type { SafeUser } from '../users/users.service.js';
import { CreateMovementDto } from './dto/create-movement.dto.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { InventoryService } from './inventory.service.js';

@Roles(UserRole.ADMIN, UserRole.VOLUNTEER)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('products')
  findAll() {
    return this.inventoryService.findAll();
  }

  @Get('alerts')
  findAlerts() {
    return this.inventoryService.findAlerts();
  }

  @Get('movements')
  findMovements(@Query('productId') productId?: string) {
    return this.inventoryService.findMovements(
      productId ? Number(productId) : undefined,
    );
  }

  @Post('products')
  createProduct(@Body() dto: CreateProductDto) {
    return this.inventoryService.createProduct(dto);
  }

  @Patch('products/:id')
  updateProduct(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: SafeUser,
  ) {
    return this.inventoryService.updateProduct(id, dto, user.role);
  }

  @Roles(UserRole.ADMIN)
  @Delete('products/:id')
  removeProduct(@Param('id', ParseIntPipe) id: number) {
    return this.inventoryService.removeProduct(id);
  }

  @Post('movements')
  registerMovement(@Body() dto: CreateMovementDto, @CurrentUser() user: SafeUser) {
    return this.inventoryService.registerMovement(dto, user.id);
  }
}

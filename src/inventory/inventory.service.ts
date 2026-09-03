import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { MovementType, UserRole } from '../common/enums.js';
import {
  CLOTHING_AUDIENCES,
  audiencesForName,
  extractSizes,
  looksLikeClothing,
  normalizeSize,
  requestDisplayLabel,
  sortSizes,
  type ClothingAudience,
} from './clothing-sizes.js';
import { CreateMovementDto } from './dto/create-movement.dto.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { InventoryMovement } from './inventory-movement.entity.js';
import { Product } from './product.entity.js';

@Injectable()
export class InventoryService implements OnModuleInit {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(InventoryMovement)
    private readonly movementsRepository: Repository<InventoryMovement>,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureClothingColumns();
  }

  private async ensureClothingColumns(): Promise<void> {
    const dbType = this.configService.get<string>('DB_TYPE', 'sqlite');
    try {
      if (dbType === 'mysql') {
        await this.productsRepository.query(
          'ALTER TABLE products ADD COLUMN audience VARCHAR(16) NULL',
        );
      } else {
        await this.productsRepository.query('ALTER TABLE products ADD COLUMN audience VARCHAR(16)');
      }
    } catch {
      /* ya existe */
    }
    try {
      if (dbType === 'mysql') {
        await this.productsRepository.query(
          'ALTER TABLE products ADD COLUMN size_label VARCHAR(40) NULL',
        );
      } else {
        await this.productsRepository.query(
          'ALTER TABLE products ADD COLUMN size_label VARCHAR(40)',
        );
      }
    } catch {
      /* ya existe */
    }
    try {
      if (dbType === 'mysql') {
        await this.productsRepository.query(
          'ALTER TABLE products ADD COLUMN garment VARCHAR(16) NULL',
        );
      } else {
        await this.productsRepository.query('ALTER TABLE products ADD COLUMN garment VARCHAR(16)');
      }
    } catch {
      /* ya existe */
    }
    try {
      if (dbType === 'mysql') {
        await this.productsRepository.query(
          'ALTER TABLE products ADD COLUMN request_label VARCHAR(80) NULL',
        );
      } else {
        await this.productsRepository.query(
          'ALTER TABLE products ADD COLUMN request_label VARCHAR(80)',
        );
      }
    } catch {
      /* ya existe */
    }
  }

  findAll() {
    return this.productsRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  async findClothingSizes(): Promise<
    Record<ClothingAudience, { label: string; sizes: string[] }[]>
  > {
    await this.ensureClothingColumns();
    const products = await this.productsRepository.find({ where: { isActive: true } });
    const buckets: Record<ClothingAudience, Map<string, Set<string>>> = {
      woman: new Map(),
      man: new Map(),
      girl: new Map(),
      boy: new Map(),
      baby: new Map(),
    };
    const add = (audience: ClothingAudience, label: string, size: string) => {
      const map = buckets[audience];
      const set = map.get(label) ?? new Set<string>();
      set.add(size);
      map.set(label, set);
    };
    for (const product of products) {
      const groups = CLOTHING_AUDIENCES.includes(product.audience as ClothingAudience)
        ? [product.audience as ClothingAudience]
        : audiencesForName(product.name);
      if (groups.length === 0) continue;
      if (!product.audience && !looksLikeClothing(product.name)) continue;

      const sizes = new Set<string>();
      if (product.sizeLabel?.trim()) {
        sizes.add(normalizeSize(product.sizeLabel));
      }
      for (const size of extractSizes(product.name)) {
        sizes.add(size);
      }
      if (sizes.size === 0) continue;
      for (const group of groups) {
        const label = requestDisplayLabel(
          group,
          product.name,
          product.garment,
          product.requestLabel,
        );
        for (const size of sizes) add(group, label, size);
      }
    }
    const pack = (map: Map<string, Set<string>>) =>
      [...map.entries()]
        .sort((a, b) => a[0].localeCompare(b[0], 'es'))
        .map(([label, sizes]) => ({ label, sizes: sortSizes([...sizes]) }));
    return {
      woman: pack(buckets.woman),
      man: pack(buckets.man),
      girl: pack(buckets.girl),
      boy: pack(buckets.boy),
      baby: pack(buckets.baby),
    };
  }

  findAlerts() {
    return this.productsRepository
      .createQueryBuilder('product')
      .where('product.isActive = :active', { active: true })
      .andWhere('product.quantity < product.minQuantity')
      .orderBy('product.quantity', 'ASC')
      .getMany();
  }

  async findOne(id: number) {
    const product = await this.productsRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }
    return product;
  }

  createProduct(dto: CreateProductDto) {
    const product = this.productsRepository.create({
      name: dto.name,
      unit: dto.unit ?? 'unidad',
      quantity: dto.quantity ?? 0,
      minQuantity: dto.minQuantity ?? 0,
      isActive: true,
      publishWhenLow: dto.publishWhenLow ?? false,
      publicNote: dto.publicNote ?? null,
      audience: dto.audience ?? null,
      sizeLabel: dto.sizeLabel?.trim() ? normalizeSize(dto.sizeLabel) : null,
      requestLabel: dto.requestLabel?.trim() ? dto.requestLabel.trim() : null,
    });
    return this.productsRepository.save(product);
  }

  async updateProduct(id: number, dto: UpdateProductDto, actorRole: UserRole) {
    const product = await this.findOne(id);
    const catalogChange =
      dto.name !== undefined || dto.unit !== undefined || dto.isActive !== undefined;
    if (catalogChange && actorRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Solo el administrador edita o elimina productos');
    }
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (name.length < 2) {
        throw new BadRequestException('El nombre del producto debe tener al menos 2 caracteres');
      }
      product.name = name;
    }
    if (dto.unit !== undefined) product.unit = dto.unit.trim() || 'unidad';
    if (dto.minQuantity !== undefined) product.minQuantity = dto.minQuantity;
    if (dto.isActive !== undefined) product.isActive = dto.isActive;
    if (dto.publishWhenLow !== undefined) product.publishWhenLow = dto.publishWhenLow;
    if (dto.publicNote !== undefined) product.publicNote = dto.publicNote || null;
    if (dto.audience !== undefined) product.audience = dto.audience;
    if (dto.sizeLabel !== undefined) {
      product.sizeLabel = dto.sizeLabel?.trim() ? normalizeSize(dto.sizeLabel) : null;
    }
    if (dto.requestLabel !== undefined) {
      product.requestLabel = dto.requestLabel?.trim() ? dto.requestLabel.trim() : null;
    }
    return this.productsRepository.save(product);
  }

  async removeProduct(id: number) {
    const product = await this.findOne(id);
    product.isActive = false;
    product.publishWhenLow = false;
    await this.productsRepository.save(product);
  }

  async findMovements(productId?: number) {
    const movements = await this.movementsRepository.find({
      where: productId ? { productId } : undefined,
      relations: { product: true, user: true },
      order: { createdAt: 'DESC' },
      take: 100,
    });
    return movements.map((movement) => ({
      ...movement,
      user: movement.user
        ? { id: movement.user.id, fullName: movement.user.fullName }
        : null,
    }));
  }

  registerMovement(dto: CreateMovementDto, userId: number, notePrefix?: string) {
    return this.applyStockChange({
      productId: dto.productId,
      type: dto.type,
      quantity: dto.quantity,
      userId,
      note: notePrefix ? `${notePrefix}${dto.note ? ` — ${dto.note}` : ''}` : (dto.note ?? null),
    });
  }

  applyStockChange(params: {
    productId: number;
    type: MovementType;
    quantity: number;
    userId: number;
    note: string | null;
  }) {
    return this.dataSource.transaction(async (manager) => {
      const product = await manager.findOne(Product, {
        where: { id: params.productId },
        ...(this.dataSource.options.type === 'mysql'
          ? { lock: { mode: 'pessimistic_write' as const } }
          : {}),
      });
      if (!product || !product.isActive) {
        throw new NotFoundException('Producto no encontrado o inactivo');
      }
      if (params.type === MovementType.SALIDA && product.quantity < params.quantity) {
        throw new BadRequestException(
          `Stock insuficiente de ${product.name}. Disponible: ${product.quantity} ${product.unit}.`,
        );
      }
      product.quantity +=
        params.type === MovementType.ENTRADA ? params.quantity : -params.quantity;
      await manager.save(product);
      const movement = manager.create(InventoryMovement, {
        productId: product.id,
        type: params.type,
        quantity: params.quantity,
        note: params.note,
        userId: params.userId,
      });
      return manager.save(movement);
    });
  }
}

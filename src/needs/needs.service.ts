import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../inventory/product.entity.js';
import { CreateNeedDto } from './dto/create-need.dto.js';
import { UpdateNeedDto } from './dto/update-need.dto.js';
import { PublicNeed } from './public-need.entity.js';

@Injectable()
export class NeedsService {
  constructor(
    @InjectRepository(PublicNeed)
    private readonly needsRepository: Repository<PublicNeed>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
  ) {}

  /**
   * Combina las necesidades creadas a mano con los productos de inventario que
   * están por debajo del mínimo y tienen la publicación automática activada.
   */
  async findPublic() {
    const [manual, lowStock] = await Promise.all([
      this.needsRepository.find({
        where: { isVisible: true },
        order: { createdAt: 'DESC' },
      }),
      this.findAutoPublishable(),
    ]);

    const fromInventory = lowStock.map((product) => ({
      id: -product.id,
      productId: product.id,
      product,
      title: product.name,
      quantityNeeded: Math.max(product.minQuantity - product.quantity, 1),
      message:
        product.publicNote ??
        `Quedan ${product.quantity} ${product.unit} y el mínimo es ${product.minQuantity}.`,
      isVisible: true,
      source: 'inventario' as const,
    }));

    // Si ya existe una necesidad manual para el producto, esa tiene prioridad.
    const manualProductIds = new Set(
      manual.map((need) => need.productId).filter((id): id is number => id !== null),
    );

    return [
      ...manual.map((need) => ({ ...need, source: 'manual' as const })),
      ...fromInventory.filter((need) => !manualProductIds.has(need.productId)),
    ];
  }

  private findAutoPublishable() {
    return this.productsRepository
      .createQueryBuilder('product')
      .where('product.isActive = :active', { active: true })
      .andWhere('product.publishWhenLow = :publish', { publish: true })
      .andWhere('product.quantity < product.minQuantity')
      .orderBy('product.quantity', 'ASC')
      .getMany();
  }

  findAll() {
    return this.needsRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: number) {
    const need = await this.needsRepository.findOne({ where: { id } });
    if (!need) {
      throw new NotFoundException('Necesidad no encontrada');
    }
    return need;
  }

  create(dto: CreateNeedDto) {
    const need = this.needsRepository.create({
      productId: dto.productId ?? null,
      title: dto.title,
      quantityNeeded: dto.quantityNeeded ?? 1,
      message: dto.message ?? null,
      isVisible: dto.isVisible ?? true,
    });
    return this.needsRepository.save(need);
  }

  async update(id: number, dto: UpdateNeedDto) {
    const need = await this.findOne(id);
    if (dto.productId !== undefined) need.productId = dto.productId;
    if (dto.title !== undefined) need.title = dto.title;
    if (dto.quantityNeeded !== undefined) need.quantityNeeded = dto.quantityNeeded;
    if (dto.message !== undefined) need.message = dto.message;
    if (dto.isVisible !== undefined) need.isVisible = dto.isVisible;
    return this.needsRepository.save(need);
  }
}

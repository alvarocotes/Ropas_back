import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DonationStatus, MovementType } from '../common/enums.js';
import { InventoryService } from '../inventory/inventory.service.js';
import { CreateDonationDto } from './dto/create-donation.dto.js';
import { UpdateDonationDto } from './dto/update-donation.dto.js';
import { DonationItem } from './donation-item.entity.js';
import { Donation } from './donation.entity.js';

@Injectable()
export class DonationsService {
  constructor(
    @InjectRepository(Donation)
    private readonly donationsRepository: Repository<Donation>,
    @InjectRepository(DonationItem)
    private readonly itemsRepository: Repository<DonationItem>,
    private readonly inventoryService: InventoryService,
  ) {}

  findAll() {
    return this.donationsRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: number) {
    const donation = await this.donationsRepository.findOne({ where: { id } });
    if (!donation) {
      throw new NotFoundException('Donación no encontrada');
    }
    return donation;
  }

  create(dto: CreateDonationDto) {
    const donation = this.donationsRepository.create({
      donorName: dto.donorName ?? null,
      contact: dto.contact ?? null,
      notes: dto.notes ?? null,
      status: DonationStatus.RECIBIDO,
      items: dto.items.map((item) =>
        this.itemsRepository.create({
          productId: item.productId ?? null,
          productName: item.productName,
          quantity: item.quantity,
          unit: item.unit ?? 'unidad',
        }),
      ),
    });
    return this.donationsRepository.save(donation);
  }

  async update(id: number, dto: UpdateDonationDto, userId: number) {
    const donation = await this.findOne(id);
    if (donation.status === DonationStatus.INGRESADO) {
      throw new BadRequestException(
        'Esta donación ya ingresó al inventario y no se puede modificar',
      );
    }
    if (donation.status === DonationStatus.CANCELADO) {
      throw new BadRequestException('Esta donación está cancelada');
    }

    if (dto.items) {
      for (const itemUpdate of dto.items) {
        const item = donation.items.find((entry) => entry.id === itemUpdate.id);
        if (!item) {
          throw new NotFoundException(`Ítem ${itemUpdate.id} no encontrado`);
        }
        if (itemUpdate.productId !== undefined) {
          item.productId = itemUpdate.productId;
        }
      }
      await this.itemsRepository.save(donation.items);
    }

    if (dto.notes !== undefined) {
      donation.notes = dto.notes;
    }

    if (dto.status && dto.status !== donation.status) {
      if (dto.status === DonationStatus.INGRESADO) {
        const pending = donation.items.filter((item) => !item.productId);
        if (pending.length > 0) {
          throw new BadRequestException(
            'Asocia cada ítem a un producto del inventario antes de ingresar la donación',
          );
        }
        for (const item of donation.items) {
          await this.inventoryService.applyStockChange({
            productId: item.productId as number,
            type: MovementType.ENTRADA,
            quantity: item.quantity,
            userId,
            note: `Donación #${donation.id} — ${item.productName}`,
          });
        }
      }
      donation.status = dto.status;
    }

    return this.donationsRepository.save(donation);
  }
}

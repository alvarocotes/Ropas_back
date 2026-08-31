import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MovementType, RequestStatus, UserRole } from '../common/enums.js';
import { InventoryService } from '../inventory/inventory.service.js';
import type { SafeUser } from '../users/users.service.js';
import { AddRequestItemDto } from './dto/add-request-item.dto.js';
import { CreateHelpRequestDto } from './dto/create-help-request.dto.js';
import { UpdateHelpRequestDto } from './dto/update-help-request.dto.js';
import { HelpRequestItem } from './help-request-item.entity.js';
import { HelpRequest } from './help-request.entity.js';

/** Estados que puede fijar cada rol al actualizar una solicitud. */
const ALLOWED_STATUSES: Record<UserRole, RequestStatus[]> = {
  [UserRole.ADMIN]: [
    RequestStatus.RECIBIDO,
    RequestStatus.EN_PROCESO,
    RequestStatus.LISTO,
    RequestStatus.ENTREGADO,
    RequestStatus.CANCELADO,
  ],
  [UserRole.VOLUNTEER]: [
    RequestStatus.EN_PROCESO,
    RequestStatus.LISTO,
    RequestStatus.CANCELADO,
  ],
  [UserRole.RECEPTION]: [RequestStatus.ENTREGADO, RequestStatus.CANCELADO],
};

@Injectable()
export class HelpRequestsService implements OnModuleInit {
  constructor(
    @InjectRepository(HelpRequest)
    private readonly requestsRepository: Repository<HelpRequest>,
    @InjectRepository(HelpRequestItem)
    private readonly itemsRepository: Repository<HelpRequestItem>,
    private readonly inventoryService: InventoryService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureHelpRequestColumns();
  }

  /**
   * Columnas añadidas después del primer deploy. Con DB_SYNC=false (producción)
   * TypeORM no las crea y GET /help-requests cae con "Unknown column".
   */
  private async ensureHelpRequestColumns(): Promise<void> {
    const dbType = this.configService.get<string>('DB_TYPE', 'sqlite');
    const columns =
      dbType === 'mysql'
        ? [
            { name: 'diaper_stage', sql: 'VARCHAR(200) NULL' },
            { name: 'women_count', sql: 'INT NOT NULL DEFAULT 0' },
            { name: 'men_count', sql: 'INT NOT NULL DEFAULT 0' },
            { name: 'girls_count', sql: 'INT NOT NULL DEFAULT 0' },
            { name: 'boys_count', sql: 'INT NOT NULL DEFAULT 0' },
            { name: 'babies_count', sql: 'INT NOT NULL DEFAULT 0' },
          ]
        : [
            { name: 'diaper_stage', sql: 'VARCHAR(200)' },
            { name: 'women_count', sql: 'INTEGER NOT NULL DEFAULT 0' },
            { name: 'men_count', sql: 'INTEGER NOT NULL DEFAULT 0' },
            { name: 'girls_count', sql: 'INTEGER NOT NULL DEFAULT 0' },
            { name: 'boys_count', sql: 'INTEGER NOT NULL DEFAULT 0' },
            { name: 'babies_count', sql: 'INTEGER NOT NULL DEFAULT 0' },
          ];
    try {
      const existing = new Set<string>();
      if (dbType === 'mysql') {
        const rows: Array<{ Field?: string }> = await this.requestsRepository.query(
          'SHOW COLUMNS FROM help_requests',
        );
        for (const row of rows) {
          if (row.Field) existing.add(row.Field);
        }
      } else {
        const rows: Array<{ name: string }> = await this.requestsRepository.query(
          'PRAGMA table_info(help_requests)',
        );
        for (const row of rows) existing.add(row.name);
      }
      for (const column of columns) {
        if (existing.has(column.name)) continue;
        await this.requestsRepository.query(
          `ALTER TABLE help_requests ADD COLUMN ${column.name} ${column.sql}`,
        );
      }
    } catch (err) {
      console.error('No se pudieron asegurar columnas de help_requests:', err);
    }
  }

  private readonly relations = {
    assignedTo: true,
    receptionUser: true,
    items: { product: true },
  };

  private toPublicShape(request: HelpRequest) {
    return {
      ...request,
      assignedTo: request.assignedTo
        ? { id: request.assignedTo.id, fullName: request.assignedTo.fullName }
        : null,
      receptionUser: request.receptionUser
        ? { id: request.receptionUser.id, fullName: request.receptionUser.fullName }
        : null,
    };
  }

  async findAll() {
    try {
      const requests = await this.requestsRepository.find({
        relations: this.relations,
        order: { createdAt: 'DESC' },
      });
      return requests.map((request) => this.toPublicShape(request));
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (message.includes('Unknown column') || message.includes('no such column')) {
        await this.ensureHelpRequestColumns();
        const requests = await this.requestsRepository.find({
          relations: this.relations,
          order: { createdAt: 'DESC' },
        });
        return requests.map((request) => this.toPublicShape(request));
      }
      throw err;
    }
  }

  async findOne(id: number) {
    const request = await this.requestsRepository.findOne({
      where: { id },
      relations: this.relations,
    });
    if (!request) {
      throw new NotFoundException('Solicitud no encontrada');
    }
    return request;
  }

  create(dto: CreateHelpRequestDto) {
    const household = this.householdFromDto(dto);
    const request = this.requestsRepository.create({
      fullName: dto.fullName,
      identificationNumber: dto.identificationNumber ?? '',
      residenceBefore: dto.residenceBefore,
      residenceAfter: dto.residenceAfter,
      phoneWhatsapp: dto.phoneWhatsapp,
      affectationType: dto.affectationType,
      clothingScope: dto.clothingScope,
      peopleCount: household.peopleCount,
      womenCount: household.womenCount,
      menCount: household.menCount,
      girlsCount: household.girlsCount,
      boysCount: household.boysCount,
      babiesCount: household.babiesCount,
      hasOwnTransport: dto.hasOwnTransport,
      babySizes: dto.babySizes ?? null,
      girlShirtSizes: dto.girlShirtSizes ?? null,
      girlPantsSizes: dto.girlPantsSizes ?? null,
      womanShirtSizes: dto.womanShirtSizes ?? null,
      womanPantsSizes: dto.womanPantsSizes ?? null,
      boyShirtSizes: dto.boyShirtSizes ?? null,
      boyPantsSizes: dto.boyPantsSizes ?? null,
      manShirtSizes: dto.manShirtSizes ?? null,
      manPantsSizes: dto.manPantsSizes ?? null,
      underwearNeeds: dto.underwearNeeds ?? null,
      needsLinens: dto.needsLinens,
      needsDiapers: dto.needsDiapers,
      diaperStage: dto.needsDiapers ? (dto.diaperStage ?? null) : null,
      needsSanitary: dto.needsSanitary,
      additionalNeeds: dto.additionalNeeds ?? null,
      status: RequestStatus.RECIBIDO,
    });
    return this.requestsRepository.save(request);
  }

  /** Un voluntario toma la solicitud para alistar lo que se va a entregar. */
  async claim(id: number, user: SafeUser) {
    const request = await this.findOne(id);
    if (user.role === UserRole.RECEPTION) {
      throw new ForbiddenException('Recepción no alista solicitudes, solo gestiona el transporte');
    }
    if (this.isClosed(request)) {
      throw new BadRequestException('Esta solicitud ya está cerrada');
    }
    if (request.assignedToId && request.assignedToId !== user.id) {
      throw new BadRequestException(
        `Esta solicitud ya la tomó ${request.assignedTo?.fullName ?? 'otro voluntario'}`,
      );
    }
    request.assignedToId = user.id;
    if (request.status === RequestStatus.RECIBIDO) {
      request.status = RequestStatus.EN_PROCESO;
    }
    await this.requestsRepository.save(request);
    return this.toPublicShape(await this.findOne(id));
  }

  /** El voluntario libera la solicitud para que otro la tome. */
  async release(id: number, user: SafeUser) {
    const request = await this.findOne(id);
    if (this.isClosed(request)) {
      throw new BadRequestException('Esta solicitud ya está cerrada');
    }
    if (user.role !== UserRole.ADMIN && request.assignedToId !== user.id) {
      throw new ForbiddenException('Solo quien tomó la solicitud puede liberarla');
    }
    request.assignedToId = null;
    if (request.status === RequestStatus.EN_PROCESO) {
      request.status = RequestStatus.RECIBIDO;
    }
    await this.requestsRepository.save(request);
    return this.toPublicShape(await this.findOne(id));
  }

  /** Recepción toma una solicitud ya alistada para gestionar el transporte. */
  async claimReception(id: number, user: SafeUser) {
    const request = await this.findOne(id);
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.RECEPTION) {
      throw new ForbiddenException('Solo recepción gestiona el transporte');
    }
    if (this.isClosed(request)) {
      throw new BadRequestException('Esta solicitud ya está cerrada');
    }
    if (request.status !== RequestStatus.LISTO) {
      throw new BadRequestException(
        'La solicitud debe estar en estado listo para pasar a recepción',
      );
    }
    if (request.receptionUserId && request.receptionUserId !== user.id) {
      throw new BadRequestException(
        `Esta entrega ya la gestiona ${request.receptionUser?.fullName ?? 'otra persona'}`,
      );
    }
    request.receptionUserId = user.id;
    await this.requestsRepository.save(request);
    return this.toPublicShape(await this.findOne(id));
  }

  /** Agrega un producto del inventario al paquete que se va a entregar. */
  async addItem(id: number, dto: AddRequestItemDto, user: SafeUser) {
    const request = await this.findOne(id);
    this.assertCanPrepare(request, user);

    const product = await this.inventoryService.findOne(dto.productId);
    if (!product.isActive) {
      throw new BadRequestException('Ese producto está inactivo');
    }

    const existing = request.items?.find((item) => item.productId === product.id);
    if (existing) {
      existing.quantity += dto.quantity;
      existing.productName = product.name;
      existing.unit = product.unit;
      await this.itemsRepository.save(existing);
    } else {
      await this.itemsRepository.save(
        this.itemsRepository.create({
          helpRequestId: request.id,
          productId: product.id,
          productName: product.name,
          quantity: dto.quantity,
          unit: product.unit,
        }),
      );
    }

    return this.toPublicShape(await this.findOne(id));
  }

  /** Cambia la cantidad exacta de un producto ya agregado al paquete. */
  async updateItem(id: number, itemId: number, quantity: number, user: SafeUser) {
    const request = await this.findOne(id);
    this.assertCanPrepare(request, user);
    const item = request.items?.find((entry) => entry.id === itemId);
    if (!item) {
      throw new NotFoundException('El producto no está en el paquete');
    }
    if (quantity < 1) {
      throw new BadRequestException('La cantidad debe ser mayor que cero');
    }
    item.quantity = quantity;
    await this.itemsRepository.save(item);
    return this.toPublicShape(await this.findOne(id));
  }

  async removeItem(id: number, itemId: number, user: SafeUser) {
    const request = await this.findOne(id);
    this.assertCanPrepare(request, user);
    const item = request.items?.find((entry) => entry.id === itemId);
    if (!item) {
      throw new NotFoundException('El producto no está en el paquete');
    }
    await this.itemsRepository.remove(item);
    return this.toPublicShape(await this.findOne(id));
  }

  /** Solo el voluntario asignado (o el admin) arma el paquete, y antes de entregarlo. */
  private assertCanPrepare(request: HelpRequest, user: SafeUser) {
    if (this.isClosed(request)) {
      throw new BadRequestException('Esta solicitud ya está cerrada');
    }
    if (user.role === UserRole.ADMIN) {
      return;
    }
    if (user.role === UserRole.RECEPTION) {
      throw new ForbiddenException('Recepción no modifica el contenido del paquete');
    }
    if (request.assignedToId !== user.id) {
      throw new ForbiddenException('Primero toma esta solicitud para armar el paquete');
    }
  }

  async update(id: number, dto: UpdateHelpRequestDto, user: SafeUser) {
    const request = await this.findOne(id);
    if (request.status === RequestStatus.ENTREGADO) {
      throw new BadRequestException('Esta solicitud ya fue entregada');
    }
    if (request.status === RequestStatus.CANCELADO) {
      throw new BadRequestException('Esta solicitud está cancelada');
    }

    const isAdmin = user.role === UserRole.ADMIN;
    const isReception = user.role === UserRole.RECEPTION;

    if (!isAdmin) {
      if (isReception) {
        if (request.status !== RequestStatus.LISTO) {
          throw new ForbiddenException('Recepción solo gestiona solicitudes listas');
        }
        if (request.receptionUserId !== user.id) {
          throw new ForbiddenException('Primero toma esta entrega en recepción');
        }
      } else if (request.assignedToId !== user.id) {
        throw new ForbiddenException('Primero toma esta solicitud para gestionarla');
      }
    }

    if (dto.internalNotes !== undefined && !isReception) {
      request.internalNotes = dto.internalNotes;
    }
    if (dto.transportNotes !== undefined && (isAdmin || isReception)) {
      request.transportNotes = dto.transportNotes;
    }

    if (dto.status && dto.status !== request.status) {
      if (!ALLOWED_STATUSES[user.role].includes(dto.status)) {
        throw new ForbiddenException(`Tu rol no puede marcar la solicitud como ${dto.status}`);
      }
      // No se puede pasar a recepción sin decir qué se va a entregar.
      if (
        (dto.status === RequestStatus.LISTO || dto.status === RequestStatus.ENTREGADO) &&
        !request.items?.length
      ) {
        throw new BadRequestException(
          'Agrega al menos un producto al paquete antes de marcar la solicitud como lista',
        );
      }
      // Al entregar se descuenta del inventario el paquete que armó el voluntario.
      if (dto.status === RequestStatus.ENTREGADO) {
        for (const item of request.items ?? []) {
          if (!item.productId) continue;
          await this.inventoryService.applyStockChange({
            productId: item.productId,
            type: MovementType.SALIDA,
            quantity: item.quantity,
            userId: user.id,
            note: `Entrega solicitud #${request.id}`,
          });
        }
      }
      if (dto.status === RequestStatus.LISTO) {
        request.readyAt = new Date();
      }
      if (dto.status === RequestStatus.ENTREGADO) {
        request.deliveredAt = new Date();
      }
      request.status = dto.status;
    }

    await this.requestsRepository.save(request);
    return this.toPublicShape(await this.findOne(id));
  }

  private householdFromDto(dto: CreateHelpRequestDto) {
    const womenCount = dto.womenCount ?? 0;
    const menCount = dto.menCount ?? 0;
    const girlsCount = dto.girlsCount ?? 0;
    const boysCount = dto.boysCount ?? 0;
    const babiesCount = dto.babiesCount ?? 0;
    const breakdown = womenCount + menCount + girlsCount + boysCount + babiesCount;
    const peopleCount = breakdown > 0 ? breakdown : (dto.peopleCount ?? 0);
    if (peopleCount < 1) {
      throw new BadRequestException(
        'Indica cuántas mujeres, hombres, niñas, niños y bebés necesitan ropa',
      );
    }
    return { peopleCount, womenCount, menCount, girlsCount, boysCount, babiesCount };
  }

  private isClosed(request: HelpRequest) {
    return (
      request.status === RequestStatus.ENTREGADO ||
      request.status === RequestStatus.CANCELADO
    );
  }
}

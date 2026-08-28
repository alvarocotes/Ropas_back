import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RequestStatus, UserRole } from '../common/enums.js';
import { HelpRequestItem } from '../help-requests/help-request-item.entity.js';
import { HelpRequest } from '../help-requests/help-request.entity.js';
import { User } from '../users/user.entity.js';
import { AboutSection } from './about-section.entity.js';
import {
  CreateSectionDto,
  UpdateLocationDto,
  UpdateSectionDto,
} from './dto/about.dto.js';

const DEFAULT_SECTIONS: Array<Pick<AboutSection, 'sectionKey' | 'title' | 'body' | 'position'>> = [
  {
    sectionKey: 'historia',
    title: 'Nuestra historia',
    position: 1,
    body: 'Cuenta aquí cómo nació ABRIGAR: quiénes dieron el primer paso, en qué momento y qué necesidad vieron que nadie estaba atendiendo.',
  },
  {
    sectionKey: 'que-hacemos',
    title: 'Qué hacemos',
    position: 2,
    body: 'Describe el trabajo concreto: recibir donaciones, clasificarlas, armar paquetes de ropa y entregarlos a las familias afectadas por el sismo.',
  },
  {
    sectionKey: 'como-trabajamos',
    title: 'Cómo trabajamos',
    position: 3,
    body: 'Explica el proceso: cada solicitud se recibe por el formulario, un voluntario la toma y alista el paquete, y recepción coordina el transporte hasta la dirección de la familia.',
  },
  {
    sectionKey: 'proposito',
    title: 'Nuestro propósito',
    position: 4,
    body: 'Escribe aquí para qué existe ABRIGAR y qué quieren lograr: devolver dignidad y abrigo a quienes lo perdieron todo.',
  },
];

@Injectable()
export class AboutService implements OnModuleInit {
  constructor(
    @InjectRepository(AboutSection)
    private readonly sectionsRepository: Repository<AboutSection>,
    @InjectRepository(HelpRequest)
    private readonly requestsRepository: Repository<HelpRequest>,
    @InjectRepository(HelpRequestItem)
    private readonly itemsRepository: Repository<HelpRequestItem>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedSections();
  }

  /** Crea los bloques de texto la primera vez para que la página no quede vacía. */
  private async seedSections(): Promise<void> {
    for (const section of DEFAULT_SECTIONS) {
      const existing = await this.sectionsRepository.findOne({
        where: { sectionKey: section.sectionKey },
      });
      if (!existing) {
        await this.sectionsRepository.save(this.sectionsRepository.create(section));
      }
    }
  }

  findPublicSections() {
    return this.sectionsRepository.find({
      where: { isVisible: true },
      order: { position: 'ASC', id: 'ASC' },
    });
  }

  findAllSections() {
    return this.sectionsRepository.find({ order: { position: 'ASC', id: 'ASC' } });
  }

  createSection(dto: CreateSectionDto) {
    return this.sectionsRepository.save(
      this.sectionsRepository.create({
        sectionKey: dto.sectionKey,
        title: dto.title,
        body: dto.body,
        position: dto.position ?? 99,
        isVisible: dto.isVisible ?? true,
      }),
    );
  }

  async updateSection(id: number, dto: UpdateSectionDto) {
    const section = await this.sectionsRepository.findOne({ where: { id } });
    if (!section) {
      throw new NotFoundException('Sección no encontrada');
    }
    if (dto.title !== undefined) section.title = dto.title;
    if (dto.body !== undefined) section.body = dto.body;
    if (dto.position !== undefined) section.position = dto.position;
    if (dto.isVisible !== undefined) section.isVisible = dto.isVisible;
    return this.sectionsRepository.save(section);
  }

  /** Entregas con su ubicación, para revisarlas y corregirlas desde el panel. */
  async findLocations() {
    const delivered = await this.requestsRepository.find({
      where: { status: RequestStatus.ENTREGADO },
      order: { deliveredAt: 'DESC', id: 'DESC' },
      select: {
        id: true,
        residenceAfter: true,
        peopleCount: true,
        latitude: true,
        longitude: true,
        geoLabel: true,
        manualItemsDelivered: true,
      },
    });

    return delivered.map((request) => ({
      id: request.id,
      address: request.residenceAfter,
      peopleCount: request.peopleCount,
      latitude: request.latitude === null ? null : Number(request.latitude),
      longitude: request.longitude === null ? null : Number(request.longitude),
      geoLabel: request.geoLabel,
      manualItemsDelivered: request.manualItemsDelivered,
    }));
  }

  /** Fija a mano el punto y las prendas de una entrega histórica. */
  async updateLocation(id: number, dto: UpdateLocationDto) {
    const request = await this.requestsRepository.findOne({ where: { id } });
    if (!request) {
      throw new NotFoundException('Solicitud no encontrada');
    }
    if (dto.latitude !== undefined) {
      request.latitude = String(dto.latitude);
    }
    if (dto.longitude !== undefined) {
      request.longitude = String(dto.longitude);
    }
    if (dto.geoLabel !== undefined) {
      request.geoLabel = dto.geoLabel.trim() || request.geoLabel;
    }
    if (dto.manualItemsDelivered !== undefined) {
      request.manualItemsDelivered = dto.manualItemsDelivered;
    }
    if (dto.peopleCount !== undefined) {
      request.peopleCount = dto.peopleCount;
    }
    await this.requestsRepository.save(request);
    return {
      id: request.id,
      geoLabel: request.geoLabel,
      peopleCount: request.peopleCount,
      manualItemsDelivered: request.manualItemsDelivered,
    };
  }

  /** Cifras públicas de impacto, calculadas sobre las solicitudes entregadas. */
  async findImpact() {
    const delivered = await this.requestsRepository.find({
      where: { status: RequestStatus.ENTREGADO },
      select: {
        id: true,
        peopleCount: true,
        residenceAfter: true,
        deliveredAt: true,
        latitude: true,
        longitude: true,
        geoLabel: true,
      },
    });

    const peopleHelped = delivered.reduce((total, request) => total + (request.peopleCount ?? 0), 0);

    const itemsRow = await this.itemsRepository
      .createQueryBuilder('item')
      .innerJoin('item.helpRequest', 'request')
      .where('request.status = :status', { status: RequestStatus.ENTREGADO })
      .select('COALESCE(SUM(item.quantity), 0)', 'total')
      .getRawOne<{ total: string }>();

    const manualRow = await this.requestsRepository
      .createQueryBuilder('request')
      .where('request.status = :status', { status: RequestStatus.ENTREGADO })
      .select('COALESCE(SUM(request.manualItemsDelivered), 0)', 'total')
      .getRawOne<{ total: string }>();

    const activeVolunteers = await this.usersRepository.count({
      where: [
        { role: UserRole.VOLUNTEER, isActive: true },
        { role: UserRole.RECEPTION, isActive: true },
      ],
    });

    const points = this.buildPoints(delivered);

    return {
      peopleHelped,
      familiesHelped: delivered.length,
      itemsDelivered: Number(itemsRow?.total ?? 0) + Number(manualRow?.total ?? 0),
      activeVolunteers,
      zonesCovered: new Set(points.map((point) => point.label)).size,
      points,
    };
  }

  /**
   * Un punto por entrega geocodificada. Se redondean las coordenadas a tres decimales
   * (unos 100 m) y se publica solo el sector, para no señalar la casa de nadie.
   */
  private buildPoints(delivered: Array<Partial<HelpRequest>>) {
    return delivered
      .filter(hasCoords)
      .map((request) => ({
        id: request.id as number,
        label: request.geoLabel ?? 'Zona atendida',
        latitude: round(Number(request.latitude), 3),
        longitude: round(Number(request.longitude), 3),
        peopleHelped: request.peopleCount ?? 0,
      }))
      .sort((a, b) => b.peopleHelped - a.peopleHelped);
  }

}

function hasCoords(request: Partial<HelpRequest>): boolean {
  return (
    request.latitude !== null &&
    request.latitude !== undefined &&
    request.longitude !== null &&
    request.longitude !== undefined
  );
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** Minúsculas y sin acentos, para que "Bogotá" y "bogota" coincidan. */
function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

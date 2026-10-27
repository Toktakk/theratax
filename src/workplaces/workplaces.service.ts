import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { PublicUser } from '../auth/public-user.js';
import { hourExtrasResponse, readHourExtras } from '../hour-extras/hour-extra.js';
import type { HourExtraResponse, StoredHourExtra } from '../hour-extras/hour-extra.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateWorkplaceDto } from './dto/create-workplace.dto.js';
import type { ListWorkplacesQueryDto } from './dto/list-workplaces-query.dto.js';
import type { UpdateWorkplaceDto } from './dto/update-workplace.dto.js';

export interface WorkplaceResponse {
  id: number;
  name: string;
  kind: 'spa' | 'clinic';
  hourRatePence: number;
  hourExtras: HourExtraResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkplaceListResponse {
  items: WorkplaceResponse[];
  total: number;
  skip: number;
  limit: number;
}

interface HourExtraRow {
  massageType: string;
  customMassageType: string | null;
  extraPence: number;
}

interface WorkplaceRow {
  id: number;
  name: string;
  kind: 'spa' | 'clinic';
  hourRatePence: number;
  hourExtras: HourExtraRow[];
  createdAt: Date;
  updatedAt: Date;
}

const includeExtras = { hourExtras: true } as const;

function toResponse(row: WorkplaceRow): WorkplaceResponse {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    hourRatePence: row.hourRatePence,
    hourExtras: hourExtrasResponse(row.hourExtras),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function extraCreate(rows: readonly StoredHourExtra[]): { create: StoredHourExtra[] } | undefined {
  if (rows.length === 0) {
    return undefined;
  }
  return { create: [...rows] };
}

@Injectable()
export class WorkplacesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: PublicUser, input: CreateWorkplaceDto): Promise<WorkplaceResponse> {
    const name = input.name.trim();
    if (name.length === 0) {
      throw new BadRequestException('Name is required');
    }
    await this.requireUniqueName(user.id, input.kind, name);
    const rows = readHourExtras(input.hourExtras ?? []);
    const extras = extraCreate(rows);
    const created = await this.prisma.workplace.create({
      data: {
        userId: user.id,
        name,
        kind: input.kind,
        hourRatePence: input.hourRatePence,
        ...(extras !== undefined ? { hourExtras: extras } : {}),
      },
      include: includeExtras,
    });
    return toResponse(created);
  }

  async list(user: PublicUser, query: ListWorkplacesQueryDto): Promise<WorkplaceListResponse> {
    const skip = query.skip ?? 0;
    const limit = query.limit ?? 20;
    const where = { userId: user.id };
    const [rows, total] = await Promise.all([
      this.prisma.workplace.findMany({
        where,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        skip,
        take: limit,
        include: includeExtras,
      }),
      this.prisma.workplace.count({ where }),
    ]);
    return {
      items: rows.map((row) => toResponse(row)),
      total,
      skip,
      limit,
    };
  }

  async update(user: PublicUser, id: number, input: UpdateWorkplaceDto): Promise<WorkplaceResponse> {
    const current = await this.findOwned(user.id, id);
    const name = input.name.trim();
    if (name.length === 0) {
      throw new BadRequestException('Name is required');
    }
    await this.requireUniqueName(user.id, current.kind, name, id);
    const rows = readHourExtras(input.hourExtras);
    const updated = await this.prisma.workplace.update({
      where: { id },
      data: {
        name,
        hourRatePence: input.hourRatePence,
        hourExtras: {
          deleteMany: {},
          create: rows,
        },
      },
      include: includeExtras,
    });
    return toResponse(updated);
  }

  private async requireUniqueName(
    userId: number,
    kind: 'spa' | 'clinic',
    name: string,
    exceptId?: number,
  ): Promise<void> {
    const existing = await this.prisma.workplace.findFirst({
      where: {
        userId,
        kind,
        name: { equals: name, mode: 'insensitive' },
        ...(exceptId !== undefined ? { id: { not: exceptId } } : {}),
      },
    });
    if (existing !== null) {
      throw new ConflictException('Workplace already saved');
    }
  }

  private async findOwned(userId: number, id: number): Promise<WorkplaceRow> {
    const row = await this.prisma.workplace.findFirst({
      where: { id, userId },
      include: includeExtras,
    });
    if (row === null) {
      throw new NotFoundException(`Workplace ${id} not found`);
    }
    return row;
  }
}

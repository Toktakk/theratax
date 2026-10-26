import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { PublicUser } from '../auth/public-user.js';
import type { CreateWorkplaceDto } from './dto/create-workplace.dto.js';
import type { ListWorkplacesQueryDto } from './dto/list-workplaces-query.dto.js';

export interface WorkplaceResponse {
  id: number;
  name: string;
  kind: 'spa' | 'clinic';
  hourRatePence: number;
  pregnancyExtraPence: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkplaceListResponse {
  items: WorkplaceResponse[];
  total: number;
  skip: number;
  limit: number;
}

interface WorkplaceRow {
  id: number;
  name: string;
  kind: 'spa' | 'clinic';
  hourRatePence: number;
  pregnancyExtraPence: number;
  createdAt: Date;
  updatedAt: Date;
}

function toResponse(row: WorkplaceRow): WorkplaceResponse {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    hourRatePence: row.hourRatePence,
    pregnancyExtraPence: row.pregnancyExtraPence,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class WorkplacesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: PublicUser, input: CreateWorkplaceDto): Promise<WorkplaceResponse> {
    const name = input.name.trim();
    if (name.length === 0) {
      throw new BadRequestException('Name is required');
    }
    const existing = await this.prisma.workplace.findFirst({
      where: {
        userId: user.id,
        kind: input.kind,
        name: { equals: name, mode: 'insensitive' },
      },
    });
    if (existing !== null) {
      throw new ConflictException('Workplace already saved');
    }
    const created = await this.prisma.workplace.create({
      data: {
        userId: user.id,
        name,
        kind: input.kind,
        hourRatePence: input.hourRatePence,
        pregnancyExtraPence: input.pregnancyExtraPence ?? 0,
      },
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
}

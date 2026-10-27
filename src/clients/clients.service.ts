import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PublicUser } from '../auth/public-user.js';
import { hourExtrasResponse, readHourExtras } from '../hour-extras/hour-extra.js';
import type { HourExtraResponse, StoredHourExtra } from '../hour-extras/hour-extra.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateClientDto } from './dto/create-client.dto.js';
import type { ListClientsQueryDto } from './dto/list-clients-query.dto.js';
import type { UpdateClientDto } from './dto/update-client.dto.js';

export interface ClientResponse {
  id: number;
  name: string;
  hourRatePence: number;
  hourExtras: HourExtraResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface ClientListResponse {
  items: ClientResponse[];
  total: number;
  skip: number;
  limit: number;
}

interface HourExtraRow {
  massageType: string;
  customMassageType: string | null;
  extraPence: number;
}

interface ClientRow {
  id: number;
  name: string;
  hourRatePence: number;
  hourExtras: HourExtraRow[];
  createdAt: Date;
  updatedAt: Date;
}

const includeExtras = { hourExtras: true } as const;

function toResponse(row: ClientRow): ClientResponse {
  return {
    id: row.id,
    name: row.name,
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
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: PublicUser, input: CreateClientDto): Promise<ClientResponse> {
    const name = this.readName(input.name);
    await this.requireUniqueName(user.id, name);
    const rows = readHourExtras(input.hourExtras ?? []);
    const extras = extraCreate(rows);
    const created = await this.prisma.client.create({
      data: {
        userId: user.id,
        name,
        hourRatePence: input.hourRatePence,
        ...(extras !== undefined ? { hourExtras: extras } : {}),
      },
      include: includeExtras,
    });
    return toResponse(created);
  }

  async list(user: PublicUser, query: ListClientsQueryDto): Promise<ClientListResponse> {
    const skip = query.skip ?? 0;
    const limit = query.limit ?? 20;
    const where = { userId: user.id };
    const [rows, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        skip,
        take: limit,
        include: includeExtras,
      }),
      this.prisma.client.count({ where }),
    ]);
    return {
      items: rows.map((row) => toResponse(row)),
      total,
      skip,
      limit,
    };
  }

  async findOne(user: PublicUser, id: number): Promise<ClientResponse> {
    return toResponse(await this.findOwned(user.id, id));
  }

  async update(user: PublicUser, id: number, input: UpdateClientDto): Promise<ClientResponse> {
    await this.findOwned(user.id, id);
    const name = this.readName(input.name);
    await this.requireUniqueName(user.id, name, id);
    const rows = input.hourExtras === undefined ? undefined : readHourExtras(input.hourExtras);
    const updated = await this.prisma.client.update({
      where: { id },
      data: {
        name,
        ...(input.hourRatePence !== undefined ? { hourRatePence: input.hourRatePence } : {}),
        ...(rows !== undefined
          ? {
              hourExtras: {
                deleteMany: {},
                create: rows,
              },
            }
          : {}),
      },
      include: includeExtras,
    });
    return toResponse(updated);
  }

  async remove(user: PublicUser, id: number): Promise<void> {
    await this.findOwned(user.id, id);
    const [transactions, invoices] = await Promise.all([
      this.prisma.transaction.count({ where: { userId: user.id, clientId: id } }),
      this.prisma.invoice.count({ where: { userId: user.id, clientId: id } }),
    ]);
    if (transactions > 0 || invoices > 0) {
      throw new ConflictException('Client is used by a record');
    }
    await this.prisma.client.delete({ where: { id } });
  }

  private readName(value: string): string {
    const name = value.trim();
    if (name.length === 0) {
      throw new BadRequestException('Name is required');
    }
    return name;
  }

  private async requireUniqueName(userId: number, name: string, exceptId?: number): Promise<void> {
    const existing = await this.prisma.client.findFirst({
      where: {
        userId,
        name: { equals: name, mode: 'insensitive' },
        ...(exceptId !== undefined ? { id: { not: exceptId } } : {}),
      },
    });
    if (existing !== null) {
      throw new ConflictException('Client already saved');
    }
  }

  private async findOwned(userId: number, id: number): Promise<ClientRow> {
    const row = await this.prisma.client.findFirst({
      where: { id, userId },
      include: includeExtras,
    });
    if (row === null) {
      throw new NotFoundException(`Client ${id} not found`);
    }
    return row;
  }
}

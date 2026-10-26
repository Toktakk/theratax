import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { PublicUser } from '../auth/public-user.js';
import { formatCivilDate, parseTaxYearDate, todayCivilDate } from '../transactions/civil-date.js';
import { bonusTotalPence } from './bonus-amount.js';
import type { CreateHourlyBonusDto } from './dto/create-hourly-bonus.dto.js';
import type { ListHourlyBonusesQueryDto } from './dto/list-hourly-bonuses-query.dto.js';
import type { UpdateHourlyBonusDto } from './dto/update-hourly-bonus.dto.js';

export interface HourlyBonusResponse {
  id: number;
  workplaceId: number;
  occurredOn: string;
  eligibleMinutes: number;
  ratePencePerHour: number;
  totalPence: number;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HourlyBonusListResponse {
  items: HourlyBonusResponse[];
  total: number;
  skip: number;
  limit: number;
}

interface HourlyBonusRow {
  id: number;
  workplaceId: number;
  occurredOn: Date;
  eligibleMinutes: number;
  ratePencePerHour: number;
  totalPence: number;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function toResponse(row: HourlyBonusRow): HourlyBonusResponse {
  const response: HourlyBonusResponse = {
    id: row.id,
    workplaceId: row.workplaceId,
    occurredOn: formatCivilDate(row.occurredOn),
    eligibleMinutes: row.eligibleMinutes,
    ratePencePerHour: row.ratePencePerHour,
    totalPence: row.totalPence,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
  if (row.note !== null && row.note.length > 0) {
    response.note = row.note;
  }
  return response;
}

function isUniqueConstraintViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
  );
}

@Injectable()
export class HourlyBonusesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: PublicUser, input: CreateHourlyBonusDto): Promise<HourlyBonusResponse> {
    const occurredOn = this.readDate(input.occurredOn ?? todayCivilDate(new Date()));
    await this.requireWorkplace(user.id, input.workplaceId);
    const totalPence = bonusTotalPence(input.eligibleMinutes, input.ratePencePerHour);
    try {
      const created = await this.prisma.hourlyBonus.create({
        data: {
          userId: user.id,
          workplaceId: input.workplaceId,
          occurredOn,
          eligibleMinutes: input.eligibleMinutes,
          ratePencePerHour: input.ratePencePerHour,
          totalPence,
          note: input.note ?? null,
        },
      });
      return toResponse(created);
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictException('Hourly bonus already recorded for this workplace and date');
      }
      throw error;
    }
  }

  async list(user: PublicUser, query: ListHourlyBonusesQueryDto): Promise<HourlyBonusListResponse> {
    const skip = query.skip ?? 0;
    const limit = query.limit ?? 20;
    const occurredOn = query.date === undefined ? undefined : this.readDate(query.date);
    const where = {
      userId: user.id,
      ...(query.workplaceId !== undefined ? { workplaceId: query.workplaceId } : {}),
      ...(occurredOn !== undefined ? { occurredOn } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.hourlyBonus.findMany({
        where,
        orderBy: [{ occurredOn: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.hourlyBonus.count({ where }),
    ]);
    return {
      items: rows.map((row) => toResponse(row)),
      total,
      skip,
      limit,
    };
  }

  async findOne(user: PublicUser, id: number): Promise<HourlyBonusResponse> {
    return toResponse(await this.findOwned(user.id, id));
  }

  async update(user: PublicUser, id: number, input: UpdateHourlyBonusDto): Promise<HourlyBonusResponse> {
    const existing = await this.findOwned(user.id, id);
    const workplaceId = input.workplaceId ?? existing.workplaceId;
    const occurredOn = this.readDate(
      input.occurredOn ?? formatCivilDate(existing.occurredOn),
    );
    if (input.workplaceId !== undefined) {
      await this.requireWorkplace(user.id, workplaceId);
    }
    const eligibleMinutes = input.eligibleMinutes ?? existing.eligibleMinutes;
    const ratePencePerHour = input.ratePencePerHour ?? existing.ratePencePerHour;
    try {
      const updated = await this.prisma.hourlyBonus.update({
        where: { id: existing.id },
        data: {
          workplaceId,
          occurredOn,
          eligibleMinutes,
          ratePencePerHour,
          totalPence: bonusTotalPence(eligibleMinutes, ratePencePerHour),
          note: input.note !== undefined ? input.note : existing.note,
        },
      });
      return toResponse(updated);
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictException('Hourly bonus already recorded for this workplace and date');
      }
      throw error;
    }
  }

  async remove(user: PublicUser, id: number): Promise<void> {
    await this.findOwned(user.id, id);
    await this.prisma.hourlyBonus.delete({ where: { id } });
  }

  private readDate(value: string): Date {
    const date = parseTaxYearDate(value);
    if (date === null) {
      throw new BadRequestException('Date is outside the 2026-27 tax year');
    }
    return date;
  }

  private async requireWorkplace(userId: number, workplaceId: number): Promise<void> {
    const workplace = await this.prisma.workplace.findFirst({
      where: { id: workplaceId, userId },
    });
    if (workplace === null) {
      throw new NotFoundException(`Workplace ${workplaceId} not found`);
    }
  }

  private async findOwned(userId: number, id: number): Promise<HourlyBonusRow> {
    const row = await this.prisma.hourlyBonus.findFirst({
      where: { id, userId },
    });
    if (row === null) {
      throw new NotFoundException(`Hourly bonus ${id} not found`);
    }
    return row;
  }
}

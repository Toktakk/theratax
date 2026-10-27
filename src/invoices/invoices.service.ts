import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { PublicUser } from '../auth/public-user.js';
import {
  formatCivilDate,
  parseTaxYearDate,
  todayCivilDate,
} from '../transactions/civil-date.js';
import type { CreateInvoiceDto } from './dto/create-invoice.dto.js';
import type { ListInvoicesQueryDto } from './dto/list-invoices-query.dto.js';
import type { PreviewInvoiceQueryDto } from './dto/preview-invoice-query.dto.js';
import type { PayInvoiceDto } from './dto/pay-invoice.dto.js';
import {
  buildInvoiceLines,
  invoiceLinesTotalPence,
  type BuiltInvoiceLine,
} from './invoice-lines.js';

const PERIOD_START = Date.UTC(2026, 3, 6);
const PERIOD_END = Date.UTC(2027, 3, 5);

export interface InvoiceLineResponse {
  kind: 'service' | 'additional_fee' | 'bonus' | 'hourly_bonus';
  description: string;
  quantity: number;
  quantityUnit: 'session' | 'minute';
  ratePence: number;
  amountPence: number;
  occurredOn: string;
  sourceTransactionId?: number;
  sourceBonusId?: number;
}

export interface InvoiceResponse {
  id: number;
  number: string;
  amountPence: number;
  issuedOn: string;
  status: 'issued' | 'paid';
  paidOn?: string;
  clientName?: string;
  service?: string;
  transactionId?: number;
  recipientKind?: 'spa' | 'clinic' | 'client';
  recipientName?: string;
  workplaceId?: number;
  clientId?: number;
  period?: 'day' | 'month';
  periodStart?: string;
  periodEnd?: string;
  lines?: InvoiceLineResponse[];
}

export interface InvoicePreviewResponse {
  recipientKind: 'spa' | 'clinic' | 'client';
  recipientName: string;
  workplaceId?: number;
  clientId?: number;
  period: 'day' | 'month';
  periodStart: string;
  periodEnd: string;
  amountPence: number;
  lines: InvoiceLineResponse[];
}

export interface InvoiceListResponse {
  items: InvoiceResponse[];
  total: number;
  skip: number;
  limit: number;
}

interface StoredLine {
  kind: InvoiceLineResponse['kind'];
  description: string;
  quantity: number;
  quantityUnit: InvoiceLineResponse['quantityUnit'];
  ratePence: number;
  amountPence: number;
  occurredOn: Date;
  sourceTransactionId: number | null;
  sourceBonusId: number | null;
  id: number;
}

interface InvoiceRow {
  id: number;
  number: string;
  clientName: string | null;
  service: string | null;
  amountPence: number;
  issuedOn: Date;
  status: 'issued' | 'paid';
  paidOn: Date | null;
  recipientKind: 'spa' | 'clinic' | 'client' | null;
  recipientName: string | null;
  workplaceId: number | null;
  clientId: number | null;
  period: 'day' | 'month' | null;
  periodStart: Date | null;
  periodEnd: Date | null;
  transaction: { id: number } | null;
  lines: StoredLine[];
}

interface InvoiceDraft {
  recipientKind: 'spa' | 'clinic' | 'client';
  recipientName: string;
  workplaceId?: number;
  clientId?: number;
  period: 'day' | 'month';
  periodStart: Date;
  periodEnd: Date;
  lines: BuiltInvoiceLine[];
  amountPence: number;
}

type InvoiceRequest = CreateInvoiceDto | PreviewInvoiceQueryDto;

function invoiceNumber(count: number): string {
  return `TT-${String(count + 1).padStart(4, '0')}`;
}

function isUniqueConstraintViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
  );
}

function isSourceLineCollision(error: unknown): boolean {
  if (!isUniqueConstraintViolation(error) || !(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }
  const target = error.meta?.target;
  if (typeof target === 'string') {
    return target.includes('sourceTransactionId');
  }
  return Array.isArray(target) && target.includes('sourceTransactionId');
}

function monthBounds(month: number, year: number): { start: Date; end: Date } | null {
  const startTime = Date.UTC(year, month - 1, 1);
  const endTime = Date.UTC(year, month, 0);
  if (endTime < PERIOD_START || startTime > PERIOD_END) {
    return null;
  }
  return {
    start: new Date(Math.max(startTime, PERIOD_START)),
    end: new Date(Math.min(endTime, PERIOD_END)),
  };
}

function kindRank(kind: InvoiceLineResponse['kind']): number {
  if (kind === 'service') {
    return 0;
  }
  if (kind === 'additional_fee') {
    return 1;
  }
  return 2;
}

function toLineResponse(line: BuiltInvoiceLine): InvoiceLineResponse {
  const response: InvoiceLineResponse = {
    kind: line.kind,
    description: line.description,
    quantity: line.quantity,
    quantityUnit: line.quantityUnit,
    ratePence: line.ratePence,
    amountPence: line.amountPence,
    occurredOn: line.occurredOn,
  };
  response.sourceTransactionId = line.sourceTransactionId;
  return response;
}

function storedLines(lines: StoredLine[]): InvoiceLineResponse[] {
  return [...lines]
    .sort((left, right) => {
      const byDate = left.occurredOn.getTime() - right.occurredOn.getTime();
      if (byDate !== 0) {
        return byDate;
      }
      const byKind = kindRank(left.kind) - kindRank(right.kind);
      if (byKind !== 0) {
        return byKind;
      }
      return left.id - right.id;
    })
    .map((line) => {
      const response: InvoiceLineResponse = {
        kind: line.kind,
        description: line.description,
        quantity: line.quantity,
        quantityUnit: line.quantityUnit,
        ratePence: line.ratePence,
        amountPence: line.amountPence,
        occurredOn: formatCivilDate(line.occurredOn),
      };
      if (line.sourceTransactionId !== null) {
        response.sourceTransactionId = line.sourceTransactionId;
      }
      if (line.sourceBonusId !== null) {
        response.sourceBonusId = line.sourceBonusId;
      }
      return response;
    });
}

function toResponse(row: InvoiceRow): InvoiceResponse {
  const response: InvoiceResponse = {
    id: row.id,
    number: row.number,
    amountPence: row.amountPence,
    issuedOn: formatCivilDate(row.issuedOn),
    status: row.status,
  };
  if (row.paidOn !== null) {
    response.paidOn = formatCivilDate(row.paidOn);
  }
  if (row.clientName !== null) {
    response.clientName = row.clientName;
  }
  if (row.service !== null) {
    response.service = row.service;
  }
  if (row.transaction !== null) {
    response.transactionId = row.transaction.id;
  }
  if (row.recipientKind !== null) {
    response.recipientKind = row.recipientKind;
  }
  if (row.recipientName !== null) {
    response.recipientName = row.recipientName;
  }
  if (row.workplaceId !== null) {
    response.workplaceId = row.workplaceId;
  }
  if (row.clientId !== null) {
    response.clientId = row.clientId;
  }
  if (row.period !== null) {
    response.period = row.period;
  }
  if (row.periodStart !== null) {
    response.periodStart = formatCivilDate(row.periodStart);
  }
  if (row.periodEnd !== null) {
    response.periodEnd = formatCivilDate(row.periodEnd);
  }
  if (row.lines.length > 0) {
    response.lines = storedLines(row.lines);
  }
  return response;
}

function toPreview(draft: InvoiceDraft): InvoicePreviewResponse {
  const response: InvoicePreviewResponse = {
    recipientKind: draft.recipientKind,
    recipientName: draft.recipientName,
    period: draft.period,
    periodStart: formatCivilDate(draft.periodStart),
    periodEnd: formatCivilDate(draft.periodEnd),
    amountPence: draft.amountPence,
    lines: draft.lines.map((line) => toLineResponse(line)),
  };
  if (draft.workplaceId !== undefined) {
    response.workplaceId = draft.workplaceId;
  }
  if (draft.clientId !== undefined) {
    response.clientId = draft.clientId;
  }
  return response;
}

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: PublicUser, query: ListInvoicesQueryDto): Promise<InvoiceListResponse> {
    const skip = query.skip ?? 0;
    const limit = query.limit ?? 20;
    const where = { userId: user.id };
    const [rows, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        orderBy: [{ issuedOn: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
        include: { transaction: { select: { id: true } }, lines: true },
      }),
      this.prisma.invoice.count({ where }),
    ]);
    return {
      items: rows.map((row) => toResponse(row)),
      total,
      skip,
      limit,
    };
  }

  async findOne(user: PublicUser, id: number): Promise<InvoiceResponse> {
    return toResponse(await this.findOwned(user.id, id));
  }

  async preview(user: PublicUser, input: PreviewInvoiceQueryDto): Promise<InvoicePreviewResponse> {
    const draft = await this.prisma.$transaction((tx) => this.buildDraft(tx, user.id, input));
    return toPreview(draft);
  }

  async create(user: PublicUser, input: CreateInvoiceDto): Promise<InvoiceResponse> {
    const issuedOn = this.readDate(input.issuedOn ?? todayCivilDate(new Date()));
    try {
      return toResponse(await this.insertInvoice(user.id, input, issuedOn));
    } catch (error) {
      if (!isUniqueConstraintViolation(error)) {
        throw error;
      }
    }
    try {
      return toResponse(await this.insertInvoice(user.id, input, issuedOn));
    } catch (error) {
      if (isSourceLineCollision(error)) {
        throw new BadRequestException('No records to invoice for this recipient and period');
      }
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictException('Invoice number collided, retry');
      }
      throw error;
    }
  }

  async pay(user: PublicUser, id: number, input: PayInvoiceDto): Promise<InvoiceResponse> {
    const existing = await this.findOwned(user.id, id);
    if (existing.status === 'paid') {
      throw new ConflictException('Invoice is already paid');
    }
    const paidOn = this.readDate(input.paidOn ?? todayCivilDate(new Date()));
    if (paidOn.getTime() < existing.issuedOn.getTime()) {
      throw new BadRequestException('paidOn is before issuedOn');
    }
    return toResponse(
      await this.prisma.$transaction(async (tx) => {
        const current = await tx.invoice.findFirst({
          where: { id: existing.id, userId: user.id },
        });
        if (current === null) {
          throw new NotFoundException(`Invoice ${existing.id} not found`);
        }
        if (current.status === 'paid') {
          throw new ConflictException('Invoice is already paid');
        }
        return tx.invoice.update({
          where: { id: current.id },
          data: { status: 'paid', paidOn },
          include: { transaction: { select: { id: true } }, lines: true },
        });
      }),
    );
  }

  private readDate(value: string): Date {
    const date = parseTaxYearDate(value);
    if (date === null) {
      throw new BadRequestException('Date is outside the 2026-27 tax year');
    }
    return date;
  }

  private resolvePeriod(input: InvoiceRequest): { periodStart: Date; periodEnd: Date } {
    if (input.period === 'day') {
      if (input.date === undefined) {
        throw new BadRequestException('Date is required');
      }
      const date = this.readDate(input.date);
      return { periodStart: date, periodEnd: date };
    }
    if (input.month === undefined || input.year === undefined) {
      throw new BadRequestException('Month and year are required');
    }
    const bounds = monthBounds(input.month, input.year);
    if (bounds === null) {
      throw new BadRequestException('Date is outside the 2026-27 tax year');
    }
    return { periodStart: bounds.start, periodEnd: bounds.end };
  }

  private async buildDraft(
    db: Prisma.TransactionClient,
    userId: number,
    input: InvoiceRequest,
  ): Promise<InvoiceDraft> {
    const periodBounds = this.resolvePeriod(input);
    const recipient = await this.resolveRecipient(db, userId, input);
    const incomes = await db.transaction.findMany({
      where: {
        userId,
        type: 'income',
        invoiceId: null,
        occurredOn: { gte: periodBounds.periodStart, lte: periodBounds.periodEnd },
        invoiceLines: { none: {} },
        ...(recipient.clientId !== undefined
          ? { clientId: recipient.clientId }
          : { workplaceId: recipient.workplaceId }),
      },
      orderBy: [{ occurredOn: 'asc' }, { id: 'asc' }],
    });
    const lines = buildInvoiceLines({
      incomes: incomes.map((income) => ({
        id: income.id,
        occurredOn: formatCivilDate(income.occurredOn),
        amountPence: income.amountPence,
        basePence: income.basePence,
        additionalFeePence: income.additionalFeePence,
        bonusPence: income.bonusPence,
        massageType: income.massageType,
        customMassageType: income.customMassageType,
      })),
    });
    return {
      recipientKind: input.recipientKind,
      recipientName: recipient.recipientName,
      workplaceId: recipient.workplaceId,
      clientId: recipient.clientId,
      period: input.period,
      periodStart: periodBounds.periodStart,
      periodEnd: periodBounds.periodEnd,
      lines,
      amountPence: invoiceLinesTotalPence(lines),
    };
  }

  private async resolveRecipient(
    db: Prisma.TransactionClient,
    userId: number,
    input: InvoiceRequest,
  ): Promise<{ recipientName: string; workplaceId?: number; clientId?: number }> {
    if (input.recipientKind === 'client') {
      if (input.clientId === undefined || input.workplaceId !== undefined) {
        throw new BadRequestException('Recipient does not take that id');
      }
      const client = await db.client.findFirst({
        where: { id: input.clientId, userId },
      });
      if (client === null) {
        throw new NotFoundException(`Client ${input.clientId} not found`);
      }
      return { recipientName: client.name, clientId: client.id };
    }
    if (input.workplaceId === undefined || input.clientId !== undefined) {
      throw new BadRequestException('Recipient does not take that id');
    }
    const workplace = await db.workplace.findFirst({
      where: { id: input.workplaceId, userId },
    });
    if (workplace === null) {
      throw new NotFoundException(`Workplace ${input.workplaceId} not found`);
    }
    if (workplace.kind !== input.recipientKind) {
      throw new BadRequestException('Workplace kind does not match recipient');
    }
    return { recipientName: workplace.name, workplaceId: workplace.id };
  }

  private async insertInvoice(
    userId: number,
    input: CreateInvoiceDto,
    issuedOn: Date,
  ): Promise<InvoiceRow> {
    return this.prisma.$transaction(async (tx) => {
      const draft = await this.buildDraft(tx, userId, input);
      if (draft.lines.length === 0) {
        throw new BadRequestException('No records to invoice for this recipient and period');
      }
      const count = await tx.invoice.count({ where: { userId } });
      return tx.invoice.create({
        data: {
          userId,
          number: invoiceNumber(count),
          amountPence: draft.amountPence,
          issuedOn,
          status: 'issued',
          recipientKind: draft.recipientKind,
          recipientName: draft.recipientName,
          workplaceId: draft.workplaceId ?? null,
          clientId: draft.clientId ?? null,
          period: draft.period,
          periodStart: draft.periodStart,
          periodEnd: draft.periodEnd,
          lines: {
            create: draft.lines.map((line) => ({
              kind: line.kind,
              description: line.description,
              quantity: line.quantity,
              quantityUnit: line.quantityUnit,
              ratePence: line.ratePence,
              amountPence: line.amountPence,
              occurredOn: this.readDate(line.occurredOn),
              sourceTransactionId: line.sourceTransactionId,
            })),
          },
        },
        include: { transaction: { select: { id: true } }, lines: true },
      });
    });
  }

  private async findOwned(userId: number, id: number): Promise<InvoiceRow> {
    const row = await this.prisma.invoice.findFirst({
      where: { id, userId },
      include: { transaction: { select: { id: true } }, lines: true },
    });
    if (row === null) {
      throw new NotFoundException(`Invoice ${id} not found`);
    }
    return row;
  }
}

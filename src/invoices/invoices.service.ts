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
import type { PayInvoiceDto } from './dto/pay-invoice.dto.js';

export interface InvoiceResponse {
  id: number;
  number: string;
  clientName: string;
  service: string;
  amountPence: number;
  issuedOn: string;
  status: 'issued' | 'paid';
  paidOn?: string;
  transactionId?: number;
}

export interface InvoiceListResponse {
  items: InvoiceResponse[];
  total: number;
  skip: number;
  limit: number;
}

interface InvoiceRow {
  id: number;
  number: string;
  clientName: string;
  service: string;
  amountPence: number;
  issuedOn: Date;
  status: 'issued' | 'paid';
  paidOn: Date | null;
  transaction: { id: number } | null;
}

function invoiceNumber(count: number): string {
  return `TT-${String(count + 1).padStart(4, '0')}`;
}

function isUniqueConstraintViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

function toResponse(row: InvoiceRow): InvoiceResponse {
  const response: InvoiceResponse = {
    id: row.id,
    number: row.number,
    clientName: row.clientName,
    service: row.service,
    amountPence: row.amountPence,
    issuedOn: formatCivilDate(row.issuedOn),
    status: row.status,
  };
  if (row.paidOn !== null) {
    response.paidOn = formatCivilDate(row.paidOn);
  }
  if (row.transaction !== null) {
    response.transactionId = row.transaction.id;
  }
  return response;
}

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    user: PublicUser,
    query: ListInvoicesQueryDto,
  ): Promise<InvoiceListResponse> {
    const skip = query.skip ?? 0;
    const limit = query.limit ?? 20;
    const where = { userId: user.id };
    const [rows, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        orderBy: [{ issuedOn: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
        include: { transaction: { select: { id: true } } },
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

  async create(
    user: PublicUser,
    input: CreateInvoiceDto,
  ): Promise<InvoiceResponse> {
    const issuedOn = this.readDate(
      input.issuedOn ?? todayCivilDate(new Date()),
    );
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
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictException('Invoice number collided, retry');
      }
      throw error;
    }
  }

  async pay(
    user: PublicUser,
    id: number,
    input: PayInvoiceDto,
  ): Promise<InvoiceResponse> {
    const existing = await this.findOwned(user.id, id);
    if (existing.status === 'paid') {
      throw new ConflictException('Invoice is already paid');
    }
    const paidOn = this.readDate(input.paidOn ?? todayCivilDate(new Date()));
    if (paidOn.getTime() < existing.issuedOn.getTime()) {
      throw new BadRequestException('paidOn is before issuedOn');
    }
    try {
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
          const income = await tx.transaction.create({
            data: {
              userId: user.id,
              type: 'income',
              occurredOn: paidOn,
              amountPence: current.amountPence,
              note: current.number,
              invoiceId: current.id,
            },
          });
          const invoice = await tx.invoice.update({
            where: { id: current.id },
            data: { status: 'paid', paidOn },
          });
          return {
            id: invoice.id,
            number: invoice.number,
            clientName: invoice.clientName,
            service: invoice.service,
            amountPence: invoice.amountPence,
            issuedOn: invoice.issuedOn,
            status: invoice.status,
            paidOn: invoice.paidOn,
            transaction: { id: income.id },
          };
        }),
      );
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictException('Invoice is already paid');
      }
      throw error;
    }
  }

  private readDate(value: string): Date {
    const date = parseTaxYearDate(value);
    if (date === null) {
      throw new BadRequestException('Date is outside the 2026-27 tax year');
    }
    return date;
  }

  private async insertInvoice(
    userId: number,
    input: CreateInvoiceDto,
    issuedOn: Date,
  ): Promise<InvoiceRow> {
    const created = await this.prisma.$transaction(async (tx) => {
      const count = await tx.invoice.count({ where: { userId } });
      return tx.invoice.create({
        data: {
          userId,
          number: invoiceNumber(count),
          clientName: input.clientName,
          service: input.service,
          amountPence: input.amountPence,
          issuedOn,
          status: 'issued',
        },
      });
    });
    return {
      id: created.id,
      number: created.number,
      clientName: created.clientName,
      service: created.service,
      amountPence: created.amountPence,
      issuedOn: created.issuedOn,
      status: created.status,
      paidOn: created.paidOn,
      transaction: null,
    };
  }

  private async findOwned(userId: number, id: number): Promise<InvoiceRow> {
    const row = await this.prisma.invoice.findFirst({
      where: { id, userId },
      include: { transaction: { select: { id: true } } },
    });
    if (row === null) {
      throw new NotFoundException(`Invoice ${id} not found`);
    }
    return row;
  }
}

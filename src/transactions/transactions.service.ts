import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
    ConflictException,
  } from '@nestjs/common';
  import { PrismaService } from '../prisma/prisma.service.js';
  import type { PublicUser } from '../auth/public-user.js';
  import type { CreateTransactionDto } from './dto/create-transaction.dto.js';
  import type { ListTransactionsQueryDto } from './dto/list-transactions-query.dto.js';
  import type { UpdateTransactionDto } from './dto/update-transaction.dto.js';
  import { formatCivilDate, parseTaxYearDate, todayCivilDate } from './civil-date.js';
  import { mileageAmountPence } from './mileage-amount.js';
  import type { TransactionListResponse, TransactionResponse } from './transaction-response.js';
  
  interface TransactionRow {
    id: number;
    type: 'income' | 'expense';
    occurredOn: Date;
    amountPence: number;
    note: string | null;
    categorySlug: string | null;
    miles: number | null;
    invoiceId: number | null;
    receipt: { transactionId: number } | null;
  }
  
  function toResponse(row: TransactionRow): TransactionResponse {
    const response: TransactionResponse = {
      id: row.id,
      type: row.type,
      occurredOn: formatCivilDate(row.occurredOn),
      amountPence: row.amountPence,
      hasReceipt: row.receipt !== null,
    };
    if (row.note !== null && row.note.length > 0) {
      response.note = row.note;
    }
    if (row.categorySlug !== null) {
      response.categorySlug = row.categorySlug;
    }
    if (row.miles !== null) {
      response.miles = row.miles;
    }
    if (row.invoiceId !== null) {
      response.invoiceId = row.invoiceId;
    }
    return response;
  }
  
  @Injectable()
  export class TransactionsService {
    constructor(private readonly prisma: PrismaService) {}
  
    async list(user: PublicUser, query: ListTransactionsQueryDto): Promise<TransactionListResponse> {
      const skip = query.skip ?? 0;
      const limit = query.limit ?? 20;
      const where = {
        userId: user.id,
        ...(query.type !== undefined ? { type: query.type } : {}),
      };
      const [rows, total] = await Promise.all([
        this.prisma.transaction.findMany({
          where,
          orderBy: [{ occurredOn: 'desc' }, { id: 'desc' }],
          skip,
          take: limit,
          include: { receipt: true },
        }),
        this.prisma.transaction.count({ where }),
      ]);
      return {
        items: rows.map((row) => toResponse(row)),
        total,
        skip,
        limit,
      };
    }
  
    async findOne(user: PublicUser, id: number): Promise<TransactionResponse> {
      return toResponse(await this.findOwned(user.id, id));
    }
  
    async create(user: PublicUser, input: CreateTransactionDto): Promise<TransactionResponse> {
      const expenseMethod = this.expenseMethod(user);
      const occurredOn = this.readDate(input.occurredOn ?? todayCivilDate(new Date()));
      const draft = await this.resolveExpenseFields(expenseMethod, input.type, {
        amountPence: input.amountPence ?? null,
        amountProvided: input.amountPence !== undefined,
        categorySlug: input.categorySlug ?? null,
        miles: input.miles ?? null,
        milesProvided: input.miles !== undefined,
      });
      const created = await this.prisma.transaction.create({
        data: {
          userId: user.id,
          type: input.type,
          occurredOn,
          amountPence: draft.amountPence ?? 0,
          note: input.note ?? null,
          categorySlug: draft.categorySlug,
          miles: draft.miles,
        },
      });
      if (draft.categorySlug === 'mileage') {
        await this.recomputeMileage(user.id);
      }
      return toResponse(await this.findOwned(user.id, created.id));
    }
  
    async update(user: PublicUser, id: number, input: UpdateTransactionDto): Promise<TransactionResponse> {
      const existing = await this.findOwned(user.id, id);
      if (existing.invoiceId !== null) {
        throw new ConflictException('Invoice income is changed by updating the invoice');
      }
      const expenseMethod = this.expenseMethod(user);
      const occurredOn = this.readDate(input.occurredOn ?? formatCivilDate(existing.occurredOn));
      const draft = await this.resolveExpenseFields(expenseMethod, existing.type, {
        amountPence: input.amountPence !== undefined ? input.amountPence : existing.amountPence,
        amountProvided: input.amountPence !== undefined,
        categorySlug: input.categorySlug !== undefined ? input.categorySlug : existing.categorySlug,
        miles: input.miles !== undefined ? input.miles : existing.miles,
        milesProvided: input.miles !== undefined,
      });
      await this.prisma.transaction.update({
        where: { id },
        data: {
          occurredOn,
          amountPence: draft.amountPence ?? 0,
          note: input.note !== undefined ? input.note : existing.note,
          categorySlug: draft.categorySlug,
          miles: draft.miles,
        },
      });
      if (existing.categorySlug === 'mileage' || draft.categorySlug === 'mileage') {
        await this.recomputeMileage(user.id);
      }
      return toResponse(await this.findOwned(user.id, id));
    }
  
    async remove(user: PublicUser, id: number): Promise<void> {
      const existing = await this.findOwned(user.id, id);
      if (existing.invoiceId !== null) {
        throw new ConflictException('Invoice income is changed by updating the invoice');
      }
      await this.prisma.transaction.delete({ where: { id } });
      if (existing.categorySlug === 'mileage') {
        await this.recomputeMileage(user.id);
      }
    }
  
    private expenseMethod(user: PublicUser): 'flat_rate' | 'actual_cost' {
      if (user.expenseMethod === null) {
        throw new ForbiddenException('Complete onboarding before using this resource');
      }
      return user.expenseMethod;
    }
  
    private readDate(value: string): Date {
      const date = parseTaxYearDate(value);
      if (date === null) {
        throw new BadRequestException('Date is outside the 2026-27 tax year');
      }
      return date;
    }
  
    private async resolveExpenseFields(
      expenseMethod: 'flat_rate' | 'actual_cost',
      type: 'income' | 'expense',
      input: {
        amountPence: number | null;
        amountProvided: boolean;
        categorySlug: string | null;
        miles: number | null;
        milesProvided: boolean;
      },
    ): Promise<{
      amountPence: number | null;
      categorySlug: string | null;
      miles: number | null;
    }> {
      if (type === 'income') {
        if (input.categorySlug !== null || input.miles !== null) {
          throw new BadRequestException('Income does not take a category or miles');
        }
        if (input.amountPence === null) {
          throw new BadRequestException('Amount is required');
        }
        return { amountPence: input.amountPence, categorySlug: null, miles: null };
      }
      if (input.categorySlug === null) {
        throw new BadRequestException('Category is required');
      }
      const category = await this.prisma.expenseCategory.findUnique({
        where: { slug: input.categorySlug },
      });
      if (category === null) {
        throw new BadRequestException(`Unknown category ${input.categorySlug}`);
      }
      if (
        (category.kind === 'mileage' && expenseMethod !== 'flat_rate') ||
        (category.kind === 'vehicle_actual' && expenseMethod !== 'actual_cost')
      ) {
        throw new BadRequestException(
          `Category ${category.slug} is not valid for ${expenseMethod}`,
        );
      }
      if (category.kind === 'mileage') {
        if (input.amountProvided) {
          throw new BadRequestException('Amount is computed from miles');
        }
        if (input.miles === null) {
          throw new BadRequestException('Miles are required');
        }
        return { amountPence: null, categorySlug: category.slug, miles: input.miles };
      }
      if (input.milesProvided) {
        throw new BadRequestException('Miles are only valid for mileage');
      }
      if (input.amountPence === null) {
        throw new BadRequestException('Amount is required');
      }
      return { amountPence: input.amountPence, categorySlug: category.slug, miles: null };
    }
  
    private async findOwned(userId: number, id: number): Promise<TransactionRow> {
      const row = await this.prisma.transaction.findFirst({
        where: { id, userId },
        include: { receipt: true },
      });
      if (row === null) {
        throw new NotFoundException(`Transaction ${id} not found`);
      }
      return row;
    }
  
    private async recomputeMileage(userId: number): Promise<void> {
      const rows = await this.prisma.transaction.findMany({
        where: { userId, categorySlug: 'mileage' },
        orderBy: [{ occurredOn: 'asc' }, { id: 'asc' }],
      });
      const mileageRows: { id: number; occurredOn: Date; miles: number }[] = [];
      for (const row of rows) {
        if (row.miles !== null) {
          mileageRows.push({ id: row.id, occurredOn: row.occurredOn, miles: row.miles });
        }
      }
      const amounts = mileageAmountPence(mileageRows);
      for (const row of mileageRows) {
        const amountPence = amounts.get(row.id);
        if (amountPence !== undefined) {
          await this.prisma.transaction.update({
            where: { id: row.id },
            data: { amountPence },
          });
        }
      }
    }
  }
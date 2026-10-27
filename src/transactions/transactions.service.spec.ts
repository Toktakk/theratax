import { BadRequestException, ConflictException } from '@nestjs/common';
import type { PublicUser } from '../auth/public-user.js';
import { prismaDouble } from '../../test/prisma-stub.js';
import { TransactionsService } from './transactions.service.js';

const user: PublicUser = {
  id: 4,
  email: 'ada@example.com',
  name: 'Ada',
  practiceType: 'mobile',
  expenseMethod: 'flat_rate',
  onboardedAt: '2026-04-06T12:00:00.000Z',
};

const occurredOn = new Date(Date.UTC(2026, 4, 1));
const stamp = new Date('2026-05-01T10:00:00.000Z');

function row(overrides: {
  id?: number;
  type?: 'income' | 'expense';
  amountPence?: number;
  categorySlug?: string | null;
  invoiceId?: number | null;
  massageType?: 'swedish' | null;
  basePence?: number | null;
  additionalFeePence?: number | null;
}) {
  return {
    id: overrides.id ?? 9,
    type: overrides.type ?? 'income',
    occurredOn,
    amountPence: overrides.amountPence ?? 1200,
    note: null,
    categorySlug: overrides.categorySlug ?? null,
    miles: null,
    invoiceId: overrides.invoiceId ?? null,
    massageType: overrides.massageType === undefined ? 'swedish' : overrides.massageType,
    customMassageType: null,
    basePence: overrides.basePence === undefined ? 1000 : overrides.basePence,
    additionalFeePence: overrides.additionalFeePence === undefined ? 200 : overrides.additionalFeePence,
    bonusPence: 0,
    minutes: null,
    workplaceId: null,
    clientId: null,
    createdAt: stamp,
    updatedAt: stamp,
    receipt: null,
  };
}

describe('TransactionsService', () => {
  it('prices Swedish income as base plus fee', async () => {
    const { prisma, db } = prismaDouble();
    db.transaction.create.mockResolvedValue({ id: 9 });
    db.transaction.findFirst.mockResolvedValue(row({ amountPence: 1200 }));
    const service = new TransactionsService(prisma);

    const created = await service.create(user, {
      type: 'income',
      occurredOn: '01-05-2026',
      massageType: 'swedish',
      basePence: 1000,
      additionalFeePence: 200,
    });

    expect(created.amountPence).toBe(1200);
    expect(db.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 4,
          amountPence: 1200,
          basePence: 1000,
          additionalFeePence: 200,
          massageType: 'swedish',
        }),
      }),
    );
  });

  it('rejects massage fields on an expense', async () => {
    const { prisma, db } = prismaDouble();
    const service = new TransactionsService(prisma);

    await expect(
      service.create(user, {
        type: 'expense',
        occurredOn: '01-05-2026',
        amountPence: 250,
        categorySlug: 'other',
        massageType: 'swedish',
      }),
    ).rejects.toThrow('Massage type is only valid on income');
    expect(db.transaction.create).not.toHaveBeenCalled();
  });

  it('requires a custom name for massage type other', async () => {
    const { prisma } = prismaDouble();
    const service = new TransactionsService(prisma);

    await expect(
      service.create(user, {
        type: 'income',
        occurredOn: '01-05-2026',
        massageType: 'other',
        basePence: 1000,
      }),
    ).rejects.toThrow('Custom massage type is required');
  });

  it('refuses to change or delete income that is already on an invoice', async () => {
    const { prisma, db } = prismaDouble();
    db.transaction.findFirst.mockResolvedValue(row({ invoiceId: 5 }));
    const service = new TransactionsService(prisma);

    await expect(service.update(user, 9, { note: 'edited' })).rejects.toBeInstanceOf(
      ConflictException,
    );
    await expect(service.remove(user, 9)).rejects.toThrow(
      'Invoice income is changed by updating the invoice',
    );
    expect(db.transaction.update).not.toHaveBeenCalled();
    expect(db.transaction.delete).not.toHaveBeenCalled();
  });

  it('asks for income before expense on the same day', async () => {
    const { prisma, db } = prismaDouble();
    db.transaction.findMany.mockResolvedValue([
      row({ id: 2, type: 'income', amountPence: 1200 }),
      row({
        id: 1,
        type: 'expense',
        amountPence: 250,
        categorySlug: 'other',
        massageType: null,
        basePence: null,
        additionalFeePence: null,
      }),
    ]);
    db.transaction.count.mockResolvedValue(2);
    const service = new TransactionsService(prisma);

    const page = await service.list(user, {});

    expect(page.items.map((item) => item.type)).toEqual(['income', 'expense']);
    expect(db.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 4 },
        orderBy: [{ occurredOn: 'desc' }, { type: 'asc' }, { id: 'desc' }],
      }),
    );
  });

  it('rejects a date outside the tax year before writing', async () => {
    const { prisma, db } = prismaDouble();
    const service = new TransactionsService(prisma);

    await expect(
      service.create(user, {
        type: 'income',
        occurredOn: '31-02-2026',
        amountPence: 100,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(db.transaction.create).not.toHaveBeenCalled();
  });
});

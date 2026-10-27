import type { PublicUser } from '../auth/public-user.js';
import { prismaDouble } from '../../test/prisma-stub.js';
import { InvoicesService } from './invoices.service.js';

const user: PublicUser = {
  id: 4,
  email: 'ada@example.com',
  name: 'Ada',
  practiceType: 'mobile',
  expenseMethod: 'flat_rate',
  onboardedAt: '2026-04-06T12:00:00.000Z',
  addressLine1: '1 High Street',
  town: 'London',
  postcode: 'SW1A 1AA',
};

const day = new Date(Date.UTC(2026, 4, 1));

const spa = {
  id: 3,
  name: 'North Spa',
  kind: 'spa' as const,
  addressLine1: '4 Spa Lane',
  addressLine2: null,
  town: 'Leeds',
  postcode: 'LS1 4AP',
};

const swedish = {
  id: 11,
  occurredOn: day,
  amountPence: 6700,
  basePence: 6000,
  additionalFeePence: 200,
  bonusPence: 500,
  massageType: 'swedish',
  customMassageType: null,
};

const dayQuery = {
  recipientKind: 'spa' as const,
  workplaceId: 3,
  period: 'day' as const,
  date: '01-05-2026',
};

function issuedInvoice(status: 'issued' | 'paid' = 'issued') {
  return {
    id: 20,
    number: 'TT-0001',
    clientName: null,
    service: null,
    amountPence: 6700,
    issuedOn: day,
    status,
    paidOn: status === 'paid' ? day : null,
    recipientKind: 'spa' as const,
    recipientName: 'North Spa',
    workplaceId: 3,
    clientId: null,
    period: 'day' as const,
    periodStart: day,
    periodEnd: day,
    supplierAddressLine1: '1 High Street',
    supplierAddressLine2: null,
    supplierTown: 'London',
    supplierPostcode: 'SW1A 1AA',
    recipientAddressLine1: '4 Spa Lane',
    recipientAddressLine2: null,
    recipientTown: 'Leeds',
    recipientPostcode: 'LS1 4AP',
    transaction: null,
    lines: [
      {
        id: 1,
        kind: 'service' as const,
        description: 'Swedish',
        quantity: 1,
        quantityUnit: 'session' as const,
        ratePence: 6000,
        amountPence: 6000,
        occurredOn: day,
        sourceTransactionId: 11,
        sourceBonusId: null,
      },
      {
        id: 2,
        kind: 'additional_fee' as const,
        description: 'Additional Massage Fee',
        quantity: 1,
        quantityUnit: 'session' as const,
        ratePence: 200,
        amountPence: 200,
        occurredOn: day,
        sourceTransactionId: 11,
        sourceBonusId: null,
      },
      {
        id: 3,
        kind: 'bonus' as const,
        description: 'Bonus',
        quantity: 1,
        quantityUnit: 'session' as const,
        ratePence: 500,
        amountPence: 500,
        occurredOn: day,
        sourceTransactionId: 11,
        sourceBonusId: null,
      },
    ],
  };
}

describe('InvoicesService', () => {
  it('previews one service, fee, and bonus totalling 6700 and writes nothing', async () => {
    const { prisma, db } = prismaDouble();
    db.workplace.findFirst.mockResolvedValue(spa);
    db.transaction.findMany.mockResolvedValue([swedish]);
    const service = new InvoicesService(prisma);

    const preview = await service.preview(user, dayQuery);

    expect(preview.amountPence).toBe(6700);
    expect(preview.lines.map((line) => line.kind)).toEqual(['service', 'additional_fee', 'bonus']);
    expect(preview.lines.filter((line) => line.kind === 'bonus')).toHaveLength(1);
    expect(db.invoice.create).not.toHaveBeenCalled();
  });

  it('bounds a May preview so 1 June is outside the query', async () => {
    const { prisma, db } = prismaDouble();
    db.workplace.findFirst.mockResolvedValue(spa);
    db.transaction.findMany.mockResolvedValue([]);
    const service = new InvoicesService(prisma);

    await service.preview(user, {
      recipientKind: 'spa',
      workplaceId: 3,
      period: 'month',
      month: 5,
      year: 2026,
    });

    expect(db.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          workplaceId: 3,
          occurredOn: {
            gte: new Date(Date.UTC(2026, 4, 1)),
            lte: new Date(Date.UTC(2026, 4, 31)),
          },
        }),
      }),
    );
  });

  it('returns an empty preview without writing', async () => {
    const { prisma, db } = prismaDouble();
    db.workplace.findFirst.mockResolvedValue(spa);
    db.transaction.findMany.mockResolvedValue([]);
    const service = new InvoicesService(prisma);

    const preview = await service.preview(user, dayQuery);

    expect(preview.lines).toEqual([]);
    expect(preview.amountPence).toBe(0);
    expect(db.invoice.create).not.toHaveBeenCalled();
  });

  it('refuses to create an invoice when there are no records', async () => {
    const { prisma, db } = prismaDouble();
    db.workplace.findFirst.mockResolvedValue(spa);
    db.transaction.findMany.mockResolvedValue([]);
    const service = new InvoicesService(prisma);

    await expect(service.create(user, { ...dayQuery, issuedOn: '01-05-2026' })).rejects.toThrow(
      'No records to invoice for this recipient and period',
    );
    expect(db.invoice.create).not.toHaveBeenCalled();
  });

  it('refuses to issue an invoice without a business address', async () => {
    const { prisma, db } = prismaDouble();
    db.workplace.findFirst.mockResolvedValue(spa);
    db.transaction.findMany.mockResolvedValue([swedish]);
    db.user.findUnique.mockResolvedValue({
      id: 4,
      addressLine1: null,
      addressLine2: null,
      town: null,
      postcode: null,
    });
    const service = new InvoicesService(prisma);

    await expect(service.create(user, { ...dayQuery, issuedOn: '01-05-2026' })).rejects.toThrow(
      'Add your business address before issuing an invoice',
    );
    expect(db.invoice.create).not.toHaveBeenCalled();
  });

  it('copies addresses onto a new invoice and does not create a transaction', async () => {
    const { prisma, db } = prismaDouble();
    db.workplace.findFirst.mockResolvedValue(spa);
    db.transaction.findMany.mockResolvedValue([swedish]);
    db.user.findUnique.mockResolvedValue({
      id: 4,
      addressLine1: '1 High Street',
      addressLine2: null,
      town: 'London',
      postcode: 'SW1A 1AA',
    });
    db.invoice.findMany.mockResolvedValue([]);
    db.invoice.create.mockResolvedValue(issuedInvoice());
    const service = new InvoicesService(prisma);

    const created = await service.create(user, { ...dayQuery, issuedOn: '01-05-2026' });

    expect(created.amountPence).toBe(6700);
    expect(created.status).toBe('issued');
    expect(created.number).toBe('TT-0001');
    expect(db.invoice.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          amountPence: 6700,
          number: 'TT-0001',
          status: 'issued',
          supplierAddressLine1: '1 High Street',
          recipientAddressLine1: '4 Spa Lane',
          lines: {
            create: [
              expect.objectContaining({ kind: 'service', amountPence: 6000 }),
              expect.objectContaining({ kind: 'additional_fee', amountPence: 200 }),
              expect.objectContaining({ kind: 'bonus', amountPence: 500 }),
            ],
          },
        }),
      }),
    );
    expect(db.transaction.create).not.toHaveBeenCalled();
  });

  it('marks an invoice paid without creating income', async () => {
    const { prisma, db } = prismaDouble();
    const issued = issuedInvoice();
    db.invoice.findFirst.mockResolvedValue(issued);
    db.invoice.update.mockResolvedValue({
      ...issued,
      status: 'paid',
      paidOn: new Date(Date.UTC(2026, 4, 2)),
    });
    const service = new InvoicesService(prisma);

    const paid = await service.pay(user, 20, { status: 'paid', paidOn: '02-05-2026' });

    expect(paid.status).toBe('paid');
    expect(paid.paidOn).toBe('02-05-2026');
    expect(db.transaction.create).not.toHaveBeenCalled();
  });

  it('rejects a second payment', async () => {
    const { prisma, db } = prismaDouble();
    db.invoice.findFirst.mockResolvedValue(issuedInvoice('paid'));
    const service = new InvoicesService(prisma);

    await expect(service.pay(user, 20, { status: 'paid', paidOn: '02-05-2026' })).rejects.toThrow(
      'Invoice is already paid',
    );
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it('scopes a clinic preview to that workplace id', async () => {
    const { prisma, db } = prismaDouble();
    db.workplace.findFirst.mockResolvedValue({
      id: 8,
      name: 'City Clinic',
      kind: 'clinic',
      addressLine1: '1 Clinic Road',
      addressLine2: null,
      town: 'Manchester',
      postcode: 'M1 1AE',
    });
    db.transaction.findMany.mockResolvedValue([]);
    const service = new InvoicesService(prisma);

    const preview = await service.preview(user, {
      recipientKind: 'clinic',
      workplaceId: 8,
      period: 'day',
      date: '01-05-2026',
    });

    expect(preview.lines).toEqual([]);
    expect(db.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ workplaceId: 8 }),
      }),
    );
  });
});

import { ConflictException, NotFoundException } from '@nestjs/common';
import type { PublicUser } from '../auth/public-user.js';
import { prismaDouble } from '../../test/prisma-stub.js';
import { ClientsService } from './clients.service.js';

const user: PublicUser = {
  id: 4,
  email: 'ada@example.com',
  name: 'Ada',
  practiceType: 'mobile',
  expenseMethod: 'flat_rate',
  onboardedAt: '2026-04-06T12:00:00.000Z',
};

const createdAt = new Date('2026-05-01T10:00:00.000Z');

const input = {
  name: 'Ada Client',
  hourRatePence: 2500,
  addressLine1: '12 High Street',
  town: 'London',
  postcode: 'SW1A 1AA',
};

function clientRow(id = 6) {
  return {
    id,
    name: 'Ada Client',
    hourRatePence: 2500,
    hourExtras: [],
    addressLine1: '12 High Street',
    addressLine2: null,
    town: 'London',
    postcode: 'SW1A 1AA',
    createdAt,
    updatedAt: createdAt,
  };
}

describe('ClientsService', () => {
  it('saves a client for this user', async () => {
    const { prisma, db } = prismaDouble();
    db.client.findFirst.mockResolvedValue(null);
    db.client.create.mockResolvedValue(clientRow());
    const service = new ClientsService(prisma);

    const created = await service.create(user, input);

    expect(created.name).toBe('Ada Client');
    expect(created.postcode).toBe('SW1A 1AA');
    expect(created.hourExtras).toEqual([]);
    expect(db.client.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 4, name: 'Ada Client', hourRatePence: 2500 }),
      }),
    );
  });

  it('rejects the same name ignoring case', async () => {
    const { prisma, db } = prismaDouble();
    db.client.findFirst.mockResolvedValue(clientRow());
    const service = new ClientsService(prisma);

    await expect(service.create(user, { ...input, name: 'ada client' })).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(db.client.findFirst).toHaveBeenCalledWith({
      where: {
        userId: 4,
        name: { equals: 'ada client', mode: 'insensitive' },
      },
    });
    expect(db.client.create).not.toHaveBeenCalled();
  });

  it('lists only this user, ordered by name then id', async () => {
    const { prisma, db } = prismaDouble();
    db.client.findMany.mockResolvedValue([clientRow()]);
    db.client.count.mockResolvedValue(1);
    const service = new ClientsService(prisma);

    const page = await service.list(user, {});

    expect(page.items.map((item) => item.id)).toEqual([6]);
    expect(db.client.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 4 },
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
      }),
    );
  });

  it('returns 404 for another user id', async () => {
    const { prisma, db } = prismaDouble();
    db.client.findFirst.mockResolvedValue(null);
    const service = new ClientsService(prisma);

    await expect(service.findOne(user, 9)).rejects.toThrow('Client 9 not found');
    await expect(service.findOne(user, 9)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('refuses to delete a client used by a record', async () => {
    const { prisma, db } = prismaDouble();
    db.client.findFirst.mockResolvedValue(clientRow());
    db.transaction.count.mockResolvedValue(1);
    db.invoice.count.mockResolvedValue(0);
    const service = new ClientsService(prisma);

    await expect(service.remove(user, 6)).rejects.toThrow('Client is used by a record');
    expect(db.client.delete).not.toHaveBeenCalled();
  });

  it('deletes a client that nothing references', async () => {
    const { prisma, db } = prismaDouble();
    db.client.findFirst.mockResolvedValue(clientRow());
    db.transaction.count.mockResolvedValue(0);
    db.invoice.count.mockResolvedValue(0);
    db.client.delete.mockResolvedValue(clientRow());
    const service = new ClientsService(prisma);

    await service.remove(user, 6);

    expect(db.client.delete).toHaveBeenCalledWith({ where: { id: 6 } });
  });
});

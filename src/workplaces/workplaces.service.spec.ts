import { NotFoundException } from '@nestjs/common';
import type { PublicUser } from '../auth/public-user.js';
import { prismaDouble } from '../../test/prisma-stub.js';
import { WorkplacesService } from './workplaces.service.js';

const user: PublicUser = {
  id: 4,
  email: 'ada@example.com',
  name: 'Ada',
  practiceType: 'mobile',
  expenseMethod: 'flat_rate',
  onboardedAt: '2026-04-06T12:00:00.000Z',
};

const createdAt = new Date('2026-05-01T10:00:00.000Z');

const address = {
  addressLine1: '4 Spa Lane',
  town: 'Leeds',
  postcode: 'LS1 4AP',
};

function workplaceRow(id = 3) {
  return {
    id,
    name: 'North Spa',
    kind: 'spa' as const,
    hourRatePence: 2500,
    hourExtras: [
      { massageType: 'pregnancy', customMassageType: null, extraPence: 200 },
      { massageType: 'request', customMassageType: null, extraPence: 200 },
      { massageType: 'body_scrub', customMassageType: null, extraPence: 500 },
    ],
    addressLine1: '4 Spa Lane',
    addressLine2: null,
    town: 'Leeds',
    postcode: 'LS1 4AP',
    createdAt,
    updatedAt: createdAt,
  };
}

const input = {
  name: 'North Spa',
  kind: 'spa' as const,
  hourRatePence: 2500,
  ...address,
  hourExtras: [
    { massageType: 'pregnancy', extraPence: 200 },
    { massageType: 'request', extraPence: 200 },
    { massageType: 'body_scrub', extraPence: 500 },
  ],
};

describe('WorkplacesService', () => {
  it('saves a workplace and sorts hour extras', async () => {
    const { prisma, db } = prismaDouble();
    db.workplace.findFirst.mockResolvedValue(null);
    db.workplace.create.mockResolvedValue(workplaceRow());
    const service = new WorkplacesService(prisma);

    const created = await service.create(user, input);

    expect(created.hourRatePence).toBe(2500);
    expect(created.postcode).toBe('LS1 4AP');
    expect(created.hourExtras.map((extra) => extra.massageType)).toEqual([
      'pregnancy',
      'body_scrub',
      'request',
    ]);
    expect(db.workplace.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 4, name: 'North Spa', kind: 'spa' }),
      }),
    );
  });

  it('rejects the same name with different capital letters', async () => {
    const { prisma, db } = prismaDouble();
    db.workplace.findFirst.mockResolvedValue(workplaceRow());
    const service = new WorkplacesService(prisma);

    await expect(service.create(user, { ...input, name: 'north spa' })).rejects.toThrow(
      'Workplace already saved',
    );
    expect(db.workplace.findFirst).toHaveBeenCalledWith({
      where: {
        userId: 4,
        kind: 'spa',
        name: { equals: 'north spa', mode: 'insensitive' },
      },
    });
    expect(db.workplace.create).not.toHaveBeenCalled();
  });

  it('lists only this user, ordered by name then id', async () => {
    const { prisma, db } = prismaDouble();
    db.workplace.findMany.mockResolvedValue([workplaceRow()]);
    db.workplace.count.mockResolvedValue(1);
    const service = new WorkplacesService(prisma);

    const page = await service.list(user, {});

    expect(page.total).toBe(1);
    expect(page.items[0]?.id).toBe(3);
    expect(db.workplace.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 4 },
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
      }),
    );
  });

  it('hides another user workplace id', async () => {
    const { prisma, db } = prismaDouble();
    db.workplace.findFirst.mockResolvedValue(null);
    const service = new WorkplacesService(prisma);

    await expect(service.update(user, 9, { ...input, name: 'Other' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.update(user, 9, { ...input, name: 'Other' })).rejects.toThrow(
      'Workplace 9 not found',
    );
  });
});

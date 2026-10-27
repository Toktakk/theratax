import type { PublicUser } from '../auth/public-user.js';
import { prismaDouble } from '../../test/prisma-stub.js';
import { IncomeSummaryService } from './income-summary.service.js';

const user: PublicUser = {
  id: 4,
  email: 'ada@example.com',
  name: 'Ada',
  practiceType: 'mobile',
  expenseMethod: 'flat_rate',
  onboardedAt: '2026-04-06T12:00:00.000Z',
};

describe('IncomeSummaryService', () => {
  it('loads the day and totals base, fee, and bonus once', async () => {
    const { prisma, db } = prismaDouble();
    db.transaction.findMany.mockResolvedValue([
      {
        amountPence: 6700,
        basePence: 6000,
        additionalFeePence: 200,
        bonusPence: 500,
        massageType: 'swedish',
        customMassageType: null,
        workplaceId: 1,
      },
    ]);
    db.workplace.findMany.mockResolvedValue([{ id: 1, name: 'North Spa', kind: 'spa' }]);
    const service = new IncomeSummaryService(prisma);

    const summary = await service.summary(user, { date: '01-05-2026' });

    expect(summary.totalPence).toBe(6700);
    expect(summary.bonusPence).toBe(500);
    expect(summary.byMassageType).toHaveLength(1);
    expect(db.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: 4,
          type: 'income',
          occurredOn: new Date(Date.UTC(2026, 4, 1)),
        },
      }),
    );
    expect(db.workplace.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 4, id: { in: [1] } },
      }),
    );
  });
});

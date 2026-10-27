import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { PublicUser } from '../auth/public-user.js';
import { prismaDouble } from '../../test/prisma-stub.js';
import { TaxEngineService } from './tax-engine.service.js';

const user: PublicUser = {
  id: 4,
  email: 'ada@example.com',
  name: 'Ada',
  practiceType: 'mobile',
  expenseMethod: 'flat_rate',
  onboardedAt: '2026-04-06T12:00:00.000Z',
};

describe('TaxEngineService', () => {
  it('refuses a user who has not finished onboarding', async () => {
    const { prisma, db } = prismaDouble();
    const service = new TaxEngineService(prisma);

    await expect(
      service.summary(
        { ...user, practiceType: null, expenseMethod: null, onboardedAt: null },
        { taxYear: 2026 },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.invoiceLine.aggregate).not.toHaveBeenCalled();
  });

  it('rejects a tax year other than 2026-27', async () => {
    const { prisma } = prismaDouble();
    const service = new TaxEngineService(prisma);

    await expect(service.summary(user, { taxYear: 2025 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(service.summary(user, { taxYear: 2025 })).rejects.toThrow(
      'Only the 2026-27 tax year is supported',
    );
  });

  it('adds paid lines and baseline once and treats a null sum as zero', async () => {
    const { prisma, db } = prismaDouble();
    db.invoiceLine.aggregate.mockResolvedValue({ _sum: { amountPence: 6700 } });
    db.transaction.aggregate
      .mockResolvedValueOnce({ _sum: { amountPence: null } })
      .mockResolvedValueOnce({ _sum: { amountPence: null } });
    const service = new TaxEngineService(prisma);

    const summary = await service.summary(user, { taxYear: 2026 });

    expect(summary.incomePence).toBe(6700);
    expect(summary.allowableExpensesPence).toBe(0);
    expect(summary.netProfitPence).toBe(6700);
    expect(db.transaction.aggregate).toHaveBeenCalledTimes(2);
  });

  it('passes a £20,000 profit through the tax function', async () => {
    const { prisma, db } = prismaDouble();
    db.invoiceLine.aggregate.mockResolvedValue({ _sum: { amountPence: 2_000_000 } });
    db.transaction.aggregate.mockResolvedValue({ _sum: { amountPence: 0 } });
    const service = new TaxEngineService(prisma);

    const summary = await service.summary(user, { taxYear: 2026 });

    expect(summary.incomePence).toBe(2_000_000);
    expect(summary.incomeTaxPence).toBe(148_600);
    expect(summary.class4NationalInsurancePence).toBe(44_580);
    expect(summary.estimatedTaxOwedPence).toBe(193_180);
  });
});

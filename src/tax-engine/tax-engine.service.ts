import { BadRequestException, Injectable } from '@nestjs/common';
import { assertOnboarded } from '../auth/assert-onboarded.js';
import type { PublicUser } from '../auth/public-user.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { todayCivilDate } from '../transactions/civil-date.js';
import { calculateTaxSummary, type TaxSummary } from './calculate-tax.js';
import type { TaxSummaryQueryDto } from './dto/tax-summary-query.dto.js';

const SUPPORTED_TAX_YEAR = 2026;
const PERIOD_START = new Date(Date.UTC(2026, 3, 6));
const PERIOD_END = new Date(Date.UTC(2027, 3, 5));

function taxYearContaining(now: Date): number {
  const [dayText, monthText, yearText] = todayCivilDate(now).split('-');
  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);
  if (month > 4 || (month === 4 && day >= 6)) {
    return year;
  }
  return year - 1;
}

@Injectable()
export class TaxEngineService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(user: PublicUser, query: TaxSummaryQueryDto): Promise<TaxSummary> {
    assertOnboarded(user);
    const taxYear = query.taxYear ?? taxYearContaining(new Date());
    if (taxYear !== SUPPORTED_TAX_YEAR) {
      throw new BadRequestException('Only the 2026-27 tax year is supported');
    }
    const [income, expenses, bonuses] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: {
          userId: user.id,
          type: 'income',
          occurredOn: { gte: PERIOD_START, lte: PERIOD_END },
        },
        _sum: { amountPence: true },
      }),
      this.prisma.transaction.aggregate({
        where: {
          userId: user.id,
          type: 'expense',
          occurredOn: { gte: PERIOD_START, lte: PERIOD_END },
        },
        _sum: { amountPence: true },
      }),
      this.prisma.hourlyBonus.aggregate({
        where: {
          userId: user.id,
          occurredOn: { gte: PERIOD_START, lte: PERIOD_END },
        },
        _sum: { totalPence: true },
      }),
    ]);
    return calculateTaxSummary({
      incomePence: (income._sum.amountPence ?? 0) + (bonuses._sum.totalPence ?? 0),
      allowableExpensesPence: expenses._sum.amountPence ?? 0,
      expenseMethod: user.expenseMethod,
    });
  }
}

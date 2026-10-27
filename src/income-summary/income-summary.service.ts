import { BadRequestException, Injectable } from '@nestjs/common';
import type { PublicUser } from '../auth/public-user.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { parseTaxYearDate, todayCivilDate } from '../transactions/civil-date.js';
import type { DailySummaryQueryDto } from './dto/daily-summary-query.dto.js';
import { summariseDay, type DailyIncomeSummary } from './summarise-day.js';

@Injectable()
export class IncomeSummaryService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(user: PublicUser, query: DailySummaryQueryDto): Promise<DailyIncomeSummary> {
    const dateText = query.date ?? todayCivilDate(new Date());
    const occurredOn = parseTaxYearDate(dateText);
    if (occurredOn === null) {
      throw new BadRequestException('Date is outside the 2026-27 tax year');
    }
    const incomes = await this.prisma.transaction.findMany({
      where: { userId: user.id, type: 'income', occurredOn },
      select: {
        amountPence: true,
        basePence: true,
        additionalFeePence: true,
        bonusPence: true,
        massageType: true,
        customMassageType: true,
        workplaceId: true,
      },
    });
    const workplaceIds = [
      ...new Set(incomes.flatMap((income) => (income.workplaceId === null ? [] : [income.workplaceId]))),
    ];
    const workplaces = await this.prisma.workplace.findMany({
      where: { userId: user.id, id: { in: workplaceIds } },
      select: { id: true, name: true, kind: true },
    });
    return summariseDay({
      date: dateText,
      incomes,
      workplaces,
    });
  }
}

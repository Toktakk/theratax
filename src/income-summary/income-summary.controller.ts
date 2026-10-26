import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { OnboardedGuard } from '../auth/onboarded.guard.js';
import type { PublicUser } from '../auth/public-user.js';
import { DailySummaryQueryDto } from './dto/daily-summary-query.dto.js';
import { IncomeSummaryService } from './income-summary.service.js';
import type { DailyIncomeSummary } from './summarise-day.js';

@Controller('income')
@UseGuards(AuthGuard, OnboardedGuard)
export class IncomeSummaryController {
  constructor(private readonly incomeSummaryService: IncomeSummaryService) {}

  @Get('summary')
  summary(
    @CurrentUser() user: PublicUser,
    @Query() query: DailySummaryQueryDto,
  ): Promise<DailyIncomeSummary> {
    return this.incomeSummaryService.summary(user, query);
  }
}

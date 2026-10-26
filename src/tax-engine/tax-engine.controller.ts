import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { PublicUser } from '../auth/public-user.js';
import { TaxSummaryQueryDto } from './dto/tax-summary-query.dto.js';
import { TaxEngineService } from './tax-engine.service.js';
import type { TaxSummary } from './calculate-tax.js';

@Controller('tax')
@UseGuards(AuthGuard)
export class TaxEngineController {
  constructor(private readonly taxEngineService: TaxEngineService) {}

  @Get('summary')
  summary(
    @CurrentUser() user: PublicUser,
    @Query() query: TaxSummaryQueryDto,
  ): Promise<TaxSummary> {
    return this.taxEngineService.summary(user, query);
  }
}

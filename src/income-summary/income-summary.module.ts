import { Module } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { AuthModule } from '../auth/auth.module.js';
import { OnboardedGuard } from '../auth/onboarded.guard.js';
import { IncomeSummaryController } from './income-summary.controller.js';
import { IncomeSummaryService } from './income-summary.service.js';

@Module({
  imports: [AuthModule],
  controllers: [IncomeSummaryController],
  providers: [IncomeSummaryService, AuthGuard, OnboardedGuard],
})
export class IncomeSummaryModule {}

import { Module } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { AuthModule } from '../auth/auth.module.js';
import { OnboardedGuard } from '../auth/onboarded.guard.js';
import { TransactionsController } from './transactions.controller.js';
import { TransactionsService } from './transactions.service.js';

@Module({
  imports: [AuthModule],
  controllers: [TransactionsController],
  providers: [TransactionsService, AuthGuard, OnboardedGuard],
})
export class TransactionsModule {}
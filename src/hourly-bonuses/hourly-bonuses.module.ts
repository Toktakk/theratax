import { Module } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { AuthModule } from '../auth/auth.module.js';
import { OnboardedGuard } from '../auth/onboarded.guard.js';
import { HourlyBonusesController } from './hourly-bonuses.controller.js';
import { HourlyBonusesService } from './hourly-bonuses.service.js';

@Module({
  imports: [AuthModule],
  controllers: [HourlyBonusesController],
  providers: [HourlyBonusesService, AuthGuard, OnboardedGuard],
})
export class HourlyBonusesModule {}

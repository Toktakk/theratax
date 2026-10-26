import { Module } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { AuthModule } from '../auth/auth.module.js';
import { OnboardedGuard } from '../auth/onboarded.guard.js';
import { WorkplacesController } from './workplaces.controller.js';
import { WorkplacesService } from './workplaces.service.js';

@Module({
  imports: [AuthModule],
  controllers: [WorkplacesController],
  providers: [WorkplacesService, AuthGuard, OnboardedGuard],
})
export class WorkplacesModule {}

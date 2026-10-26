import { Module } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { AuthModule } from '../auth/auth.module.js';
import { OnboardedGuard } from '../auth/onboarded.guard.js';
import { ClientsController } from './clients.controller.js';
import { ClientsService } from './clients.service.js';

@Module({
  imports: [AuthModule],
  controllers: [ClientsController],
  providers: [ClientsService, AuthGuard, OnboardedGuard],
})
export class ClientsModule {}

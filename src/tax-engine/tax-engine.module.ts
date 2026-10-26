import { Module } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { AuthModule } from '../auth/auth.module.js';
import { TaxEngineController } from './tax-engine.controller.js';
import { TaxEngineService } from './tax-engine.service.js';

@Module({
  imports: [AuthModule],
  controllers: [TaxEngineController],
  providers: [TaxEngineService, AuthGuard],
})
export class TaxEngineModule {}

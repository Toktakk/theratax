import { Module } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { AuthModule } from '../auth/auth.module.js';
import { ExpenseCategoriesController } from './expense-categories.controller.js';
import { ExpenseCategoriesService } from './expense-categories.service.js';

@Module({
  imports: [AuthModule],
  controllers: [ExpenseCategoriesController],
  providers: [ExpenseCategoriesService, AuthGuard],
})
export class ExpenseCategoriesModule {}
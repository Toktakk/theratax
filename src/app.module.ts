import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { ExpenseCategoriesModule } from './expense-categories/expense-categories.module.js';
import { TransactionsModule } from './transactions/transactions.module.js';

@Module({
  imports: [PrismaModule, AuthModule, ExpenseCategoriesModule, TransactionsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

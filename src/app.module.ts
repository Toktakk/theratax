import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { ExpenseCategoriesModule } from './expense-categories/expense-categories.module.js';
import { TaxEngineModule } from './tax-engine/tax-engine.module.js';
import { TransactionsModule } from './transactions/transactions.module.js';
import { UploadModule } from './upload/upload.module.js';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    ExpenseCategoriesModule,
    TransactionsModule,
    TaxEngineModule,
    UploadModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

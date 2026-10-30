import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { ExpenseCategoriesModule } from './expense-categories/expense-categories.module.js';
import { TaxEngineModule } from './tax-engine/tax-engine.module.js';
import { TransactionsModule } from './transactions/transactions.module.js';
import { UploadModule } from './upload/upload.module.js';
import { InvoicesModule } from './invoices/invoices.module.js';
import { WorkplacesModule } from './workplaces/workplaces.module.js';
import { IncomeSummaryModule } from './income-summary/income-summary.module.js';
import { ClientsModule } from './clients/clients.module.js';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    ExpenseCategoriesModule,
    TransactionsModule,
    TaxEngineModule,
    UploadModule,
    InvoicesModule,
    WorkplacesModule,
    IncomeSummaryModule,
    ClientsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}


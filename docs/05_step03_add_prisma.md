# Step 3 — Add Prisma

Guide: [Project plan](02_project_plans.md). Previous: [Step 2 — Open the database](04_step02_open_the_database.md). Next: [Step 4 — Enable ValidationPipe](06_step04_enable_validation_pipe.md).

## Why this step comes first

The tables are where users, money rows, and invoices are stored. If the app cannot connect yet, every later endpoint has nowhere to write. Having models is not the same as having routes. This step ends when the app boots, Prisma can reach the database, and `GET /` is still `Hello World!`.

## Not in this step

Do not create controllers for `auth`, `transactions`, `expense-categories`, `upload`, `invoices`, or `tax-engine`. Do not add `ValidationPipe` if an old draft does not already have it. Do not write the expense-category seed.

The whole set of models is placed in this step because they are tables, not endpoints. Creating them later, one table at a time, stacks migrations before you can check API behaviour.

## Concept

This project uses Prisma 7. The Prisma 6 shape that puts `url = env("DATABASE_URL")` in `schema.prisma` does not work in this repo. Three things have to be in place together.

1. In the schema, the `datasource` block has only `provider = "postgresql"`. The URL is not in this file.
2. `prisma.config.ts` at the project root tells the URL and where the migrations folder is. The Prisma CLI loads that name itself. A file named `prisma7.config.ts` is not loaded. Move the contents to `prisma.config.ts` and stop using the old name.
3. At runtime, `PrismaClient` must get the driver adapter `PrismaPg` from `@prisma/adapter-pg`. The generator is `prisma-client` and you must set `output` yourself. This lesson uses `../src/generated/prisma` so the generated code sits under `src/` and the app can import it.

`PrismaService` extends `PrismaClient`, then `$connect`s in `onModuleInit` and `$disconnect`s in `onModuleDestroy`. `PrismaModule` is `@Global()` so later domains can inject `PrismaService` without importing the module again everywhere.

`new PrismaClient` is allowed in one place: the `PrismaService` constructor. Everything else injects this service. A seed script that builds its own client breaks this rule. [Step 7](09_step07_expense_categories.md) therefore seeds through the injected service.

The packages this work uses are already in the project: `prisma`, `@prisma/client`, `@prisma/adapter-pg`, `pg`, `dotenv`. This step does not install a new package.

## Files for this step

- `prisma.config.ts` at the root
- `prisma/schema.prisma`
- `src/prisma/prisma.service.ts`
- `src/prisma/prisma.module.ts`
- `src/app.module.ts` so `imports` includes `PrismaModule`
- `src/main.ts` so the first line is `import 'dotenv/config';`, which puts `DATABASE_URL` from `.env` into `process.env` before the client is created
- The folder `prisma/migrations/` appears when you run migrate
- The folder `src/generated/prisma/` appears when you run generate. Do not edit files in there

`prisma.config.ts`

```ts
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env['DATABASE_URL'],
  },
});
```

`prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

enum PracticeType {
  mobile
  fixedLocation
  mixed
}

enum ExpenseMethod {
  flat_rate
  actual_cost
}

enum TransactionType {
  income
  expense
}

enum ExpenseCategoryKind {
  general
  mileage
  vehicle_actual
}

enum InvoiceStatus {
  issued
  paid
}

model User {
  id            Int            @id @default(autoincrement())
  email         String         @unique
  passwordHash  String
  name          String
  practiceType  PracticeType?
  expenseMethod ExpenseMethod?
  onboardedAt   DateTime?
  sessions      Session[]
  transactions  Transaction[]
  invoices      Invoice[]
}

model Session {
  id        Int      @id @default(autoincrement())
  token     String   @unique
  expiresAt DateTime
  userId    Int
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model ExpenseCategory {
  slug         String              @id
  name         String
  keywords     String[]
  kind         ExpenseCategoryKind
  transactions Transaction[]
}

model Transaction {
  id           Int              @id @default(autoincrement())
  type         TransactionType
  occurredOn   DateTime         @db.Date
  amountPence  Int
  note         String?
  miles        Int?
  userId       Int
  user         User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  categorySlug String?
  category     ExpenseCategory? @relation(fields: [categorySlug], references: [slug])
  invoiceId    Int?             @unique
  invoice      Invoice?         @relation(fields: [invoiceId], references: [id])
  receipt      Receipt?

  @@index([userId, occurredOn])
}

model Receipt {
  transactionId Int         @id
  contentType   String
  byteSize      Int
  storageKey    String
  transaction   Transaction @relation(fields: [transactionId], references: [id], onDelete: Cascade)
}

model Invoice {
  id          Int           @id @default(autoincrement())
  number      String
  clientName  String
  service     String
  amountPence Int
  issuedOn    DateTime      @db.Date
  status      InvoiceStatus @default(issued)
  paidOn      DateTime?     @db.Date
  userId      Int
  user        User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  transaction Transaction?

  @@unique([userId, number])
}
```

What the fields mean for the flow, even though the routes do not exist yet.

- `User.passwordHash` stores the bcrypt result. There is no column for the raw password, and it never appears in JSON.
- `practiceType` and `expenseMethod` stay null until onboarding finishes. `practiceType` records whether the therapist travels, works in a clinic, or does both. It does not change which categories the server accepts.
- `expenseMethod` applies to vehicle costs only. `flat_rate` is HMRC simplified mileage. `actual_cost` means the user types the deductible amount themselves. Massage oils, HCPC, insurance, and laundry are always amounts the user types.
- `onboardedAt` is the gate for the feed. If it is still null, step 1 of the user flow is not finished. This field is a `DateTime` in the database and is converted to ISO 8601 in the response.
- `Session` stores an opaque token that lasts 7 days. This row is what `Authorization: Bearer` looks up in [step 6](08_step06_register_login_onboarding.md). Deleting a user deletes the sessions through `onDelete: Cascade`.
- `ExpenseCategory.slug` is the key, because the contract refers to a category by slug, not by a number. `keywords` is an array of strings so the web page can hint by itself. `kind` separates a general category, the mileage category, and the actual-cost vehicle category.
- `Transaction.amountPence` is always an integer, even for a mileage row whose amount the server calculates in [step 8](10_step08_log_income_and_expenses.md). `occurredOn` is `@db.Date` because it is a calendar day, not an hour. `miles` has a value only on a mileage row. `invoiceId` has a value only on income created when an invoice is paid, and it is `@unique` because one invoice can have only one income row.
- The index `[userId, occurredOn]` supports the feed that reads that user's rows ordered by day.
- `Receipt` is one row per transaction. The key is `transactionId`. `storageKey` is the file's address in private storage. The URL is not stored, because the link lasts 15 minutes and is created when it is requested.
- `Invoice.number` is unique within one user (`TT-0001`, `TT-0002`). `status` starts at `issued`. Creating an invoice does not create an income row. `paidOn` stays empty until it is paid.

`src/prisma/prisma.service.ts`

```ts
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

function databaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (url === undefined || url.length === 0) {
    throw new Error('DATABASE_URL is not set');
  }
  return url;
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const adapter = new PrismaPg({ connectionString: databaseUrl() });
    super({ adapter });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
```

`src/prisma/prisma.module.ts`

```ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

In `AppModule`, put `PrismaModule` in `imports` next to the existing controller.

```ts
import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

`import 'dotenv/config'` must be the first line of `main.ts`, before `NestFactory.create`, because the `PrismaService` constructor reads `process.env.DATABASE_URL` when the module is created.

## Commands you run

Postgres from [step 2](04_step02_open_the_database.md) must already be accepting connections.

```bash
npx prisma generate
npx prisma migrate dev --name init
```

If the repo already has a `prisma/migrations` folder and this database has already been migrated, `migrate dev` will say nothing changed, or it will ask you to name an empty migration. In that case use the status check below. Do not create `init` again.

Then restart `npm run start:dev`. The app must boot until it is listening. If `DATABASE_URL` is wrong, `onModuleInit` fails before the app says it is ready.

```bash
npx prisma migrate status
docker compose exec postgres psql -U theratax -d theratax_dev -c '\dt'
```

From Postman

```text
GET {{baseUrl}}/
```

## What you must see

`prisma generate` creates the folder `src/generated/prisma/`, and `client.ts` is in there so you can import it.

`migrate status` says the schema matches the database. There is no pending migration.

Postman gets `Hello World!`. The Nest log has no error about failing to connect to the database.

`\dt` shows the tables `User`, `Session`, `ExpenseCategory`, `Transaction`, `Receipt`, `Invoice`. The category table may still be empty. [Step 7](09_step07_expense_categories.md) inserts the 7 rows.

There is no new path yet. Sending `POST {{baseUrl}}/auth/register` with an empty body must not yet be product behaviour. If an old draft already has this route, treat it as belonging to [step 6](08_step06_register_login_onboarding.md) and do not use it as the pass check for step 3.

## If it fails

- The CLI cannot find `DATABASE_URL`: check that the file is named `prisma.config.ts` at the root and that it has `import 'dotenv/config'`. The name `prisma7.config.ts` is not read.
- `P1001` or connection refused: go back to the `pg_isready` command in [step 2](04_step02_open_the_database.md). The URL in `.env` must point at `localhost:5432`.
- After generate, the import `../generated/prisma/client.js` cannot be found: `output` in the schema must be `../src/generated/prisma`, then run generate again. Do not edit the generated files.
- The app cannot boot because the constructor throws `DATABASE_URL is not set`: `main.ts` is not loading dotenv before `AppModule` is created.
- Migrate says the database has drifted ahead of the schema: do not use `migrate reset` if you still want data you already inserted. Read the CLI message and stop to ask before deleting the volume.

**Pass this step, then continue.**

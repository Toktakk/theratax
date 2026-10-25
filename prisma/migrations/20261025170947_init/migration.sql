-- CreateEnum
CREATE TYPE "PracticeType" AS ENUM ('mobile', 'fixedLocation', 'mixed');

-- CreateEnum
CREATE TYPE "ExpenseMethod" AS ENUM ('flat_rate', 'actual_cost');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('income', 'expense');

-- CreateEnum
CREATE TYPE "ExpenseCategoryKind" AS ENUM ('general', 'mileage', 'vehicle_actual');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('issued', 'paid');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "practiceType" "PracticeType",
    "expenseMethod" "ExpenseMethod",
    "onboardedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseCategory" (
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keywords" TEXT[],
    "kind" "ExpenseCategoryKind" NOT NULL,

    CONSTRAINT "ExpenseCategory_pkey" PRIMARY KEY ("slug")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" SERIAL NOT NULL,
    "type" "TransactionType" NOT NULL,
    "occurredOn" DATE NOT NULL,
    "amountPence" INTEGER NOT NULL,
    "note" TEXT,
    "miles" INTEGER,
    "userId" INTEGER NOT NULL,
    "categorySlug" TEXT,
    "invoiceId" INTEGER,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Receipt" (
    "transactionId" INTEGER NOT NULL,
    "contentType" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,

    CONSTRAINT "Receipt_pkey" PRIMARY KEY ("transactionId")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" SERIAL NOT NULL,
    "number" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "amountPence" INTEGER NOT NULL,
    "issuedOn" DATE NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'issued',
    "paidOn" DATE,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_invoiceId_key" ON "Transaction"("invoiceId");

-- CreateIndex
CREATE INDEX "Transaction_userId_occurredOn_idx" ON "Transaction"("userId", "occurredOn");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_userId_number_key" ON "Invoice"("userId", "number");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_categorySlug_fkey" FOREIGN KEY ("categorySlug") REFERENCES "ExpenseCategory"("slug") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

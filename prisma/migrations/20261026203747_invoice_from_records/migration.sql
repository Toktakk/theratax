-- CreateEnum
CREATE TYPE "InvoiceRecipientKind" AS ENUM ('spa', 'clinic', 'client');

-- CreateEnum
CREATE TYPE "InvoicePeriod" AS ENUM ('day', 'month');

-- CreateEnum
CREATE TYPE "InvoiceLineKind" AS ENUM ('service', 'additional_fee', 'hourly_bonus');

-- CreateEnum
CREATE TYPE "QuantityUnit" AS ENUM ('session', 'minute');

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "clientId" INTEGER,
ADD COLUMN     "period" "InvoicePeriod",
ADD COLUMN     "periodEnd" DATE,
ADD COLUMN     "periodStart" DATE,
ADD COLUMN     "recipientKind" "InvoiceRecipientKind",
ADD COLUMN     "recipientName" TEXT,
ADD COLUMN     "workplaceId" INTEGER,
ALTER COLUMN "clientName" DROP NOT NULL,
ALTER COLUMN "service" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "clientId" INTEGER;

-- CreateTable
CREATE TABLE "Client" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceLine" (
    "id" SERIAL NOT NULL,
    "kind" "InvoiceLineKind" NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "quantityUnit" "QuantityUnit" NOT NULL,
    "ratePence" INTEGER NOT NULL,
    "amountPence" INTEGER NOT NULL,
    "occurredOn" DATE NOT NULL,
    "sourceTransactionId" INTEGER,
    "sourceBonusId" INTEGER,
    "invoiceId" INTEGER NOT NULL,

    CONSTRAINT "InvoiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Client_userId_idx" ON "Client"("userId");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_workplaceId_fkey" FOREIGN KEY ("workplaceId") REFERENCES "Workplace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_sourceTransactionId_fkey" FOREIGN KEY ("sourceTransactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_sourceBonusId_fkey" FOREIGN KEY ("sourceBonusId") REFERENCES "HourlyBonus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

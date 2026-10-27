-- AlterEnum
ALTER TYPE "InvoiceLineKind" ADD VALUE 'bonus';

-- Case-insensitive names so "Ada" and "ada" cannot both be saved
CREATE EXTENSION IF NOT EXISTS citext;

ALTER TABLE "Client" ALTER COLUMN "name" SET DATA TYPE CITEXT;

CREATE UNIQUE INDEX "Client_userId_name_key" ON "Client"("userId", "name");

ALTER TABLE "Workplace" ALTER COLUMN "name" SET DATA TYPE CITEXT;

CREATE UNIQUE INDEX "Workplace_userId_kind_name_key" ON "Workplace"("userId", "kind", "name");

-- One service, fee, or bonus line per source transaction
CREATE UNIQUE INDEX "InvoiceLine_sourceTransactionId_kind_key" ON "InvoiceLine"("sourceTransactionId", "kind");

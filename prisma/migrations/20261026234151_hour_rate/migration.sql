-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "hourRatePence" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pregnancyExtraPence" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "bonusPence" INTEGER,
ADD COLUMN     "minutes" INTEGER;

-- AlterTable
ALTER TABLE "Workplace" ADD COLUMN     "hourRatePence" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pregnancyExtraPence" INTEGER NOT NULL DEFAULT 0;

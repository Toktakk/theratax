-- AlterEnum
CREATE TYPE "MassageType_new" AS ENUM ('deep_tissue', 'thai_oil', 'thai_yoga', 'aroma', 'pregnancy', 'lymphatic', 'foot', 'swedish', 'back_neck', 'sport', 'hot_stone', 'body_scrub', 'request', 'other');

ALTER TABLE "Transaction" ALTER COLUMN "massageType" TYPE "MassageType_new" USING ("massageType"::text::"MassageType_new");

ALTER TYPE "MassageType" RENAME TO "MassageType_old";
ALTER TYPE "MassageType_new" RENAME TO "MassageType";
DROP TYPE "MassageType_old";

-- CreateTable
CREATE TABLE "HourExtra" (
    "id" SERIAL NOT NULL,
    "massageType" "MassageType" NOT NULL,
    "customMassageType" TEXT,
    "extraPence" INTEGER NOT NULL,
    "workplaceId" INTEGER,
    "clientId" INTEGER,

    CONSTRAINT "HourExtra_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HourExtra_workplaceId_idx" ON "HourExtra"("workplaceId");

-- CreateIndex
CREATE INDEX "HourExtra_clientId_idx" ON "HourExtra"("clientId");

-- AddForeignKey
ALTER TABLE "HourExtra" ADD CONSTRAINT "HourExtra_workplaceId_fkey" FOREIGN KEY ("workplaceId") REFERENCES "Workplace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HourExtra" ADD CONSTRAINT "HourExtra_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Copy existing pregnancy extras before the column is dropped
INSERT INTO "HourExtra" ("massageType", "extraPence", "workplaceId")
SELECT 'pregnancy', "pregnancyExtraPence", "id"
FROM "Workplace"
WHERE "pregnancyExtraPence" > 0;

INSERT INTO "HourExtra" ("massageType", "extraPence", "clientId")
SELECT 'pregnancy', "pregnancyExtraPence", "id"
FROM "Client"
WHERE "pregnancyExtraPence" > 0;

-- AlterTable
ALTER TABLE "Workplace" DROP COLUMN "pregnancyExtraPence";

-- AlterTable
ALTER TABLE "Client" DROP COLUMN "pregnancyExtraPence";

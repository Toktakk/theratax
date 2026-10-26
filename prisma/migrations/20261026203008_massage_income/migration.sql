/*
  Warnings:

  - Added the required column `updatedAt` to the `Transaction` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "MassageType" AS ENUM ('deep_tissue', 'thai_oil', 'thai_yoga', 'aroma', 'pregnancy', 'lymphatic', 'foot', 'swedish', 'back_neck', 'sport', 'hot_stone', 'other');

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "additionalFeePence" INTEGER,
ADD COLUMN     "basePence" INTEGER,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "customMassageType" TEXT,
ADD COLUMN     "massageType" "MassageType",
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "workplaceId" INTEGER;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_workplaceId_fkey" FOREIGN KEY ("workplaceId") REFERENCES "Workplace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

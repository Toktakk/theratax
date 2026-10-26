-- CreateEnum
CREATE TYPE "WorkplaceKind" AS ENUM ('spa', 'clinic');

-- CreateTable
CREATE TABLE "Workplace" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "WorkplaceKind" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "Workplace_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Workplace_userId_idx" ON "Workplace"("userId");

-- AddForeignKey
ALTER TABLE "Workplace" ADD CONSTRAINT "Workplace_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

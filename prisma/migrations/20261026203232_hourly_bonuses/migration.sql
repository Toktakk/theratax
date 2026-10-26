-- CreateTable
CREATE TABLE "HourlyBonus" (
    "id" SERIAL NOT NULL,
    "occurredOn" DATE NOT NULL,
    "eligibleMinutes" INTEGER NOT NULL,
    "ratePencePerHour" INTEGER NOT NULL,
    "totalPence" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,
    "workplaceId" INTEGER NOT NULL,

    CONSTRAINT "HourlyBonus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HourlyBonus_userId_occurredOn_idx" ON "HourlyBonus"("userId", "occurredOn");

-- CreateIndex
CREATE UNIQUE INDEX "HourlyBonus_userId_workplaceId_occurredOn_key" ON "HourlyBonus"("userId", "workplaceId", "occurredOn");

-- AddForeignKey
ALTER TABLE "HourlyBonus" ADD CONSTRAINT "HourlyBonus_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HourlyBonus" ADD CONSTRAINT "HourlyBonus_workplaceId_fkey" FOREIGN KEY ("workplaceId") REFERENCES "Workplace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Bonus lives on the massage transaction. The unused bonus table and its invoice-line link go away.
ALTER TABLE "InvoiceLine" DROP CONSTRAINT "InvoiceLine_sourceBonusId_fkey";

ALTER TABLE "InvoiceLine" DROP COLUMN "sourceBonusId";

DROP TABLE "HourlyBonus";

UPDATE "User" SET email = lower(btrim(email));

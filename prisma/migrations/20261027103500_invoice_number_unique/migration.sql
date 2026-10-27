-- Give repeated TT-0001 rows the next free numbers, then require every number to be unique.
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY number ORDER BY id) AS copy_rank
  FROM "Invoice"
),
extras AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS extra_rank
  FROM ranked
  WHERE copy_rank > 1
),
max_seq AS (
  SELECT COALESCE(MAX(CAST(SUBSTRING(number FROM 4) AS INTEGER)), 0) AS max_n
  FROM "Invoice"
  WHERE number ~ '^TT-[0-9]+$'
)
UPDATE "Invoice" AS invoice
SET number = 'TT-' || LPAD((max_seq.max_n + extras.extra_rank)::text, 4, '0')
FROM extras
CROSS JOIN max_seq
WHERE invoice.id = extras.id;

UPDATE "Transaction" AS entry
SET note = invoice.number
FROM "Invoice" AS invoice
WHERE entry."invoiceId" = invoice.id
  AND entry.note LIKE 'TT-%'
  AND entry.note <> invoice.number;

DROP INDEX "Invoice_userId_number_key";

CREATE UNIQUE INDEX "Invoice_number_key" ON "Invoice"("number");

CREATE INDEX "Invoice_userId_idx" ON "Invoice"("userId");

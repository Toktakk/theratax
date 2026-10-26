# Step 17 — Invoices from records

Guide: [Project plan](02_project_plans.md). Previous: [Step 16 — Daily income summary](18_step16_daily_income_summary.md).

## Why this step comes first

A therapist bills a spa, a clinic, or a client for a day or a month. The money was already recorded on the feed, including each row's additional fee and bonus. This step reads those rows and stores a snapshot. It must not create a second income transaction for the same work.

Depends on [step 11](13_step11_invoices_and_pdf.md) for the invoice table, the PDF function, and pay. Depends on [step 14](16_step14_massage_income.md) and [step 15](17_step15_bonus.md) for the rows that can be billed. The React invoice page stays `client/src/pages/InvoicePage.tsx`. Do not add a route, and do not rewrite that page in this step. Until the page is updated it will still send the old body, and that body will get `400`. The target screen is [the invoice page plan](25_page_invoice.md).

## Not in this step

Do not email the PDF. Do not add VAT. Do not add a recurring invoice. Those stay in Phase 2. Do not add the invoice total into the daily summary or into the tax function. Tax already counts the source income through `amountPence`, and that amount already includes the bonus. Do not add `bonusPence` again.

## Concept

Earned income is the transaction. The bonus is `bonusPence` on that transaction. An invoice is the bill. [Step 11](13_step11_invoices_and_pdf.md) created an income row when an invoice was paid. Stop doing that for a new invoice. Invoices already paid keep the income row they have. `PATCH` sets `status` and `paidOn` only.

A transaction that has `invoiceId` stays immutable: `409` `Invoice income is changed by updating the invoice`. New invoices do not set `invoiceId` on the source. The source stays editable. The issued lines do not change when the source changes.

Add a client, optional `clientId` on `Transaction`, and snapshot columns. Existing invoice rows keep `clientName`, `service`, and `amountPence`. New columns are optional so those rows still load.

```prisma
enum InvoiceRecipientKind {
  spa
  clinic
  client
}

enum InvoicePeriod {
  day
  month
}

enum InvoiceLineKind {
  service
  additional_fee
  bonus
}

enum QuantityUnit {
  session
}

model Client {
  id        Int      @id @default(autoincrement())
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  userId    Int
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

model InvoiceLine {
  id                  Int           @id @default(autoincrement())
  kind                InvoiceLineKind
  description         String
  quantity            Int
  quantityUnit        QuantityUnit
  ratePence           Int
  amountPence         Int
  occurredOn          DateTime      @db.Date
  sourceTransactionId Int?
  invoiceId           Int
  invoice             Invoice       @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  sourceTransaction   Transaction?  @relation(fields: [sourceTransactionId], references: [id], onDelete: SetNull)
}
```

On `Invoice`, add optional `recipientKind`, `recipientName`, `workplaceId`, `clientId`, `period`, `periodStart`, and `periodEnd`. On `Transaction`, add optional `clientId`. Wire the relations. Deleting a source sets the line's source id to null and leaves the line amounts stored.

There is no `sourceBonusId`. There is no `hourly_bonus` kind and no `minute` unit. Do not read `HourlyBonus` when you build lines.

You run the migration. Do not reset the database.

```bash
npx prisma migrate dev --name invoice_from_records
```

### Clients

`POST /clients` takes `{ name }`, trimmed to 1–200 characters. The same user and the same name ignoring case is `409` `Client already saved`. `GET /clients` uses the list envelope, ordered by `name` ascending, then `id` ascending. `GET /clients/:id` returns one. A missing id and another user's id are `404` `Client <id> not found`.

`PATCH /clients/:id` takes `{ name }`. A rename does not change `recipientName` on an invoice that was already issued. `DELETE` is `204`. A client that a transaction or an invoice still uses is `409` `Client is used by a record`.

Income may set `workplaceId` or `clientId`, not both. Both is `400` `Income refers to a workplace or a client, not both`. Another user's client is `404` `Client <id> not found`. `clientId` on an expense is `400` `Client is only valid on income`.

### Which rows can be billed

`GET /invoices/preview` is a query. `POST /invoices` is JSON. They take the same fields. Register the preview route before `GET /invoices/:id`.

```ts
interface InvoiceFromRecords {
  recipientKind: 'spa' | 'clinic' | 'client';
  workplaceId?: number;
  clientId?: number;
  period: 'day' | 'month';
  date?: string;
  month?: number;
  year?: number;
  issuedOn?: string;
}
```

A spa or a clinic requires `workplaceId` and no `clientId`. A client requires `clientId` and no `workplaceId`. The other id is `400` `Recipient does not take that id`. The workplace's `kind` must equal `recipientKind`, or the message is `Workplace kind does not match recipient`. An id the user does not own is `404` with `Workplace <id> not found` or `Client <id> not found`.

`period` `day` requires `date`. That civil date is both `periodStart` and `periodEnd`. `period` `month` requires `month` from 1 to 12 and `year`. The bounds are the first and last day of that month, clipped to `06-04-2026` through `05-04-2027`. A date or a month with no day inside that window is `400` `Date is outside the 2026-27 tax year`. An omitted `issuedOn` is today in `Europe/London`, and it uses the same window. It may differ from the period.

Eligible income is this user's `income` rows inside the clipped period, with no `invoiceId`, not already referenced by an invoice line, and matching the recipient (`workplaceId` or `clientId`). Expenses are never eligible. The row's fee and bonus are billed with that row, for a spa, a clinic, or a client. There is no second source of bonus lines.

The line builder is a pure function in `src/invoices/invoice-lines.ts`. Order lines by `occurredOn` ascending, then service, then additional fee, then bonus. That order is the breakdown by date for a month.

- Service: quantity `1`, unit `session`, rate and amount are `basePence` when it is set, otherwise `amountPence`. The description is the massage name from [step 14](16_step14_massage_income.md), the custom text when the type is `other`, or `Income` when there is no massage type.
- Additional fee: only when `additionalFeePence` is greater than 0. Quantity `1`, unit `session`, rate and amount are the fee. The description is `Additional Massage Fee`.
- Bonus: only when `bonusPence` is greater than 0. Quantity `1`, unit `session`, rate and amount are `bonusPence`. The description is `Bonus`.

`amountPence` on the invoice is the sum of the line amounts. The client cannot send it. The bonus is in that sum once. `recipientName` is the workplace or client name copied now.

Preview returns `200` and writes nothing. An empty set is `200` with `lines: []` and `amountPence: 0`. `POST` of an empty set is `400` `No records to invoice for this recipient and period`. `POST` of a non-empty set returns `201`, status `issued`, number `TT-` plus at least four digits, and the lines stored. A later preview or create skips those sources.

`GET /invoices` and `GET /invoices/:id` return the new fields when the row has them. A baseline row still returns `clientName` and `service`, and `transactionId` when step 11 linked one. A new row omits `clientName` and `service`. It has no `transactionId`.

`PATCH` is still only `{ status: "paid", paidOn? }`. `paidOn` defaults to today, must be on or after `issuedOn`, and must sit in the tax year. Otherwise `400` `paidOn is before issuedOn` or the tax-year message. The handler does not create a transaction. That includes a baseline invoice that is still unpaid. A second pay is `409` `Invoice is already paid`.

`GET /invoices/:id/pdf` keeps `200`, `Content-Type: application/pdf`, and `Content-Disposition: attachment; filename="<number>.pdf"`. Extend `invoicePdfLines` so an invoice with lines draws the recipient, the period, each line's description, quantity, rate, and amount, and the total. A baseline invoice with no lines still draws the single client, service, and amount. The test locks the text from that function. It does not read the PDF bytes for words. `buildInvoicePdf` still returns bytes that start with `%PDF`.

Bearer and onboarding match step 11. Another user's invoice id is `404` `Invoice <id> not found`.

## Files for this step

- `prisma/schema.prisma`
- `src/clients/dto/create-client.dto.ts`
- `src/clients/dto/update-client.dto.ts`
- `src/clients/dto/list-clients-query.dto.ts`
- `src/clients/clients.service.ts`
- `src/clients/clients.controller.ts`
- `src/clients/clients.module.ts`
- `src/invoices/invoice-lines.ts`
- `src/invoices/invoice-lines.spec.ts`
- `src/invoices/invoice-pdf.ts` and `src/invoices/invoice-pdf.spec.ts`
- `src/invoices/dto/create-invoice.dto.ts` replaced by the period body
- `src/invoices/dto/preview-invoice-query.dto.ts`
- `src/invoices/invoices.service.ts`
- `src/invoices/invoices.controller.ts`
- `src/transactions/dto/create-transaction.dto.ts` and the update DTO gain optional `clientId`
- `src/app.module.ts` adds `ClientsModule`

`InvoicesModule` needs to read workplaces, clients, and transactions through `PrismaService`. Do not trust a total sent by the client. Do not read a bonus table.

## Commands you run

```bash
npm test
```

As Ada, create a client and a clinic workplace if step 13 only stored a spa. On `01-05-2026` the spa must have one Swedish income: base `6000`, fee `200`, bonus `500`. Reuse the step 15 row if it is still there. Do not add a second copy of that row. Log a different income on `01-06-2026` for the same spa. Log one income on `01-05-2026` for the clinic with base `1000` and no bonus. Log one income on `01-05-2026` with the client id, no workplace, base `1000`, and bonus `100`.

Remember how many income rows `GET /transactions?type=income` returns.

Preview May before you create the invoice, so the 1 May rows are still eligible. Query numbers arrive as strings. The preview DTO uses `@Type(() => Number)` on `workplaceId`, `clientId`, `month`, and `year`, the same way the transaction list converts `limit`.

```text
GET {{baseUrl}}/invoices/preview?recipientKind=spa&workplaceId=1&period=month&month=5&year=2026
```

```text
GET {{baseUrl}}/invoices/preview?recipientKind=spa&workplaceId=1&period=day&date=01-05-2026
```

Use Ada's real ids.

```text
POST {{baseUrl}}/invoices
```

```json
{"recipientKind":"spa","workplaceId":1,"period":"day","date":"01-05-2026","issuedOn":"02-05-2026"}
```

Store the id as `invoiceId`. List income again. Pay it.

```text
PATCH {{baseUrl}}/invoices/{{invoiceId}}
```

```json
{"status":"paid","paidOn":"03-05-2026"}
```

List income again. `PATCH` the source transaction's `basePence` to `5000`. `GET` the invoice. `POST` the same spa and day again.

Preview the spa for May 2026:

```text
GET {{baseUrl}}/invoices/preview?recipientKind=spa&workplaceId=1&period=month&month=5&year=2026
```

Preview the clinic for `01-05-2026`, and the client for that date. Preview the spa with the other user's workplace id. Download the PDF with Send and Download.

Create `Ada Client`, then `ada client`. `GET /clients/{{clientId}}` as the other user.

## What you must see

`npm test` passes. The old one-line PDF text test still passes for an invoice with no lines. The new lines test includes the service description, `Additional Massage Fee`, `Bonus`, and the total `6700` pence rendered as pounds. The PDF bytes still start with `%PDF`. The tax and mileage tests still pass.

The day preview gets `200` and three lines: service `6000`, fee `200`, bonus `500`, `amountPence` `6700`. It does not include the June row, the clinic row, or the client row. The bonus line is not repeated.

`POST` gets `201`, status `issued`, a `TT-` number, `recipientName` equal to the spa's name, `period` `day`, and both period bounds `01-05-2026`. There is no `transactionId`.

The income list has the same number of rows after create and after pay. No new row has the invoice number as its note.

Pay gets `200` and `paidOn` `03-05-2026`. The source `PATCH` gets `200` on the transaction. `GET` the invoice and the service line `amountPence` is still `6000`. The bonus line is still `500`.

The second `POST` for that spa and day gets `400` and the message `No records to invoice for this recipient and period`.

The May preview, taken before that `POST`, includes the 1 May spa lines and excludes `01-06-2026`. Its lines are ordered by date. After the `POST`, a second May preview does not include those billed lines. The clinic preview does not include the spa's rows or the spa's bonus. It has the clinic service line and no bonus line. The client preview includes the client service line of `1000` and a Bonus line of `100`.

Another user's workplace id gets `404` and the message `Workplace <id> not found`. The PDF response is `application/pdf` and the filename is the invoice number.

`ada client` gets `409` and the message `Client already saved`. The other user's `GET` gets `404` and the message `Client <id> not found`.

The daily summary for `01-05-2026` still follows the source rows, not the invoice total. After you changed the base to `5000`, the summary `basePence` includes `5000` and the invoice service line stays `6000`. The fee on that income stays `200`, and the bonus stays `500`, unless you changed them. The invoice total stays `6700`.

## If it fails

- Pay adds an income row: the step 11 write is still in the pay handler. Delete that write. The feed row is the income.
- The invoice line becomes `5000` after the source `PATCH`: the line was loaded from the transaction on read. Read the stored line.
- June appears on the 1 May preview: the period filter used the issue date, or it used a UTC day that shifted the bound.
- The clinic preview includes the spa bonus: the filter used the wrong workplace, or a bonus table was billed on its own. The bonus line comes only from the eligible income row.
- The client preview has no Bonus line: client bills dropped `bonusPence`. Include it when that row's bonus is greater than 0.
- The total is `7200`: the bonus was added as its own line and added again into the service amount. The service line is the base. The bonus line is `bonusPence` once.
- `npm test` fails on the old PDF text: a baseline invoice with no lines must still produce the original lines. Branch on whether `lines` is empty.
- The migration dropped `Invoice`: it was a reset. Stop. Do not run `migrate reset`.

**Pass this step, then continue.** The extension steps are finished. The feed page and the invoice page are not updated in this step. Their target layout is in [the page plans](20_plan_pages.md).

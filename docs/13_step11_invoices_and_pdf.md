# Step 11 — Invoices and PDF

Guide: [Project plan](02_project_plans.md). Previous: [Step 10 — Receipt images](12_step10_receipt_images.md). Next: [Step 12 — React pages](14_step12_react_pages.md).

## Why this step comes first

Item 4 of the flow is issuing a one-line invoice, then getting a PDF. The money on this invoice is not income until the client pays, because a therapist who is a sole trader uses the cash basis. Income happens when the money is received, not when the invoice is sent, following the GOV.UK cash basis page. [Step 9](11_step09_tax_summary.md) is already ready to count an income row. This step creates that row only when the invoice is paid.

The PDF builder must be a pure function of the invoice and the user's name, with a test that does not open HTTP, before you write the route.

## Not in this step

Do not build React pages. Do not email invoices. Do not do multiple lines, and do not do VAT. VAT stays in Phase 2. Multiple lines for a day or a month are [step 17](19_step17_invoices_from_records.md), not this step.

## Superseded for new invoices

This lesson's pay action creates the income row. That is what the running code does until [step 17](19_step17_invoices_from_records.md). Step 17 bills a saved spa, clinic, or client from feed income and hourly bonuses. Creating or paying that invoice must not insert another income transaction. Rows this step already created stay in the database. Run this step's pay check on the one-line invoice. Do not change that pay action while this step is the one you have open.

## Concept

Create with

```ts
interface CreateInvoice {
  clientName: string;
  service: string;
  amountPence: number;
  issuedOn?: string;
}
```

`clientName` and `service` are 1 to 200 characters. `amountPence` is an integer from 1 to `100_000_000`. An omitted `issuedOn` is today in `Europe/London`. The day must be inside the 2026–27 year, otherwise the message is `Date is outside the 2026-27 tax year`.

`POST /invoices` gets `201`.

```ts
interface Invoice {
  id: number;
  number: string;
  clientName: string;
  service: string;
  amountPence: number;
  issuedOn: string;
  status: 'issued' | 'paid';
  paidOn?: string;
  transactionId?: number;
}
```

The invoice number is `TT-0001` per user, starting at 1, with at least four digits. The second invoice is `TT-0002`. Calculate it inside `$transaction` from that user's invoice count plus one, then `padStart(4, '0')`. The constraint `@@unique([userId, number])` makes a duplicate number fail to write. If you see `P2002`, count again once. If it still collides, respond `409` with the message `Invoice number collided, retry`. The contract does not lock this sentence. This lesson uses it for a collision that really happens at the same time.

Status starts at `issued`. Creating an invoice does not create a row in `Transaction`, so there is no `paidOn` and no `transactionId` in the JSON.

`PATCH /invoices/:id` accepts only

```ts
{ status: 'paid'; paidOn?: string }
```

`status` must be `paid` only. Any other field is rejected by the pipe, because it is not on the DTO. This is the only status change there is. An omitted `paidOn` is today. It must not be before `issuedOn`, and it must be inside the tax year. If it is before the issue date, respond `400` with the message `paidOn is before issuedOn`.

Inside the same database transaction, create the income, then update the invoice.

- `type` is `income`
- `amountPence` is copied from the invoice
- `occurredOn` is `paidOn`
- `note` is the invoice number, so the feed row can point back at the invoice
- `invoiceId` points at this invoice
- no category, no miles

The `200` response is the same invoice, now with `paidOn` and `transactionId`. The tax summary sees this money because it adds income. It does not add the invoice table. An unpaid invoice has no transaction, so it is not in the estimate.

Logging cash in the feed is still the path for money that has no invoice. The server does not match which row duplicates which invoice. The page in [step 12](14_step12_react_pages.md) must not also fire `POST /transactions` for a session that will be marked paid on an invoice.

Paying again gets `409` with the message `Invoice is already paid`. The client name, the service, and the amount cannot be edited.

`GET /invoices` uses the envelope `items`, `total`, `skip`, `limit` from [step 8](10_step08_log_income_and_expenses.md). Order by `issuedOn` descending, then `id` descending. `GET /invoices/:id` that does not exist, or that belongs to someone else, gets `404` with the message `Invoice <id> not found`.

`GET /invoices/:id/pdf` gets `200`. The headers are

```text
Content-Type: application/pdf
Content-Disposition: attachment; filename="<number>.pdf"
```

The file contains the therapist's name, the invoice number, `issuedOn`, the client name, the service, the amount as pounds and pence, the status, and `paidOn` once it is paid. Building it can happen in the same request. This page of the flow is allowed to take longer than the feed.

The amount in the PDF comes from a converter with no floating point. Pounds are the truncated quotient. Pence are the two-digit remainder. For example `6500` is `£65.00`.

The function `invoicePdfLines` returns these lines in order. The test locks that text. `buildInvoicePdf` draws those lines with `pdf-lib` and a standard font, then returns a `Uint8Array`. The byte test checks that the first four bytes are `%PDF`. This test does not hit HTTP.

Every path must be onboarded, and filtered by `userId`.

## Files for this step

- `src/invoices/invoice-pdf.ts`
- `src/invoices/invoice-pdf.spec.ts`
- `src/invoices/dto/create-invoice.dto.ts`
- `src/invoices/dto/pay-invoice.dto.ts`
- `src/invoices/dto/list-invoices-query.dto.ts`
- `src/invoices/invoices.service.ts`
- `src/invoices/invoices.controller.ts`
- `src/invoices/invoices.module.ts`
- `src/app.module.ts` adds `InvoicesModule`

Install it yourself.

```bash
npm install pdf-lib
```

The query DTO has `skip` and `limit` with the same rules as the transaction list. It has no `type`.

The controller uses `StreamableFile` for the PDF.

```ts
return new StreamableFile(Buffer.from(bytes), {
  type: 'application/pdf',
  disposition: `attachment; filename="${invoice.number}.pdf"`,
});
```

`filename` comes from the number the server issued, so it is only the shape `TT-` followed by digits.

The module has `imports: [AuthModule]`.

## Commands you run

Run the tests before you open the route.

```bash
npm test
```

Use a user who is already onboarded. Use Bearer `{{token}}`. Remember `incomePence` from `GET /tax/summary`. Then create an invoice for £65.00 dated 1 May 2026. On the Tests tab of the create request, store the id.

```js
pm.environment.set('invoiceId', String(pm.response.json().id));
```

```text
POST {{baseUrl}}/invoices
```

```json
{"clientName":"North Clinic","service":"Sports massage","amountPence":6500,"issuedOn":"01-05-2026"}
```

```text
GET {{baseUrl}}/tax/summary
```

```text
GET {{baseUrl}}/transactions?type=income
```

Then pay it on 2 May.

```text
PATCH {{baseUrl}}/invoices/{{invoiceId}}
```

```json
{"status":"paid","paidOn":"02-05-2026"}
```

```text
GET {{baseUrl}}/tax/summary
```

```text
GET {{baseUrl}}/transactions?type=income
```

Download the PDF. Click the arrow next to Send and choose Send and Download. Save it as `TT-check.pdf`. Look at the headers on the Headers tab.

```text
GET {{baseUrl}}/invoices/{{invoiceId}}/pdf
```

Pay again.

```text
PATCH {{baseUrl}}/invoices/{{invoiceId}}
```

```json
{"status":"paid"}
```

Open `TT-check.pdf` with a PDF reader.

## What you must see

The PDF line tests pass. The bytes start with `%PDF`. The £20,000 test and the 11,000-mile test still pass.

Creating the invoice gets `201`. The number is `TT-` followed by at least four digits. `status` is `issued`. There is no `paidOn` and no `transactionId`.

After create and before pay, `incomePence` equals the value you remembered before creating the invoice. The income list has no row whose `note` is this invoice number.

After pay you get `200`. It has `paidOn` of `02-05-2026` and a `transactionId`. The feed has income of `6500` on `02-05-2026`. The note is the invoice number. There is no `categorySlug` and no `miles`.

`incomePence` is `6500` higher than the value before pay.

The PDF headers are `application/pdf`, and `Content-Disposition` contains `attachment; filename="TT-0001.pdf"` or the real number of that invoice. The file starts with `%PDF`. When you open it you see the user's name, the number, the issue date, the clinic name, the service, `£65.00`, a paid status, and the paid date.

Paying again gets `409` and the message `Invoice is already paid`.

Sending a `paidOn` before `issuedOn` gets `400` and the message `paidOn is before issuedOn`.

A `PATCH` that also sends `clientName` gets `400`, and `message` is an array.

The income row tied to this invoice, edited or deleted through `/transactions/:id`, gets `409` and the message `Invoice income is changed by updating the invoice`.

## If it fails

- The tax total moves as soon as you create the invoice: someone created an income row in `POST /invoices`. Create it only when the status becomes `paid`.
- After pay, the tax summary does not move: the income row was not created in the same transaction, or `occurredOn` is outside the year the summary adds.
- The PDF is JSON: the handler returned the invoice object instead of `StreamableFile`.
- A special font forces the test to open a browser: use a standard `pdf-lib` font, and lock the text on the lines function. Do not extract text from the PDF bytes.
- The invoice number is `TT-1`: it has not been through `padStart(4, '0')`.

**Pass this step, then continue.** The baseline invoice API is complete. [Step 12](14_step12_react_pages.md) is the screens. It does not add a new money rule. [Step 17](19_step17_invoices_from_records.md) is the later change to how a new invoice is paid.

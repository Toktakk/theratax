# Invoice page

Index: [Page plans](20_plan_pages.md). This is item 4 in [`01_user_flow.md`](01_user_flow.md). The baseline build check is [step 12](14_step12_react_pages.md). One-line create and pay are [step 11](13_step11_invoices_and_pdf.md). Recipient, period, and lines are [step 17](19_step17_invoices_from_records.md).

`client/src/pages/InvoicePage.tsx` is `/invoices`. Do not add a second invoice route.

The file on disk today sends a one-line body: client name, service, pounds, pence, and an optional issue date. The target below bills a saved spa, clinic, or client for a day or a month. Until this page sends that body, `POST /invoices` rejects the old one. Do not build the target during step 12.

## Purpose and scope

The page issues a bill and downloads a PDF. A new invoice is a snapshot of income rows the user already logged on the [feed](23_page_feed.md). It is not a second record of that work.

Creating the invoice does not call `POST /transactions`. Marking it paid does not call `POST /transactions`. Invoices that step 11 already linked keep their income row and `transactionId`. New invoices do not set `invoiceId` on the source and have no `transactionId`.

The page does not email the PDF, add VAT, or create a recurring invoice.

## User flows and navigation

Open Invoices from the menu after onboarding. The list loads with `GET /invoices`.

Choose a recipient and a period. The page calls `GET /invoices/preview` with those fields and shows the lines and the total. Create sends the same fields to `POST /invoices`. The list reloads. The feed does not gain a row.

Download calls `GET /invoices/:id/pdf` and saves the file named in `Content-Disposition`. Pay calls `PATCH /invoices/:id` with `{ "status": "paid" }`. A second pay shows `Invoice is already paid`.

A baseline invoice with no lines still downloads the one-line PDF: name, number, client, service, and amount. Pay on a baseline invoice that step 11 has not yet linked still follows step 11 only while that step is the one you have open. The lasting rule for a new invoice is that pay does not insert income.

## UI components and layout

The heading is Invoices. The form comes before the list.

Recipient is three choices: Spa, Clinic, Client. Spa and Clinic then show workplaces of that kind from `GET /workplaces`. Client shows saved clients from `GET /clients`. The page reuses those rows. It does not invent a recipient name that is not the saved record. A new workplace or client is saved once on [Workplace name](24_page_directory.md), or through the create form on this page, and then selected. That shared form also asks for the hour rate and the optional pregnancy extra per hour. A duplicate name shows `Workplace already saved` or `Client already saved`. Invoice lines still use the stored `basePence` from each income row.

Period is Daily or Monthly.

- Daily shows one date.
- Monthly shows a month and a year.

Issue date is optional.

The preview lists each line's date, description, quantity, rate, and amount, then the total. Order is the date ascending, then the service, then Additional Massage Fee, then Bonus. A month uses that same order as the breakdown by date.

Where the lines are itemised, Bonus is its own line. It is not folded into the base and not added again in the total.

The list shows the number, the recipient, the period, the total, the status, and `paidOn` when paid. A baseline row still shows its client and service. Actions on a row are PDF and, while status is `issued`, Pay.

## Input fields and field types

| On screen | Control | Sent as |
| --- | --- | --- |
| Recipient | Spa, Clinic, or Client | `recipientKind`: `spa`, `clinic`, or `client` |
| Spa or clinic | dropdown of that kind | `workplaceId` |
| Client | dropdown | `clientId` |
| Period | Daily or Monthly | `period`: `day` or `month` |
| Date | date input, when Daily | `date` as `DD-MM-YYYY` |
| Month | 1–12, when Monthly | `month` |
| Year | year, when Monthly | `year` |
| Issue date | date input, optional | `issuedOn` as `DD-MM-YYYY`, omitted when blank |

Do not send `amountPence`, `clientName`, or `service` on a new invoice. The server copies `recipientName` from the workplace or the client at issue time. A later rename of the client does not change that copy.

Preview is a query. Create is JSON. Query numbers are numbers in the DTO, using `@Type(() => Number)` the same way the transaction list converts `limit`.

## Validation rules

A spa or a clinic requires `workplaceId` and no `clientId`. A client requires `clientId` and no `workplaceId`. The other id is `400` `Recipient does not take that id`.

The workplace's `kind` must equal `recipientKind`. A clinic id sent as a spa is `400` `Workplace kind does not match recipient`. An id the user does not own is `404` `Workplace <id> not found` or `Client <id> not found`.

Daily requires `date`. That civil date is both `periodStart` and `periodEnd`. Monthly requires `month` and `year`. The bounds are the first and last day of that month, clipped to 6 April 2026 through 5 April 2027. A date or a month with no day inside that window is `400` `Date is outside the 2026-27 tax year`.

A blank issue date is today in `Europe/London`. `issuedOn` uses the same tax-year window. It may differ from the period.

The preview of an empty set is `200` with `lines: []` and `amountPence: 0`. Create stays disabled for that result. `POST` of an empty set is `400` `No records to invoice for this recipient and period`. A second create after the rows were billed is the same `400`.

Pay sends only `{ status: "paid", paidOn? }`. `paidOn` defaults to today, must be on or after `issuedOn`, and must sit in the tax year. Otherwise `400` `paidOn is before issuedOn` or the tax-year message. A second pay is `409` `Invoice is already paid`.

## Business logic and calculations

Eligible income is this user's `income` rows inside the clipped period, with no `invoiceId`, not already referenced by an invoice line, and matching the recipient: `workplaceId` for a spa or clinic, `clientId` for a client. Expenses are never eligible. A row with both ids is not eligible. It was rejected at save with `Income refers to a workplace or a client, not both`.

The line builder is a pure function. For each eligible income row:

- One `service` line. Quantity `1`, unit `session`. Rate and amount are `basePence` when it is set, otherwise `amountPence`. The description is the massage name, the custom text when the type is `other`, or `Income` when there is no massage type.
- One `additional_fee` line only when `additionalFeePence` is greater than 0. Description `Additional Massage Fee`. Quantity `1`, unit `session`. Rate and amount are the fee.
- One `bonus` line only when `bonusPence` is greater than 0. Description `Bonus`. Quantity `1`, unit `session`. Rate and amount are `bonusPence`.

A bonus on a client row is included. There is no separate bonus table, and a client bill does not drop the bonus.

The invoice `amountPence` is the sum of the line amounts. The fee is in that sum once. The bonus is in that sum once. Example: service `6000`, fee `200`, bonus `500`, invoice total `6700`. That is the same £67 as the feed row and the daily total for that single row.

Lines are stored. Editing the source later does not change them. Deleting a source sets the line's source id to null and leaves the amounts. The next daily summary follows the source. The invoice total does not.

`GET /invoices/:id/pdf` stays `200`, `Content-Type: application/pdf`, and `Content-Disposition: attachment; filename="<number>.pdf"`. The PDF is an A4 invoice: INVOICE and the number, the therapist's name, email, and business address, the recipient's name and address, the invoice date, the supply period, a table of date, description, quantity, rate, and amount, the GBP total, the status, and the paid date when paid. It says the issuer is a sole trader who is not registered for VAT. A baseline invoice with no lines still draws one row for the client, service, and amount. Create is disabled until the signed-in user has a business address and the selected recipient has an address. A missing business address is `400` `Add your business address before issuing an invoice`. A recipient without an address is `400` `Add an address for this recipient before issuing an invoice`. The page can save the business address, and it can save a workplace or client address, before create.

## Data models and API dependencies

`recipientKind` is `spa`, `clinic`, or `client`. `period` is `day` or `month`. Line `kind` is `service`, `additional_fee`, or `bonus`. `quantityUnit` for these lines is `session`.

A new invoice returns `number` (`TT-` plus at least four digits), `recipientName`, `workplaceId` or `clientId`, `period`, `periodStart`, `periodEnd`, `issuedOn`, `amountPence`, `status: issued`, and `lines`. It omits `clientName`, `service`, and `transactionId`.

A baseline invoice still returns `clientName`, `service`, and `transactionId` when step 11 linked one.

Workplaces and clients are the models from steps 13 and 17. The transaction fields that decide a line are `occurredOn`, `amountPence`, `basePence`, `additionalFeePence`, `bonusPence`, `massageType`, `customMassageType`, `workplaceId`, and `clientId`.

The page does not call `/hourly-bonuses`.

## Loading, empty, success, and error states

- The list shows a loading line, then the rows, or a clear empty state when `items` is empty.
- Preview loading replaces the previous lines so a stale total is not left on screen.
- An empty preview shows no lines and £0.00, and Create is disabled.
- Create success clears the form, reloads the list, and shows status `issued` with no paid date. The feed is unchanged.
- Pay success shows `paid` and `paidOn`. The feed still has the same income rows.
- A form or row error shows the server message. PDF failure and pay failure stay on that row.
- `401` returns to login. `403` means onboarding is not complete.

## Security and data-access considerations

The page requires a bearer token and completed onboarding. Preview, create, pay, and PDF use the token user only. Another user's workplace, client, or invoice id is `404`. The PDF is a download for that user. It is not emailed. The page does not accept an amount that could bill someone else's rows.

## Acceptance criteria and test scenarios

- The old one-line form is not the target. Spa, Clinic, and Client are the recipient choices. Daily and Monthly are the period choices.
- A spa day that has one Swedish row of base `6000`, fee `200`, and bonus `500` previews three lines and `amountPence` `6700`. The June row, a clinic row, and a client row are absent.
- The bonus line description is `Bonus`. The fee line description is `Additional Massage Fee`. The total equals the lines. The bonus is not in the total twice.
- The same spa for May includes that day and excludes 1 June 2026. After create, a second preview of May no longer includes the billed lines.
- `POST` returns `201`, status `issued`, a `TT-` number, and the spa's name as `recipientName`. `GET /transactions?type=income` has the same count as before create.
- Pay returns `200` with `paidOn` and still does not add an income row. `incomePence` then includes that source `amountPence` once.
- A later `PATCH` of the source base does not change the stored service line. The feed summary does change, because it reads the source.
- A second `POST` for that spa and day is `400` `No records to invoice for this recipient and period`.
- A clinic preview does not include the spa's rows or the spa's bonus.
- A client row with a bonus previews a service line and a Bonus line. A client row with no bonus has no Bonus line.
- Another user's workplace id is `404` `Workplace <id> not found`.
- The PDF is `application/pdf` and the filename is the invoice number. It shows both addresses, the line table, the GBP total, and the non-VAT sentence. A baseline invoice with no lines still produces one service row.
- Create does not call `POST /transactions`. The button is disabled while the create request is in flight.

## Dependencies on other pages or shared components

Depends on income from [`23_page_feed.md`](23_page_feed.md), on workplaces and clients from [`24_page_directory.md`](24_page_directory.md), on the menu in `App.tsx`, and on `api.ts`, `format.ts`, `FormError.tsx`, and `directory-forms.tsx`. The invoice total matches the feed summary for the same source rows. Paying the invoice includes that source `amountPence` in the tax summary once. It does not copy the total into a new income row. The tax page does not read this list.

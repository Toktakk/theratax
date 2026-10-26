# API Spec — TheraTax

This project has no reference API to copy, and no React client yet. The Nest app is still the starter. This document is the contract, derived from the therapist user flow ([docs/01_user_flow.md](01_user_flow.md)) and from the capstone data model: **User** (account, auth, onboarding profile), **Transaction** (one income or expense, optionally linked to a receipt or an invoice), **ExpenseCategory** (seeded, profession-specific), and **Invoice** (number, client, service, amount, status, generated PDF).

Every clause below cites the flow step or the entity that requires it. The React app will be written against this file. Backend modules follow the same ownership: auth, transactions, tax-engine, expense-categories, upload, invoices.

Phase 2 from the proposal is out of scope and is listed at the end. It is not quietly added to a payload.

## Endpoints

| Method | Path | Query / Body | Auth |
| --- | --- | --- | --- |
| POST | `/auth/register` | `{ email, password, name }` | no |
| POST | `/auth/login` | `{ email, password }` | no |
| GET | `/users/me` | — | yes |
| PATCH | `/users/me/onboarding` | `{ practiceType, expenseMethod }` | yes |
| GET | `/expense-categories` | — | yes |
| GET | `/transactions` | `skip`, `limit`, optional `type` | yes |
| POST | `/transactions` | see Transaction | yes |
| GET | `/transactions/:id` | — | yes |
| PATCH | `/transactions/:id` | partial Transaction fields | yes |
| DELETE | `/transactions/:id` | — | yes |
| POST | `/transactions/:id/receipt` | multipart field `file` | yes |
| GET | `/transactions/:id/receipt` | — | yes |
| DELETE | `/transactions/:id/receipt` | — | yes |
| POST | `/invoices` | `{ clientName, service, amountPence, issuedOn? }` | yes |
| GET | `/invoices` | `skip`, `limit` | yes |
| GET | `/invoices/:id` | — | yes |
| PATCH | `/invoices/:id` | `{ status: "paid", paidOn? }` | yes |
| GET | `/invoices/:id/pdf` | — | yes |
| GET | `/tax/summary` | `taxYear` (int, optional) | yes |

Authenticated routes require `Authorization: Bearer <accessToken>`. A missing or invalid token is `401`.

Logging a swipe is one request (`POST /transactions`). Attaching a photo is a second request, and only when there is a photo. The category hint is not a request. That is flow steps 2–3: near-instant, between clients. Invoice PDF and the tax summary are allowed to take a short load (flow steps 4–5).

## Money, dates, and the tax year

Money is an integer number of pence. Mileage for 2026–27 is 55p, and the tax engine is a pure function with unit tests (proposal: tax logic stays isolated from HTTP). A float would make those totals ambiguous.

Dates that are a civil day (`occurredOn`, `issuedOn`, `paidOn`, tax-year bounds) are `DD-MM-YYYY`. Timestamps (`onboardedAt`, `expiresAt`) are ISO 8601. "Today" and the default tax year use the calendar date in `Europe/London`. The tax year turns on 6 April, which is a UK civil date; UTC would pick the wrong day around midnight.

`taxYear=2026` means 6 April 2026 through 5 April 2027 (`06-04-2026` through `05-04-2027`). This spec implements that year only. Any other `taxYear` is `400`. `occurredOn`, `issuedOn`, and `paidOn` must fall inside that same window; a date outside it is `400` with message `"Date is outside the 2026-27 tax year"`.

## Auth and User (proposal: User)

`POST /auth/register` returns `201`. `POST /auth/login` returns `200`. Both bodies are:

```ts
interface AuthResponse {
  accessToken: string; // opaque bearer token, expires in 7 days
  user: User;
}
```

```ts
interface User {
  id: number;
  email: string;
  name: string;
  practiceType: "mobile" | "fixedLocation" | "mixed" | null;
  expenseMethod: "flat_rate" | "actual_cost" | null;
  onboardedAt: string | null; // always present; null until onboarding
}
```

`onboardedAt` is always on the object, including when it is `null`. The app reads `GET /users/me` on launch and gates the feed on that field (flow step 1 is one-time; steps 2–3 are the app after that). Omitting the key would make the gate ambiguous.

Password is 8–72 characters. The upper bound is the bcrypt input limit, so the DTO rejects a longer password instead of silently truncating it. Email is a valid email address. `name` is 1–200 characters. The response never includes the password.

A duplicate email on register is `409`:

```json
{ "message": "Email already registered", "error": "Conflict", "statusCode": 409 }
```

A login that does not match is `401`. The message does not say whether the email or the password was wrong:

```json
{ "message": "Invalid email or password", "error": "Unauthorized", "statusCode": 401 }
```

## Onboarding (flow step 1)

`PATCH /users/me/onboarding` sets the profile once.

```ts
interface OnboardingRequest {
  practiceType: "mobile" | "fixedLocation" | "mixed";
  expenseMethod: "flat_rate" | "actual_cost";
}
```

`200` returns the `User`, with both fields set and `onboardedAt` filled.

The target user is a sole trader. Legal form is not a field. `practiceType` is the "business type" in flow step 1: mobile, clinic, or both. It is stored for the client. It does not change which categories the server accepts — a clinic therapist can still log a drive.

`expenseMethod` is the Flat Rate vs Actual Cost choice, and it applies to **vehicle costs only**. Oils, HCPC fees, professional insurance, and laundry are always an amount the user enters. Flat rate means HMRC simplified mileage for a car or van, not a flat rate on every expense. Once simplified mileage is used for a vehicle, that method stays for as long as the vehicle stays in the business ([GOV.UK: simplified expenses, vehicles](https://www.gov.uk/simpler-income-tax-simplified-expenses/vehicles)). A second `PATCH` is therefore `409`, not a silent overwrite:

```json
{ "message": "Onboarding already completed", "error": "Conflict", "statusCode": 409 }
```

`flat_rate` rates for 2026–27, car or van: **55p** per mile for the first 10,000 business miles in the tax year, **25p** after that. Motorcycle rates are out of scope.

Transactions, invoices, and the tax summary require a completed onboarding. Calling them before that is `403`:

```json
{ "message": "Complete onboarding before using this resource", "error": "Forbidden", "statusCode": 403 }
```

`GET /expense-categories` stays available before onboarding so the client can prefetch the list.

## Expense category (proposal: ExpenseCategory)

`GET /expense-categories` returns a **bare array**, in the order below. The list is seeded and fixed. Users do not create categories — the proposal's point is that there is no chart of accounts to set up.

```ts
interface ExpenseCategory {
  slug: string;
  name: string;
  keywords: string[];
  kind: "general" | "mileage" | "vehicle_actual";
}
```

| slug | name | kind | keywords |
| --- | --- | --- | --- |
| `oils-consumables` | Oils and consumables | `general` | oil, oils, cream, wax, tape, consumable, balm |
| `hcpc-fees` | HCPC registration | `general` | hcpc, registration, membership |
| `professional-insurance` | Professional insurance | `general` | indemnity, insurance |
| `laundry` | Laundry | `general` | laundry, towel, linen, washing |
| `public-transport` | Public transport | `general` | tube, underground, uber, taxi, train, bus |
| `mileage` | Mileage | `mileage` | mileage, miles, petrol, fuel, travel |
| `vehicle-costs` | Vehicle costs | `vehicle_actual` | fuel, petrol, mot, service, repair, servicing |
| `other` | Other | `general` | — |

`mileage` is valid only when `expenseMethod` is `flat_rate`. `vehicle-costs` is valid only when it is `actual_cost`. Every `general` category is always valid. The profession list from the proposal is oils/consumables, HCPC fees, mileage, insurance, and laundry. `public-transport` is a general category for Tube, Underground, train, bus, taxi, and Uber fares, so the user types `amountPence` under either vehicle method. `vehicle-costs` exists so actual-cost users still have a place for fuel and servicing. `other` exists so a 30-second log can finish when none of the named categories fit.

### Hint (client-side)

There is no hint endpoint. Flow steps 2–3 cannot wait on a round trip. The client matches locally:

1. Keep categories the user's `expenseMethod` allows: `flat_rate` keeps `general` and `mileage`; `actual_cost` keeps `general` and `vehicle_actual`.
2. Lowercase the note. Walk the allowed categories in the array order above. The suggestion is the first category that has a keyword contained in the note.
3. An empty note, or no match, leaves the choice to the user. `other` has no keywords, so it is never suggested.

`fuel` and `petrol` sit on both vehicle categories. Only one of those categories is allowed at a time, so the hint cannot suggest both. Under flat rate, a note of "petrol" suggests `mileage`: the 55p/25p rate already covers fuel, and the user enters miles. Under actual cost, the same note suggests `vehicle-costs`, and the user enters the deductible amount.

Parking and tolls are claimable on top of mileage ([same GOV.UK vehicles page](https://www.gov.uk/simpler-income-tax-simplified-expenses/vehicles)). They are not miles, and they are not public transport. Log them as `other` with an `amountPence`. Tube, Underground, train, bus, taxi, and Uber fares are `public-transport` with an `amountPence`. Those words are absent from the `mileage` keywords. `public-transport` is listed before `mileage`, so a note that contains both `tube` and `travel` suggests public transport. The word `travel` stays on `mileage` only.

## Transaction (proposal: Transaction; flow step 2)

```ts
interface Transaction {
  id: number;
  type: "income" | "expense";
  occurredOn: string;          // DD-MM-YYYY
  amountPence: number;         // always present; mileage is computed
  hasReceipt: boolean;         // always present, so the feed can show the camera state
  note?: string;               // omitted when empty
  categorySlug?: string;       // omitted on income
  miles?: number;              // omitted unless this is a flat-rate mileage row
  invoiceId?: number;          // omitted unless this income came from a paid invoice
}
```

`hasReceipt` is always present because the feed renders "attach receipt" from the list payload. A second request per row would break the 30–60 second path. The other keys are omitted when they do not apply, so a cash income row stays small.

```ts
interface CreateTransaction {
  type: "income" | "expense";
  occurredOn?: string;   // default: today's date in Europe/London
  note?: string;         // 1–500 characters when present
  amountPence?: number;  // integer, 1 .. 100_000_000 (£1,000,000)
  categorySlug?: string;
  miles?: number;        // integer, 1 .. 100_000
}
```

`POST` returns `201` and the `Transaction`.

Rules, checked against the merged body:

- **Income.** `amountPence` is required. `categorySlug` and `miles` are absent. This is the swipe for cash or a bank transfer with no invoice (the gap the proposal calls out). `invoiceId` is set only by the server, when an invoice is marked paid.
- **Expense, general category.** `categorySlug` is required and has kind `general`. `amountPence` is required. `miles` is absent.
- **Expense, flat rate, `mileage`.** `miles` is required. `amountPence` is absent — the server computes it. Sending an amount is `400` with message `"Amount is computed from miles"`.
- **Expense, actual cost, `vehicle-costs`.** `amountPence` is required. `miles` is absent. The figure is the deductible amount the user has already worked out. The server does not apply a business-use percentage; that would be a form, and the swipe is not a form.
- **Method clash.** `mileage` while on actual cost, or `vehicle-costs` while on flat rate, is `400`: `"Category <slug> is not valid for <expenseMethod>"`. An unknown slug is `400`: `"Unknown category <slug>"`. A write that names a category is a failed write. It is an empty filter only on the list endpoint, which has no category filter.

`PATCH /transactions/:id` accepts any subset of `occurredOn`, `note`, `amountPence`, `categorySlug`, and `miles`. `type` is not on the DTO; sending it is a validation error. The merged row is checked with the same rules. `invoiceId` is not client-writable.

A transaction that carries `invoiceId` is immutable here. `PATCH` or `DELETE` on it is `409`:

```json
{ "message": "Invoice income is changed by updating the invoice", "error": "Conflict", "statusCode": 409 }
```

`DELETE /transactions/:id` returns `204` and no body.

### Mileage amount

For every flat-rate mileage row in a tax year, ordered by `occurredOn` ascending then `id` ascending, walk a running mile total:

- miles that fall inside the year's first 10,000 are worth 55p
- miles past 10,000 are worth 25p
- `amountPence = milesAt55 × 55 + milesAt25 × 25`

Creating, updating, or deleting a mileage row recomputes **every** mileage row in that tax year. A backdated entry changes later amounts. One row of 11,000 miles at the start of the year is `575_000` pence (£5,750): `10_000 × 55 + 1_000 × 25`.

## Receipt (flow step 3; proposal: upload)

One photo per transaction. `POST /transactions/:id/receipt` is `multipart/form-data` with a single field `file`.

- Content type: `image/jpeg`, `image/png`, or `image/webp`
- Size: 1 byte through 10 MiB (`10 * 1024 * 1024`)

`201`:

```ts
interface Receipt {
  transactionId: number;
  contentType: string;
  byteSize: number;
}
```

A second upload replaces the photo. The object is private. The response has no URL.

`GET /transactions/:id/receipt` returns `200`:

```ts
interface ReceiptUrl {
  url: string;       // short-lived signed URL
  expiresAt: string; // 15 minutes from issue
}
```

The client uses `url` as an image source. The API does not stream the bytes and does not return a permanent public URL.

No photo yet, and the transaction exists: `404` `{ "message": "Receipt for transaction <id> not found", "error": "Not Found", "statusCode": 404 }`. Missing transaction: `404` `{ "message": "Transaction <id> not found", ... }`, including on upload and delete. `DELETE` of an existing photo returns `204`.

## Invoice (flow step 4; proposal: Invoice)

One line. Client, service, amount, then a PDF. That is the whole MVP invoice.

```ts
interface CreateInvoice {
  clientName: string;    // 1–200 characters
  service: string;       // 1–200 characters
  amountPence: number;   // integer, 1 .. 100_000_000
  issuedOn?: string;     // default: today in Europe/London
}
```

`POST` returns `201`:

```ts
interface Invoice {
  id: number;
  number: string;            // "TT-0001", per user, starting at 1, at least 4 digits
  clientName: string;
  service: string;
  amountPence: number;
  issuedOn: string;
  status: "issued" | "paid";
  paidOn?: string;           // omitted until paid
  transactionId?: number;    // omitted until paid
}
```

Status starts at `issued`. Creating an invoice does **not** create income.

Cash basis is the standard record for a sole trader: income counts when the money is received, not when the invoice is sent ([GOV.UK: cash basis](https://www.gov.uk/simpler-income-tax-cash-basis)). `PATCH /invoices/:id` with `{ status: "paid", paidOn? }` is the moment of receipt. `paidOn` defaults to today and must be on or after `issuedOn`. The handler creates the linked income transaction in the same action:

- `type: "income"`
- `amountPence` copied from the invoice
- `occurredOn` = `paidOn`
- `note` = the invoice `number`, so the feed row is identifiable
- `invoiceId` set
- no category, no miles

The `200` body is the `Invoice`, now including `paidOn` and `transactionId`. The tax summary picks this up because it sums income transactions. An unpaid invoice has no transaction, so it stays out of the estimate.

The swipe remains the path for cash or a transfer that never had an invoice. The client should not also swipe a session that will be marked paid on an invoice; the server does not try to detect that duplicate.

`issued` → `paid` is the only transition. A second pay is `409` `"Invoice is already paid"`. Any other `PATCH` body is `400`. Invoice fields other than status are fixed at creation.

`GET /invoices/:id/pdf` returns `200` with `Content-Type: application/pdf` and `Content-Disposition: attachment; filename="<number>.pdf"`. The PDF shows the therapist's name, the invoice number, `issuedOn`, client, service, the amount in pounds and pence, the status, and `paidOn` when paid. Generation is synchronous. Flow step 4 may take a short load. The PDF builder is a pure function of the invoice and the user's name, called by the handler, so it can be unit-tested without HTTP.

## Tax summary (flow step 5; proposal: tax-engine)

`GET /tax/summary` with optional `taxYear` (default: the tax year that contains today in `Europe/London`). `200`:

```ts
interface TaxSummary {
  taxYear: string;             // "2026-27"
  periodStart: string;         // "06-04-2026"
  periodEnd: string;           // "05-04-2027"
  expenseMethod: "flat_rate" | "actual_cost";
  incomePence: number;
  allowableExpensesPence: number;
  netProfitPence: number;      // income − expenses; may be negative
  taxableProfitPence: number;  // max(0, netProfitPence)
  incomeTaxPence: number;
  class4NationalInsurancePence: number;
  estimatedTaxOwedPence: number; // income tax + Class 4
  class2: {
    treatedAsPaid: boolean;
    voluntaryWeeklyPence: 365; // £3.65; never added to estimatedTaxOwedPence
  };
  assumptions: string[];
  disclaimer: string;
}
```

`incomePence` is the sum of income transactions with `occurredOn` inside the period. That includes swiped income and invoice income created on pay. `allowableExpensesPence` is the sum of expense transactions in the period. A loss stays visible on `netProfitPence`. Tax and National Insurance use `taxableProfitPence`.

Rates are England, Wales, and Northern Ireland for 2026–27 ([GOV.UK: Income Tax](https://www.gov.uk/income-tax-rates), [GOV.UK: self-employed National Insurance](https://www.gov.uk/self-employed-national-insurance-rates)).

| Slice of taxable profit | Income Tax | Class 4 |
| --- | --- | --- |
| £0 up to £12,570 | 0% | 0% |
| over £12,570 up to £50,270 | 20% | 6% |
| over £50,270 up to £125,140 | 40% | 2% |
| over £125,140 | 45% | 2% |

In pence the boundaries are `1_257_000`, `5_027_000`, and `12_514_000`. The slice between two boundaries `from` and `to` is `max(0, min(taxableProfitPence, to) − from)`. A slice with no ceiling is `max(0, taxableProfitPence − from)`.

Income Tax is three rounded slices: 20% from `1_257_000` to `5_027_000`, 40% from `5_027_000` to `12_514_000`, and 45% above `12_514_000`. Class 4 is two rounded slices: 6% from `1_257_000` to `5_027_000`, and 2% on everything above `5_027_000`. The 2% band is one slice. It stays one slice past £125,140, where only the Income Tax rate changes. Splitting the 2% band at £125,140 would round it twice and can move the result by a penny.

Each slice is multiplied by its rate and rounded **on its own**, half away from zero, to the nearest penny. For a positive `numerator / 100`, take the quotient; if the remainder is greater than or equal to 50, add one penny. Sum the rounded slices. Rounding once at the end can move the result by a penny, and the unit tests need a single answer.

The personal allowance is applied in full. It is not reduced by the £100,000 taper. The audience earns under £50,000 and the API does not collect other income, so the taper has no input.

Class 2 is not part of `estimatedTaxOwedPence`. It has not been a compulsory payment since April 2024. For 2026–27 the small profits threshold is **£7,105** and the voluntary rate is **£3.65 a week** ([GOV.UK: NI rates and allowances](https://www.gov.uk/government/publications/rates-and-allowances-national-insurance-contributions/rates-and-allowances-national-insurance-contributions)). `class2.treatedAsPaid` is `true` when `taxableProfitPence >= 710_500`. Below that it is `false`, and `voluntaryWeeklyPence` tells the client the rate the user could choose to pay. That weekly amount is information. It is not multiplied into the estimate.

Worked example, profit £20,000 (`2_000_000` pence), no other complications:

- basic-rate slice `743_000` pence
- income tax `round(743_000 × 20 / 100) = 148_600`
- Class 4 `round(743_000 × 6 / 100) = 44_580`
- `estimatedTaxOwedPence = 193_180` (£1,931.80)
- Class 2 treated as paid, because £20,000 is over £7,105

`assumptions` is this list, in this order, so the summary screen can show it:

1. Rates are for England, Wales, and Northern Ireland for 2026–27. Scottish Income Tax is not applied.
2. Trading profit is treated as the user's only income. The personal allowance of £12,570 is applied in full and is not tapered.
3. Cash basis: income counts when it is received, expenses when they are paid. Unpaid invoices are excluded.
4. Student loans, pension contributions, Marriage Allowance, and other reliefs are not applied.
5. Class 2 National Insurance is not included in estimated tax owed. At or above £7,105 it is treated as paid. Below that, voluntary Class 2 is £3.65 a week and is not added here.
6. Flat-rate vehicle costs use simplified mileage for a car or van (55p then 25p). Motorcycle rates are not applied.

`disclaimer` is exactly:

`TheraTax produces estimated tax figures for planning purposes only and is not a substitute for formal accounting or tax advice.`

The arithmetic above is the contract of the tax-engine function. The handler loads the year's transactions and the user's `expenseMethod`, calls that function, and returns the result.

## List envelope and pagination

`GET /transactions` and `GET /invoices` return:

```ts
interface ListResponse<T> {
  items: T[];
  total: number; // rows matching the filter, before skip/limit
  skip: number;  // echoes the request
  limit: number; // echoes the request
}
```

Transactions are ordered by `occurredOn` descending, then `id` descending, so the latest swipe is first in the feed. Invoices are ordered by `issuedOn` descending, then `id` descending.

`limit` is an integer from 1 to 100, default 20. `skip` is an integer ≥ 0, default 0. Outside that range is `400`. The feed asks for a page, not an unbounded dump; 20 matches a phone screen and 100 is the cap. An empty page is `200` with `items: []` and `total: 0`. A new user has an empty feed, and that is a successful response.

`GET /transactions` accepts optional `type=income` or `type=expense`. Any other value is `400`.

`GET /expense-categories` is the bare array above. It is not wrapped and not paginated. There are eight rows.

## Errors

Every error body carries `message`, because that is the field a client has to read. Two shapes occur, and the client must accept both:

- DTO validation (`ValidationPipe`, with whitelist and `forbidNonWhitelisted`): `message` is an array of strings.
- A deliberate `400` / `401` / `403` / `404` / `409`: `message` is a string.

```json
{
  "message": ["amountPence must not be less than 1", "miles must not be greater than 100000"],
  "error": "Bad Request",
  "statusCode": 400
}
```

Non-numeric `:id` is `400` from `ParseIntPipe`:

```json
{
  "message": "Validation failed (numeric string is expected)",
  "error": "Bad Request",
  "statusCode": 400
}
```

A missing row is `404`:

```json
{ "message": "Transaction <id> not found", "error": "Not Found", "statusCode": 404 }
```

The same shape uses `Invoice <id> not found`. Receipt wording is in the Receipt section.

| Situation | Status | `message` |
| --- | --- | --- |
| Missing or invalid bearer token | 401 | `Unauthorized` |
| Login mismatch | 401 | `Invalid email or password` |
| Not onboarded, on transactions, invoices, or tax | 403 | `Complete onboarding before using this resource` |
| Validation, bad `taxYear`, date outside 2026–27, unknown category, miles/amount clashing with `expenseMethod`, bad receipt type or size, `paidOn` before `issuedOn` | 400 | array, or one of the strings specified above |
| Duplicate email | 409 | `Email already registered` |
| Second onboarding | 409 | `Onboarding already completed` |
| Edit or delete of invoice-linked income | 409 | `Invoice income is changed by updating the invoice` |
| Pay an invoice that is already paid | 409 | `Invoice is already paid` |
| Unknown id | 404 | `<Resource> <id> not found` |

## Out of scope

The proposal's phase 2, plus the limits stated above. These are not endpoints and not optional fields:

- Multi-line invoices, recurring invoices, and emailing an invoice to a client
- VAT, including the VAT Flat Rate Scheme
- Scottish Income Tax, student loans, and reliefs other than the full personal allowance
- Motorcycle mileage, and changing `expenseMethod` after onboarding
- A business-use percentage computed by the server
- User-created categories
- Editing an invoice-linked transaction through `/transactions`
- Any tax year other than 2026–27

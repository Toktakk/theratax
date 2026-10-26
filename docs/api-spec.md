# API Spec — TheraTax

This document is the contract, derived from the therapist user flow ([docs/01_user_flow.md](01_user_flow.md)) and from the capstone data model: **User** (account, auth, onboarding profile), **Transaction** (one income or expense, optionally linked to a receipt or an invoice), **ExpenseCategory** (seeded, profession-specific), and **Invoice** (number, recipient, amount, status, generated PDF).

The running app already implements the baseline: auth, onboarding, categories, transactions, receipts, one-line invoices, the tax summary, and the React pages named in [step 12](14_step12_react_pages.md). Workplaces, massage fields, hourly bonuses, the daily income summary, saved clients, and invoices built from those records are specified below and are **not implemented** until [steps 13–17](02_project_plans.md) pass. A section that the running code still does differently says so.

Every clause below cites the flow step or the entity that requires it. Backend modules follow the same ownership: auth, transactions, tax-engine, expense-categories, upload, invoices, and, from the later steps, workplaces, hourly-bonuses, income-summary, and clients.

Phase 2 from the proposal is out of scope and is listed at the end. It is not quietly added to a payload. Day and month invoice lines are step 17, not Phase 2.

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
| POST | `/invoices` | see Invoice | yes |
| GET | `/invoices` | `skip`, `limit` | yes |
| GET | `/invoices/preview` | recipient, period | yes |
| GET | `/invoices/:id` | — | yes |
| PATCH | `/invoices/:id` | `{ status: "paid", paidOn? }` | yes |
| GET | `/invoices/:id/pdf` | — | yes |
| GET | `/tax/summary` | `taxYear` (int, optional) | yes |
| POST | `/workplaces` | `{ name, kind }` | yes |
| GET | `/workplaces` | `skip`, `limit` | yes |
| POST | `/hourly-bonuses` | see Hourly bonus | yes |
| GET | `/hourly-bonuses` | `skip`, `limit`, optional `workplaceId`, `date` | yes |
| GET | `/hourly-bonuses/:id` | — | yes |
| PATCH | `/hourly-bonuses/:id` | partial Hourly bonus fields | yes |
| DELETE | `/hourly-bonuses/:id` | — | yes |
| GET | `/income/summary` | `date` (optional) | yes |
| POST | `/clients` | `{ name }` | yes |
| GET | `/clients` | `skip`, `limit` | yes |
| GET | `/clients/:id` | — | yes |
| PATCH | `/clients/:id` | `{ name }` | yes |
| DELETE | `/clients/:id` | — | yes |

`GET /invoices/preview` is registered before `GET /invoices/:id` so the path `preview` is not parsed as an id.

Rows from `POST /workplaces` through `DELETE /clients` are **not implemented**. `GET /invoices/preview` is **not implemented**. The one-line `POST /invoices` body below is what the running code accepts. [Step 17](19_step17_invoices_from_records.md) replaces that body.

Authenticated routes require `Authorization: Bearer <accessToken>`. A missing or invalid token is `401`.

Logging a swipe is one request (`POST /transactions`). Attaching a photo is a second request, and only when there is a photo. The category hint is not a request. That is flow steps 2–3: near-instant, between clients. Invoice PDF and the tax summary are allowed to take a short load (flow steps 4–5).

## Money, dates, and the tax year

Money is an integer number of pence. Mileage for 2026–27 is 55p, and the tax engine is a pure function with unit tests (proposal: tax logic stays isolated from HTTP). A float would make those totals ambiguous.

Dates that are a civil day (`occurredOn`, `issuedOn`, `paidOn`, invoice period bounds, the daily-summary `date`, tax-year bounds) are `DD-MM-YYYY`. Timestamps (`onboardedAt`, `expiresAt`, `createdAt`, `updatedAt`) are ISO 8601. "Today" and the default tax year use the calendar date in `Europe/London`. The tax year turns on 6 April, which is a UK civil date; UTC would pick the wrong day around midnight.

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

Transactions, invoices, the tax summary, workplaces, hourly bonuses, the daily income summary, and clients require a completed onboarding. Calling them before that is `403`:

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

### Massage income (step 14, not implemented)

The running create and update DTOs do not accept the fields in this subsection. [Step 14](16_step14_massage_income.md) adds them on the same `Transaction` model. There is no second income table.

```ts
type MassageType =
  | "deep_tissue"
  | "thai_oil"
  | "thai_yoga"
  | "aroma"
  | "pregnancy"
  | "lymphatic"
  | "foot"
  | "swedish"
  | "back_neck"
  | "sport"
  | "hot_stone"
  | "other";
```

| Value | Name on a line or in the feed |
| --- | --- |
| `deep_tissue` | Deep Tissue |
| `thai_oil` | Thai Oil Massage |
| `thai_yoga` | Thai Yoga |
| `aroma` | Aroma |
| `pregnancy` | Pregnancy |
| `lymphatic` | Lymphatic |
| `foot` | Foot Massage |
| `swedish` | Swedish |
| `back_neck` | Back & Neck |
| `sport` | Sport Massage |
| `hot_stone` | Hot Stone |
| `other` | Other |

After step 14, income may also send:

```ts
interface MassageIncomeFields {
  massageType?: MassageType;
  customMassageType?: string;   // 1–100 characters, required only when massageType is "other"
  basePence?: number;           // integer, 1 .. 100_000_000, required when massageType is set
  additionalFeePence?: number;  // integer, 0 .. 100_000_000, default 0; the user types this per record
  workplaceId?: number;         // an existing workplace owned by this user
}
```

`createdAt` and `updatedAt` are present on every transaction after step 14, as ISO 8601. The client does not send them.

Rules, checked in the service after the pipe:

- Cash income may still send only `amountPence`. Massage keys are then omitted on the response.
- When `massageType` is set, `basePence` is required. `additionalFeePence` omitted means `0` and the response includes `0`. The server sets `amountPence = basePence + additionalFeePence`. A client `amountPence` that is not that sum is `400` `"Amount must equal base plus additional fee"`. If the sum is above `100_000_000`, the message is `400` `"Amount is above the maximum"`.
- The fee is whatever the user entered. The server does not look up a fee from the massage type.
- `customMassageType` is required when the type is `other`, and forbidden otherwise. Missing: `400` `"Custom massage type is required"`. Present on another type: `400` `"Custom massage type is only valid for other"`.
- A massage type on an expense is `400` `"Massage type is only valid on income"`. A base, a fee, or a custom type on an expense is `400` `"Additional fee is only valid on massage income"`. `workplaceId` on an expense is `400` `"Workplace is only valid on income"`.
- `workplaceId` must be a workplace owned by the token user. A missing row and another user's id are both `404` `"Workplace <id> not found"`. The transaction stores the id, not a copy of the name.
- `PATCH` may change these fields. The merged row is checked again, and `amountPence` is recomputed when `basePence` is set. `type` stays off the update DTO.

[Step 17](19_step17_invoices_from_records.md) adds optional `clientId` on income. A row may set `workplaceId` or `clientId`, not both. Both is `400` `"Income refers to a workplace or a client, not both"`. Another user's client is `404` `"Client <id> not found"`. That field is **not implemented** until step 17.

Postman, after step 14, with Bearer `{{token}}` and a workplace id from step 13: `POST /transactions` with `type` `income`, `massageType` `swedish`, `basePence` `1000`, `additionalFeePence` `200`, and `workplaceId` returns `201`. `amountPence` is `1200`. `additionalFeePence` `200` is £2. The same body with `additionalFeePence` `-1` is `400` and `message` is an array. An expense body that also sends `massageType` is `400` `"Massage type is only valid on income"`. `massageType` `other` without `customMassageType` is `400` `"Custom massage type is required"`. A list of one income and one expense on the same day returns the income first. `createdAt` and `updatedAt` are ISO 8601 strings. `npm test` still passes.

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

A photo is optional. `POST /transactions` never takes a file. Saving income or an expense with no upload returns `201` and `hasReceipt: false`, and it does not create a `Receipt` row. The upload routes stay for any transaction that has a photo, including expenses.

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

The running code matches this section: one line, and paying creates the income row. [Step 17](19_step17_invoices_from_records.md) supersedes creation and payment for new invoices. It does not delete rows this section already stored. Read [Invoices from records](#invoices-from-records-step-17-not-implemented) before treating this section as the lasting rule.

One line. Client, service, amount, then a PDF. That is the baseline invoice.

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

`incomePence` is the sum of income transactions with `occurredOn` inside the period. That includes swiped income and, until step 17, invoice income created on pay. After [step 16](18_step16_daily_income_summary.md) it also adds hourly-bonus `totalPence` for days inside the period, once. It does not add `basePence` on top of `amountPence`, and it does not add invoice `amountPence`. With no bonus rows the extra sum is 0, so the step 9 check is unchanged. `allowableExpensesPence` is the sum of expense transactions in the period. A loss stays visible on `netProfitPence`. Tax and National Insurance use `taxableProfitPence`. The arithmetic stays in `calculateTaxSummary`. The handler only loads the two sums.

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

`GET /transactions`, `GET /invoices`, `GET /workplaces`, `GET /hourly-bonuses`, and `GET /clients` return:

```ts
interface ListResponse<T> {
  items: T[];
  total: number; // rows matching the filter, before skip/limit
  skip: number;  // echoes the request
  limit: number; // echoes the request
}
```

Until [step 14](16_step14_massage_income.md), transactions are ordered by `occurredOn` descending, then `id` descending. After that step the order is `occurredOn` descending, then `income` before `expense`, then `id` descending. One list is enough for the feed. `type=income` and `type=expense` stay as filters. Invoices are ordered by `issuedOn` descending, then `id` descending.

`limit` is an integer from 1 to 100, default 20. `skip` is an integer ≥ 0, default 0. Outside that range is `400`. The feed asks for a page, not an unbounded dump; 20 matches a phone screen and 100 is the cap. An empty page is `200` with `items: []` and `total: 0`. A new user has an empty feed, and that is a successful response.

`GET /transactions` accepts optional `type=income` or `type=expense`. Any other value is `400`.

`GET /expense-categories` is the bare array above. It is not wrapped and not paginated. There are eight rows.

## Workplace (step 13, not implemented)

A workplace is a spa or a clinic the user bills or works at. The transaction stores `workplaceId`. It does not copy the name. Invoice issue copies the name onto the invoice, in step 17, so a later rename does not rewrite an issued invoice.

```ts
interface Workplace {
  id: number;
  name: string;
  kind: "spa" | "clinic";
  createdAt: string;
  updatedAt: string;
}
```

`POST /workplaces` body:

```ts
interface CreateWorkplace {
  name: string;              // trimmed, then 1–200 characters
  kind: "spa" | "clinic";
}
```

`201` returns the `Workplace`. The same user, the same `kind`, and the same name ignoring case is `409`:

```json
{ "message": "Workplace already saved", "error": "Conflict", "statusCode": 409 }
```

`North Spa` and `north spa` are the same name. A spa and a clinic may share a display name. The stored name is the trimmed text from the first save.

`GET /workplaces` uses the list envelope. Order is `name` ascending, then `id` ascending. Only this user's rows are returned.

Bearer is required. Before onboarding the response is `403` `"Complete onboarding before using this resource"`. A missing token is `401` `"Unauthorized"`.

Postman: `POST` `{ "name": "North Spa", "kind": "spa" }` returns `201`. The same name with different capital letters returns `409` `"Workplace already saved"`. `{ "name": "North Spa", "kind": "clinic" }` returns `201`. `GET /workplaces` with a second user's token does not include the first user's ids. An empty `name` or `kind` `"hotel"` is `400` and `message` is an array.

## Hourly bonus (step 15, not implemented)

A bonus counts only minutes the user recorded as bonus-eligible. Working extra hours does not create a bonus by itself. The bonus is not an income transaction. The daily summary and the tax summary each add `totalPence` once. An invoice line snapshots that total and does not cause a second add when the invoice is paid.

Hours are stored as `eligibleMinutes`, an integer from 1 to 1440. One minute is the precision. 90 minutes is 1.5 hours. The client does not send a fractional hour and does not send `totalPence`.

```ts
interface HourlyBonus {
  id: number;
  workplaceId: number;
  occurredOn: string;         // DD-MM-YYYY
  eligibleMinutes: number;
  ratePencePerHour: number;   // integer pence, for example £2 is 200
  totalPence: number;         // server-computed
  note?: string;
  createdAt: string;
  updatedAt: string;
}
```

`POST /hourly-bonuses`:

```ts
interface CreateHourlyBonus {
  workplaceId: number;
  occurredOn?: string;        // default: today in Europe/London
  eligibleMinutes: number;    // integer, 1 .. 1440
  ratePencePerHour: number;   // integer, 1 .. 100_000_000
  note?: string;              // 1–500 characters when present
}
```

`totalPence` is `round(eligibleMinutes * ratePencePerHour / 60)`, half away from zero, for a positive product. Divide the product by 60. If the remainder is 30 or more, add one penny. 90 minutes at 200 pence per hour is `300`. The function lives next to the bonus service and has a unit test. The controller does not contain the division.

`201` returns the `HourlyBonus`. One row per user, workplace, and civil date. A second create for that triple is `409` `"Hourly bonus already recorded for this workplace and date"`. The workplace must belong to the user, or the response is `404` `"Workplace <id> not found"`. The date must fall in the 2026–27 tax year.

`GET /hourly-bonuses` uses the list envelope, ordered by `occurredOn` descending, then `id` descending. Optional query `workplaceId` and `date` (`DD-MM-YYYY`) filter that user's rows. `GET /hourly-bonuses/:id` returns one row. A missing id and another user's id are `404` `"Hourly bonus <id> not found"`.

`PATCH` accepts any subset of `workplaceId`, `occurredOn`, `eligibleMinutes`, `ratePencePerHour`, and `note`. The server recomputes `totalPence`. Sending `totalPence` is `400` from the pipe, because it is not on the DTO. Moving the row onto a workplace and date that already has a bonus is the same `409`. `DELETE` returns `204`.

Missing `eligibleMinutes`, a negative minute count, a value above 1440, a missing rate, and a negative rate are `400` and `message` is an array.

Postman: create 90 minutes at `ratePencePerHour` `200` and read `totalPence` `300`. Create again for the same workplace and date and read `409`. Omit `eligibleMinutes` and read an array in `message`. Send `eligibleMinutes` `1441` and read `400`.

## Daily income summary (step 16, not implemented)

`GET /income/summary` returns totals computed from income transactions and hourly bonuses. It does not read or write a stored daily total. It does not add invoice amounts. Deleting or editing a source row changes the next response.

Query `date` is optional `DD-MM-YYYY`. Omitted, it is today in `Europe/London`. A date outside the 2026–27 tax year is `400` `"Date is outside the 2026-27 tax year"`.

```ts
interface DailyIncomeSummary {
  date: string;
  basePence: number;
  additionalFeePence: number;
  hourlyBonusPence: number;
  totalPence: number;
  byWorkplace: WorkplaceDay[];
  byMassageType: MassageTypeDay[];
}

interface WorkplaceDay {
  workplaceId: number;
  name: string;
  kind: "spa" | "clinic";
  basePence: number;
  additionalFeePence: number;
  hourlyBonusPence: number;
  totalPence: number;
}

interface MassageTypeDay {
  massageType: MassageType;
  customMassageType?: string;
  basePence: number;
  additionalFeePence: number;
  totalPence: number;
}
```

For each income transaction on that civil date:

- When `basePence` is set, add `basePence` to base and `additionalFeePence` (or 0) to fees. Do not also add `amountPence`.
- When `basePence` is absent, add `amountPence` to base and add nothing to fees.

`hourlyBonusPence` is the sum of bonus `totalPence` on that date. `totalPence` is base plus fees plus bonuses.

`byWorkplace` has one object per workplace that has income or a bonus that day. Income with no workplace stays in the top-level totals and is absent from `byWorkplace`. `byMassageType` includes only rows that have `massageType`. Rows with the same type and the same custom text are one bucket. Different custom text stays separate. Cash income with no massage type stays in the top-level base and is absent here.

An empty day is `200` with every pence field `0` and both arrays empty.

The grouping function is pure and unit-tested: inputs of base `1000`, fee `200`, and bonus `300` return `totalPence` `1500`, and adding the transaction `amountPence` again fails that test. The handler loads rows and calls it.

`GET /tax/summary` adds the same bonus `totalPence` values once for the tax year, inside the handler, on top of income `amountPence`. It still calls `calculateTaxSummary` with the two sums. No bonus rows means the step 9 figures do not move.

Postman: one Swedish income with `basePence` `1000` and `additionalFeePence` `200`, plus a bonus of `totalPence` `300` on the same date, returns `basePence` `1000`, `additionalFeePence` `200`, `hourlyBonusPence` `300`, `totalPence` `1500`. Delete that income. The next summary drops the base and the fee and keeps the bonus. `GET /tax/summary` for a user with that bonus is `300` higher than the same user with the bonus deleted, and it is not `600` higher. An issued invoice does not change this summary.

## Client (step 17, not implemented)

A client is a person the user invoices, distinct from a workplace. The feed reuses the id. The invoice copies the name at issue time.

```ts
interface Client {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
}
```

`POST /clients` takes `{ name }` trimmed to 1–200 characters and returns `201`. The same user and the same name ignoring case is `409` `"Client already saved"`. `GET /clients` uses the list envelope, ordered by `name` ascending, then `id` ascending. `GET /clients/:id` returns one. A missing id and another user's id are `404` `"Client <id> not found"`.

`PATCH /clients/:id` takes `{ name }` and returns `200`. A rename does not change `recipientName` on an invoice already issued. `DELETE` returns `204`. A client referenced by a transaction or an invoice is `409` `"Client is used by a record"`.

Postman: create `Ada Client`, create `ada client`, and read `409` on the second. With another user's token, `GET /clients/:id` for the first id is `404`.

## Invoices from records (step 17, not implemented)

Earned income is the feed transaction and the hourly bonus. An invoice is a bill for a recipient and a period. Creating an invoice does not insert a transaction. Paying it does not insert a transaction. Rows that step 11 already created on pay stay where they are, including their `invoiceId`. A transaction that still has `invoiceId` stays immutable with `409` `"Invoice income is changed by updating the invoice"`.

New invoices do not set `invoiceId` on the source transaction. The link is the line's `sourceTransactionId` or `sourceBonusId`. Those source rows stay editable. The issued lines do not change when the source changes. Deleting a source sets the line's source id to null and leaves the line amounts in place. The next daily summary no longer includes the deleted source. The invoice total does not change.

```ts
interface InvoiceLine {
  kind: "service" | "additional_fee" | "hourly_bonus";
  description: string;
  quantity: number;
  quantityUnit: "session" | "minute";
  ratePence: number;
  amountPence: number;
  occurredOn: string;
  sourceTransactionId?: number;
  sourceBonusId?: number;
}

interface RecordedInvoice {
  id: number;
  number: string;
  recipientKind: "spa" | "clinic" | "client";
  recipientName: string;
  workplaceId?: number;
  clientId?: number;
  period: "day" | "month";
  periodStart: string;
  periodEnd: string;
  issuedOn: string;
  amountPence: number;
  status: "issued" | "paid";
  paidOn?: string;
  lines: InvoiceLine[];
  transactionId?: number;   // only on a baseline invoice that step 11 already linked
}
```

`clientName` and `service` remain on invoices created before step 17. New invoices omit them. `recipientName` is the workplace or client name copied at creation.

`GET /invoices/preview` and `POST /invoices` take the same fields. Preview is a query. Create is a JSON body. Preview writes nothing.

```ts
interface InvoiceFromRecords {
  recipientKind: "spa" | "clinic" | "client";
  workplaceId?: number;     // required for spa and clinic
  clientId?: number;        // required for client
  period: "day" | "month";
  date?: string;            // required when period is day
  month?: number;           // 1 .. 12, required when period is month
  year?: number;            // required when period is month
  issuedOn?: string;        // default: today in Europe/London
}
```

The workplace's `kind` must equal `recipientKind`. A clinic id sent as a spa is `400` `"Workplace kind does not match recipient"`. A workplace or client the user does not own is `404` with `Workplace <id> not found` or `Client <id> not found`. Both ids are optional on the DTO. `workplaceId` on a client recipient, or `clientId` on a spa or clinic recipient, is `400` `"Recipient does not take that id"`. A stored income row that has both `workplaceId` and `clientId` is `400` `"Income refers to a workplace or a client, not both"` when it is saved. That row is not eligible to bill.

`period` `day` uses that civil `date` as both bounds. `period` `month` uses the first and last civil day of that month, then clips both ends to `06-04-2026` through `05-04-2027`. A date or a month with no day inside that window is `400` `"Date is outside the 2026-27 tax year"`. `issuedOn` uses the same window. It may differ from the period.

Eligible income is this user's `income` rows whose `occurredOn` is inside the clipped period, which are not already referenced by an invoice line, and which match the recipient: `workplaceId` for a spa or clinic, `clientId` for a client. Expenses are never eligible. A row that has `invoiceId` set is not eligible. Eligible bonuses are this user's bonuses for that workplace and period that are not already referenced by an invoice line. Client invoices do not include bonuses.

Lines are ordered by `occurredOn` ascending, then service, then additional fee, then hourly bonus. A monthly invoice uses that order as the breakdown by date. The line builder is a pure function. For each eligible income it emits a `service` line: `quantity` 1, `quantityUnit` `"session"`, `ratePence` and `amountPence` equal to `basePence` when that is set, otherwise `amountPence`. `description` is the massage name from the table above, the custom text when the type is `other`, or `"Income"` when there is no massage type. When `additionalFeePence` is greater than 0 it also emits an `additional_fee` line with quantity 1, `quantityUnit` `"session"`, and that fee as both rate and amount. Each eligible bonus emits an `hourly_bonus` line: `quantity` is `eligibleMinutes`, `quantityUnit` `"minute"`, `ratePence` is `ratePencePerHour`, `amountPence` is the stored `totalPence`, `description` is `"Hourly bonus"`.

`amountPence` on the invoice is the sum of the line amounts. The client cannot send it. Preview returns `200` with `lines`, `amountPence`, the recipient, and the period bounds. An empty eligible set is `200` with `lines: []` and `amountPence: 0`. `POST` of an empty set is `400` `"No records to invoice for this recipient and period"`. `POST` of a non-empty set returns `201` and the `RecordedInvoice`, status `issued`, with the lines stored. A later preview or create skips those sources. There is no second bill for the same work.

`PATCH` is still only `{ status: "paid", paidOn? }`. `paidOn` defaults to today, must be on or after `issuedOn`, and must sit in the tax year. The handler sets status and `paidOn`. It does not create a transaction. A second pay is `409` `"Invoice is already paid"`.

`GET /invoices/:id/pdf` is unchanged in status and headers. The PDF builder stays a pure function of the invoice and the user's name. For an invoice with lines it draws the recipient name, the period, each line's description, quantity, rate, and amount, and the total. A baseline invoice with no lines still draws the single client, service, and amount. The unit test does not use HTTP. The bytes still start with `%PDF`.

Postman, after steps 13–16: save a spa, log Swedish income of base `1000` and fee `200` on `01-05-2026` for that spa, log a bonus of 90 minutes at `200` pence per hour on that day. `GET /invoices/preview` for that spa, `period` `day`, and that date returns three lines and `amountPence` `1500` (service 1000, fee 200, bonus 300). The same spa with `period` `month`, `month` `5`, and `year` `2026` includes that day and excludes a row dated `01-06-2026`. `POST /invoices` with the same fields returns `201`. `GET /transactions?type=income` has no new row whose note is the invoice number. `PATCH` to `paid` returns `200` with `paidOn` and still no new income row. `GET /invoices/:id` after a `PATCH` of the source transaction's `basePence` still shows the original line amount. A second `POST` for that day and spa is `400` `"No records to invoice for this recipient and period"`. A clinic workplace and a saved client each get their own preview that does not include the spa's rows. Another user's workplace id is `404`. `GET /invoices/:id/pdf` is `200` with `application/pdf`. `npm test` still passes, including the tax, mileage, and PDF tests.

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
| Not onboarded, on transactions, invoices, tax, workplaces, bonuses, the daily summary, or clients | 403 | `Complete onboarding before using this resource` |
| Validation, bad `taxYear`, date outside 2026–27, unknown category, miles/amount clashing with `expenseMethod`, bad receipt type or size, `paidOn` before `issuedOn`, massage or recipient rules in the later steps | 400 | array, or one of the strings specified above |
| Duplicate email | 409 | `Email already registered` |
| Second onboarding | 409 | `Onboarding already completed` |
| Edit or delete of income that has `invoiceId` | 409 | `Invoice income is changed by updating the invoice` |
| Pay an invoice that is already paid | 409 | `Invoice is already paid` |
| Duplicate workplace or client name for this user | 409 | `Workplace already saved` or `Client already saved` |
| Second bonus for the same user, workplace, and date | 409 | `Hourly bonus already recorded for this workplace and date` |
| Delete a client that a transaction or invoice still uses | 409 | `Client is used by a record` |
| Unknown id, including another user's id | 404 | `<Resource> <id> not found` |

## Out of scope

The proposal's phase 2, plus the limits stated above. These are not endpoints and not optional fields:

- Recurring invoices, and emailing an invoice to a client. Day and month lines are step 17
- A client-supplied invoice total, bonus total, or `amountPence` that disagrees with base plus fee. The server computes those
- VAT, including the VAT Flat Rate Scheme
- Scottish Income Tax, student loans, and reliefs other than the full personal allowance
- Motorcycle mileage, and changing `expenseMethod` after onboarding
- A business-use percentage computed by the server
- User-created categories
- Editing or deleting a transaction that has `invoiceId` through `/transactions`. A step 17 source row has no `invoiceId` and stays editable; the issued line amounts do not follow that edit
- Any tax year other than 2026–27

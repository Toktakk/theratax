# API Spec — TheraTax

This document is the contract, derived from the therapist user flow ([docs/01_user_flow.md](01_user_flow.md)) and from the capstone data model: **User** (account, auth, onboarding profile), **Transaction** (one income or expense, optionally linked to a receipt or an invoice), **ExpenseCategory** (seeded, profession-specific), and **Invoice** (number, recipient, amount, status, generated PDF).

The running source implements auth, onboarding, categories, transactions, receipts, invoices, the tax summary, workplaces, massage income, a separate hourly-bonus module, the daily income summary, saved clients, and invoices built from records. The React pages in [step 12](14_step12_react_pages.md) are the baseline screens. Current screen requirements are in [Page plans](20_plan_pages.md).

This file is the required contract. Where the running source still uses `HourlyBonus`, `/hourly-bonuses`, or `hourlyBonusPence`, that code does not match this contract. Bonus is `bonusPence` on the massage transaction. Do not extend the hourly-bonus module. `body_scrub` and `request` are massage types.

Every clause below cites the flow step or the entity that requires it. Backend modules follow the same ownership: auth, transactions, tax-engine, expense-categories, upload, invoices, and, from the later steps, workplaces, income-summary, and clients. Bonus stays on the transaction.

Phase 2 from the proposal is out of scope and is listed at the end. It is not quietly added to a payload. Day and month invoice lines are step 17, not Phase 2.

## Endpoints

| Method | Path | Query / Body | Auth |
| --- | --- | --- | --- |
| POST | `/auth/register` | `{ email, password, name }` | no |
| POST | `/auth/login` | `{ email, password }` | no |
| GET | `/users/me` | — | yes |
| PATCH | `/users/me/onboarding` | `{ practiceType, expenseMethod }` | yes |
| PATCH | `/users/me/address` | business address | yes |
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
| POST | `/workplaces` | `{ name, kind, hourRatePence, hourExtras? }` | yes |
| GET | `/workplaces` | `skip`, `limit` | yes |
| PATCH | `/workplaces/:id` | `{ name, hourRatePence, hourExtras }` | yes |
| GET | `/income/summary` | `date` (optional) | yes |
| POST | `/clients` | `{ name, hourRatePence, hourExtras? }` | yes |
| GET | `/clients` | `skip`, `limit` | yes |
| GET | `/clients/:id` | — | yes |
| PATCH | `/clients/:id` | `{ name, hourRatePence?, hourExtras? }` | yes |
| DELETE | `/clients/:id` | — | yes |

`GET /invoices/preview` is registered before `GET /invoices/:id` so the path `preview` is not parsed as an id.

The running source already has workplaces, clients, the daily summary, preview, and the recipient-and-period invoice body. It also still has `/hourly-bonuses`. That route is not this contract. The React invoice page still sends the old one-line body until [the invoice page plan](25_page_invoice.md) is built, and that old body gets `400`.

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
  addressLine1?: string;
  addressLine2?: string;
  town?: string;
  postcode?: string;
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

## Business address

`PATCH /users/me/address` stores the sole trader's address used on invoices. It can be called before or after onboarding, and it can be called again to correct a mistake. The [profile page](28_page_profile.md) is the screen that calls it again after onboarding. Onboarding itself stays one-time. The request and response shapes stay as written here.

```ts
interface PostalAddress {
  addressLine1: string;   // trimmed, 1–100 characters
  addressLine2?: string;  // omitted when blank, up to 100 characters
  town: string;           // trimmed, 1–80 characters
  postcode: string;       // UK postcode, stored uppercase with one space, for example SW1A 1AA
}
```

`200` returns the `User`. The four address fields are omitted until an address is saved. A blank line or town is `400` `"Address is required"`. A postcode that is not a UK postcode is `400` `"Enter a UK postcode"`.

Issuing an invoice copies this address onto the invoice. A later change does not rewrite an invoice that was already issued.

`flat_rate` rates for 2026–27, car or van: **55p** per mile for the first 10,000 business miles in the tax year, **25p** after that. Motorcycle rates are out of scope.

Transactions, invoices, the tax summary, workplaces, the daily income summary, and clients require a completed onboarding. Calling them before that is `403`:

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

`hasReceipt` is always present because the feed renders the camera state from the list payload. It is `true` when the one receipt or payment-slip photo is stored. The list does not include a file URL. A second request per row would break the 30–60 second path. The other keys are omitted when they do not apply, so a cash income row stays small.

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

### Massage income (step 14)

Massage fields live on the same `Transaction` model. There is no second income table. The running source has the types below. [Step 14](16_step14_massage_income.md) adds the type, the base, the fee, and the workplace. [Step 15](17_step15_bonus.md) adds `bonusPence` and changes the sum.

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
  | "body_scrub"
  | "request"
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
| `body_scrub` | Body Scrub |
| `request` | Request |
| `other` | Other |

After step 14, income may also send the fields below. `bonusPence` arrives in step 15. Until that step, omit it.

```ts
interface MassageIncomeFields {
  massageType?: MassageType;
  customMassageType?: string;   // 1–100 characters, required only when massageType is "other"
  basePence?: number;           // integer, 1 .. 100_000_000; required when massageType is set and minutes is omitted
  additionalFeePence?: number;  // integer, 0 .. 100_000_000, default 0; the user types this per record
  bonusPence?: number;          // integer, 0 .. 100_000_000, default 0; the user types this per record
  minutes?: number;             // integer, 1 .. 1_000_000; the feed sends this instead of basePence
  workplaceId?: number;         // an existing workplace owned by this user
}
```

`createdAt` and `updatedAt` are present on every transaction after step 14, as ISO 8601. The client does not send them.

Rules, checked in the service after the pipe:

- Cash income may still send only `amountPence`. Massage keys are then omitted on the response.
- When `massageType` is set and `minutes` is omitted, `basePence` is required. When `minutes` is sent, the server sets `basePence` from that workplace or client. A matching `hourExtras` row is added to `hourRatePence`. `other` matches `customMassageType`, ignoring case. Every type without a matching extra uses `hourRatePence` alone. `basePence = floor((minutes * effectiveRatePence + 30) / 60)`. The row must name `workplaceId` or `clientId`. Neither is `400` `"A workplace or a client is required"`. A stored rate of 0 is `400` `"Hour rate is required"`. A sent `basePence` that is not the computed value is `400` `"Base amount must equal hours times the hour rate"`. `minutes` on cash income or an expense is `400` `"Minutes are only valid on massage income"`.
- `additionalFeePence` omitted means `0` and the response includes `0`. `bonusPence` omitted means `0` and the response includes `0`. The server sets `amountPence = basePence + additionalFeePence + bonusPence`. A client `amountPence` that is not the sum is `400` `"Amount must equal base plus additional fee and bonus"` when the bonus is greater than 0, and `"Amount must equal base plus additional fee"` when the bonus is 0. If the sum is above `100_000_000`, the message is `400` `"Amount is above the maximum"`.
- The fee is whatever the user entered. The server does not look up a fee from the massage type. The bonus is whatever the user entered. The hour rate is read from the workplace or the client. Pregnancy, hot stone, body scrub, request, and a matching other name add that row's hour extra. A later edit of the workplace or client does not change `basePence` already stored on a transaction.
- `customMassageType` is required when the type is `other`, and forbidden otherwise. Missing: `400` `"Custom massage type is required"`. Present on another type: `400` `"Custom massage type is only valid for other"`.
- A massage type on an expense is `400` `"Massage type is only valid on income"`. A base, a fee, or a custom type on an expense is `400` `"Additional fee is only valid on massage income"`. A bonus on an expense, or a bonus without a massage type, is `400` `"Bonus is only valid on massage income"`. `workplaceId` on an expense is `400` `"Workplace is only valid on income"`.
- `workplaceId` must be a workplace owned by the token user. A missing row and another user's id are both `404` `"Workplace <id> not found"`. The transaction stores the id, not a copy of the name.
- `PATCH` may change these fields. The merged row is checked again, and `amountPence` is recomputed when `basePence` is set. `type` stays off the update DTO.

[Step 17](19_step17_invoices_from_records.md) adds optional `clientId` on income. A row may set `workplaceId` or `clientId`, not both. Both is `400` `"Income refers to a workplace or a client, not both"`. Another user's client is `404` `"Client <id> not found"`.

Postman, after step 14, with Bearer `{{token}}` and a workplace id from step 13: `POST /transactions` with `type` `income`, `massageType` `swedish`, `basePence` `1000`, `additionalFeePence` `200`, and `workplaceId` returns `201`. `amountPence` is `1200`. `additionalFeePence` `200` is £2. The same body with `additionalFeePence` `-1` is `400` and `message` is an array. An expense body that also sends `massageType` is `400` `"Massage type is only valid on income"`. `massageType` `other` without `customMassageType` is `400` `"Custom massage type is required"`. `massageType` `body_scrub` is `201`. A list of one income and one expense on the same day returns the income first. `createdAt` and `updatedAt` are ISO 8601 strings. `npm test` still passes.

Postman, after step 15: the same Swedish shape with `basePence` `6000`, `additionalFeePence` `200`, and `bonusPence` `500` returns `201`. `amountPence` is `6700` (£67). Omit `bonusPence` and the response includes `bonusPence: 0` and `amountPence` `6200`. A negative `bonusPence` is `400` and `message` is an array. `bonusPence` on an expense is `400` `"Bonus is only valid on massage income"`. There is no `/hourly-bonuses` route in this contract.

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

A photo is optional. `POST /transactions` never takes a file. Saving income or an expense with no upload returns `201` and `hasReceipt: false`, and it does not create a `Receipt` row. The upload routes stay for any transaction that has a photo, including expenses. The photo may be a receipt or a payment slip. The transaction keeps one image, not one of each.

`POST /transactions/:id/receipt` is `multipart/form-data` with a single field `file`. The bytes are the image a camera capture or a file picker produced. The request has no filesystem path. Bearer authentication and completed onboarding are required, as for the other transaction routes.

The server reads the bytes. It does not trust the multipart type or the filename. A camera blob may arrive as `application/octet-stream` or with an empty type. The stored `contentType` is the type detected from the bytes:

- `image/jpeg`
- `image/png`
- `image/webp`

HEIC is rejected. A camera capture has to be sent as one of those three.

Size: 1 byte through 10 MiB (`10 * 1024 * 1024`). The limit is `MAX_RECEIPT_BYTES` in the upload module. The multer limit and the service use that same value.

`201`:

```ts
interface Receipt {
  transactionId: number;
  contentType: string;
  byteSize: number;
}
```

`contentType` is the detected type. The body has no `url` and no storage key. A second upload replaces the photo and returns `201` again. There is still one receipt row, so a retry does not add another and the response is not `409`.

The object is private. The server generates the storage key. An existing row whose key was stored earlier still opens.

`GET /transactions/:id/receipt` returns `200`:

```ts
interface ReceiptUrl {
  url: string;       // short-lived signed URL
  expiresAt: string; // 15 minutes from issue
}
```

The client uses `url` as an image source. The API does not stream the bytes and does not return a permanent public URL. The signature lifetime is 900 seconds. `hasReceipt` on the transaction is how the client knows a photo is saved without requesting this link.

No photo yet, and the transaction exists: `404` `{ "message": "Receipt for transaction <id> not found", "error": "Not Found", "statusCode": 404 }`. Missing transaction, including another user's id: `404` `{ "message": "Transaction <id> not found", ... }`, on upload, on the link, and on delete. `DELETE` of an existing photo returns `204`.

A missing file, an empty file, a file over 10 MiB, a type outside the three images, or bytes that are not a complete image of that type: `400` `{ "message": "Receipt must be an image up to 10 MiB", "error": "Bad Request", "statusCode": 400 }`.

Saving the object or the receipt row failed: `500` `{ "message": "Receipt could not be stored", "error": "Internal Server Error", "statusCode": 500 }`. The receipt row is unchanged. Signing the link failed: `500` `{ "message": "Receipt could not be opened", ... }`. Deleting the stored image failed: `500` `{ "message": "Receipt could not be removed", ... }`.

No new receipt column is required. The row already stores the transaction, the detected content type, the byte size, and the storage key.

## Invoice (flow step 4; proposal: Invoice)

This section is the baseline one-line invoice. The running create body is the recipient and period in [Invoices from records](#invoices-from-records-step-17). Paying a new invoice does not create an income row. Rows this section already stored stay, including an income row step 11 linked on pay. The React page still sends the one-line body until [the invoice page plan](25_page_invoice.md) is built.

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
  number: string;            // "TT-0001", unique across all invoices, TT- plus at least 4 digits
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

Cash basis is the standard record for a sole trader: income counts when the money is received, not when the invoice is sent ([GOV.UK: cash basis](https://www.gov.uk/simpler-income-tax-cash-basis)). `PATCH /invoices/:id` with `{ status: "paid", paidOn? }` is the moment of receipt. `paidOn` defaults to today and must be on or after `issuedOn`. While this one-line invoice is the body you are checking, the handler creates the linked income transaction in the same action. That row is:

- `type: "income"`
- `amountPence` copied from the invoice
- `occurredOn` = `paidOn`
- `note` = the invoice `number`, so the feed row is identifiable
- `invoiceId` set
- no category, no miles

[Step 17](19_step17_invoices_from_records.md) stops that write for a new invoice. Rows already linked keep `transactionId`.

The `200` body is the `Invoice`, now including `paidOn` and `transactionId`. The tax summary includes a step 11 income row because that row's `invoiceId` points at a paid invoice. An unpaid invoice stays out of the estimate. Feed income stays out until the invoice that bills it is paid.

Logging income on the feed records the amount for the daily summary. It does not by itself enter the tax estimate. The server does not try to detect a duplicate between a feed row and an invoice.

`issued` → `paid` is the only transition. A second pay is `409` `"Invoice is already paid"`. Any other `PATCH` body is `400`. Invoice fields other than status are fixed at creation.

`GET /invoices/:id/pdf` returns `200` with `Content-Type: application/pdf` and `Content-Disposition: attachment; filename="<number>.pdf"`. The PDF is the A4 invoice described in Invoices from records. Generation is synchronous. Flow step 4 may take a short load. The PDF builder is a pure function of the invoice and the user's name and email, called by the handler, so it can be unit-tested without HTTP.

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

`incomePence` is the sum of income `amountPence` for rows with `occurredOn` inside the period that are linked to an invoice whose status is `paid`. A row counts when its `invoiceId` points at a paid invoice, or when one of its invoice lines belongs to a paid invoice. Logged income with no invoice, and income on an invoice that is still `issued`, are excluded. Each row is included once. A massage row's `amountPence` is base plus additional fee plus bonus, so the bonus is inside this sum once. Do not add `bonusPence` again. Do not add `basePence` on top of `amountPence`, and do not add invoice `amountPence`. Paying an invoice does not insert another income row. `allowableExpensesPence` is the sum of expense transactions in the period, including expenses that have no invoice. A loss stays visible on `netProfitPence`. Tax and National Insurance use `taxableProfitPence`. The arithmetic stays in `calculateTaxSummary`. The handler only loads the two sums.

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
3. Cash basis: income counts when the invoice is marked paid, expenses when they are paid. Logged income and unpaid invoices are excluded.
4. Student loans, pension contributions, Marriage Allowance, and other reliefs are not applied.
5. Class 2 National Insurance is not included in estimated tax owed. At or above £7,105 it is treated as paid. Below that, voluntary Class 2 is £3.65 a week and is not added here.
6. Flat-rate vehicle costs use simplified mileage for a car or van (55p then 25p). Motorcycle rates are not applied.

`disclaimer` is exactly:

`TheraTax produces estimated tax figures for planning purposes only and is not a substitute for formal accounting or tax advice.`

The arithmetic above is the contract of the tax-engine function. The handler loads the year's transactions and the user's `expenseMethod`, calls that function, and returns the result.

## List envelope and pagination

`GET /transactions`, `GET /invoices`, `GET /workplaces`, and `GET /clients` return:

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

## Workplace (step 13)

A workplace is a spa or a clinic the user bills or works at. The transaction stores `workplaceId`. It does not copy the name. Invoice issue copies the name onto the invoice, in step 17, so a later rename does not rewrite an issued invoice.

```ts
interface HourExtra {
  massageType: "pregnancy" | "hot_stone" | "body_scrub" | "request" | "other";
  customMassageType?: string; // 1–100 characters after trim, required only when massageType is "other"
  extraPence: number;         // integer, 1 .. 100_000_000
}

interface Workplace {
  id: number;
  name: string;
  kind: "spa" | "clinic";
  hourRatePence: number; // integer pence per hour
  hourExtras: HourExtra[]; // pregnancy, hot stone, body scrub, request, then other by name
  addressLine1?: string;
  addressLine2?: string;
  town?: string;
  postcode?: string;
  createdAt: string;
  updatedAt: string;
}
```

`POST /workplaces` body:

```ts
interface CreateWorkplace {
  name: string;              // trimmed, then 1–200 characters
  kind: "spa" | "clinic";
  hourRatePence: number;     // integer, 1 .. 100_000_000
  hourExtras?: HourExtra[];  // omitted means none
  addressLine1: string;
  addressLine2?: string;
  town: string;
  postcode: string;
}
```

`PATCH /workplaces/:id` body:

```ts
interface UpdateWorkplace {
  name: string;
  hourRatePence: number;
  hourExtras: HourExtra[]; // replaces the stored extras, including an empty list
  addressLine1: string;
  addressLine2?: string;
  town: string;
  postcode: string;
}
```

`kind` is not changed. A missing workplace and another user's id are `404` `"Workplace <id> not found"`. The same user, the same `kind`, and the same name ignoring case, on a different id, is `409` `"Workplace already saved"`. A repeated massage type, or the same other name ignoring case, is `400` `"Hour extra already set for this massage type"`. Other without a name is `400` `"Custom massage type is required"`. A custom name on another type is `400` `"Custom massage type is only valid for other"`.

`201` returns the `Workplace`. The same user, the same `kind`, and the same name ignoring case is `409`:

```json
{ "message": "Workplace already saved", "error": "Conflict", "statusCode": 409 }
```

`North Spa` and `north spa` are the same name. A spa and a clinic may share a display name. The stored name is the trimmed text from the first save.

`GET /workplaces` uses the list envelope. Order is `name` ascending, then `id` ascending. Only this user's rows are returned.

Bearer is required. Before onboarding the response is `403` `"Complete onboarding before using this resource"`. A missing token is `401` `"Unauthorized"`.

Postman: `POST` `{ "name": "North Spa", "kind": "spa", "hourRatePence": 2500, "addressLine1": "4 Spa Lane", "town": "Leeds", "postcode": "LS1 4AP", "hourExtras": [{ "massageType": "pregnancy", "extraPence": 200 }, { "massageType": "request", "extraPence": 200 }, { "massageType": "body_scrub", "extraPence": 500 }] }` returns `201`. `hourRatePence` is `2500` (£25 per hour). `postcode` is `LS1 4AP`. `hourExtras` lists pregnancy `200`, body scrub `500`, then request `200`. The same name with different capital letters returns `409` `"Workplace already saved"`. `{ "name": "North Spa", "kind": "clinic", "hourRatePence": 2500, "addressLine1": "1 Clinic Road", "town": "Manchester", "postcode": "M1 1AE" }` returns `201` and `hourExtras` is `[]`. `PATCH /workplaces/:id` with a new name, the same rate, and the same address returns `200`. `GET /workplaces` with a second user's token does not include the first user's ids. An empty `name`, `kind` `"hotel"`, a missing hour rate, or a missing address is `400` and `message` is an array. A postcode that is not a UK postcode is `400` `"Enter a UK postcode"`. Two pregnancy extras is `400` `"Hour extra already set for this massage type"`.

## Daily income summary (step 16)

`GET /income/summary` returns totals computed from income transactions. The bonus is `bonusPence` on those rows. The route does not read or write a stored daily total, and it does not read a bonus table. It does not add invoice amounts. Deleting or editing a source row changes the next response. Deleting a massage row drops its base, its fee, and its bonus together.

Query `date` is optional `DD-MM-YYYY`. Omitted, it is today in `Europe/London`. A date outside the 2026–27 tax year is `400` `"Date is outside the 2026-27 tax year"`.

```ts
interface DailyIncomeSummary {
  date: string;
  basePence: number;
  additionalFeePence: number;
  bonusPence: number;
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
  bonusPence: number;
  totalPence: number;
}

interface MassageTypeDay {
  massageType: MassageType;
  customMassageType?: string;
  basePence: number;
  additionalFeePence: number;
  bonusPence: number;
  totalPence: number;
}
```

For each income transaction on that civil date:

- When `basePence` is set, add `basePence` to base, `additionalFeePence` (or 0) to fees, and `bonusPence` (or 0) to bonuses. Do not also add `amountPence`.
- When `basePence` is absent, add `amountPence` to base and add nothing to fees or bonuses.

`totalPence` is base plus fees plus bonuses. Empty optional amounts count as zero.

`byWorkplace` has one object per workplace that has income that day. Income with no workplace stays in the top-level totals and is absent from `byWorkplace`. `byMassageType` includes only rows that have `massageType`. Rows with the same type and the same custom text are one bucket. Different custom text stays separate. A bucket's `totalPence` includes that bucket's bonus. Cash income with no massage type stays in the top-level base and is absent here. A row's bonus is in its workplace bucket and in its massage-type bucket. The top-level `bonusPence` still counts that row once. Adding the two breakdowns together is not the daily total.

An empty day is `200` with every pence field `0` and both arrays empty.

The grouping function is pure and unit-tested: inputs of base `6000`, fee `200`, bonus `500`, and `amountPence` `6700` return `totalPence` `6700`. Adding `amountPence` again, adding the bonus twice, or dropping the bonus fails that test. The handler loads income rows and calls it. It does not load a bonus table.

`GET /tax/summary` does not add `bonusPence` on top of income `amountPence`. It still calls `calculateTaxSummary` with the two sums. Logging the row does not change `incomePence`. After the invoice that bills that row is marked paid, `incomePence` is `6700` higher than before the payment, not `7200` higher and not `6200` higher.

Postman: one Swedish income with `basePence` `6000`, `additionalFeePence` `200`, and `bonusPence` `500` on the same date returns `basePence` `6000`, `additionalFeePence` `200`, `bonusPence` `500`, and `totalPence` `6700`. `byMassageType` for `swedish` includes that bonus. Delete that income. The next summary is zeros, including the bonus. An issued invoice does not change this daily summary.

## Client (step 17)

A client is a person the user invoices, distinct from a workplace. The feed reuses the id. The invoice copies the name at issue time.

```ts
interface Client {
  id: number;
  name: string;
  hourRatePence: number;
  hourExtras: HourExtra[];
  addressLine1?: string;
  addressLine2?: string;
  town?: string;
  postcode?: string;
  createdAt: string;
  updatedAt: string;
}
```

`POST /clients` takes `{ name, hourRatePence, hourExtras?, addressLine1, addressLine2?, town, postcode }`. `name` is trimmed to 1–200 characters. `hourRatePence` is an integer from 1 to `100_000_000`. `hourExtras` uses the same rules as a workplace and defaults to none. The address uses the same rules as `PATCH /users/me/address`. The response is `201`. The same user and the same name ignoring case is `409` `"Client already saved"`. `GET /clients` uses the list envelope, ordered by `name` ascending, then `id` ascending. `GET /clients/:id` returns one. A missing id and another user's id are `404` `"Client <id> not found"`.

`PATCH /clients/:id` takes `{ name, hourRatePence?, hourExtras?, addressLine1, addressLine2?, town, postcode }` and returns `200`. `hourRatePence`, when omitted, stays as stored. `hourExtras`, including `[]`, replaces the stored extras. The address is replaced. A blank `addressLine2` clears the second line. A rename does not change `recipientName` on an invoice already issued, and a new address does not change an address already copied onto an invoice. `DELETE` returns `204`. A client referenced by a transaction or an invoice is `409` `"Client is used by a record"`.

Postman: create `Ada Client` with `hourRatePence` `2500`, `addressLine1` `12 High Street`, `town` `London`, and `postcode` `SW1A 1AA`. Create `ada client` with the same rate and address, and read `409` on the second. With another user's token, `GET /clients/:id` for the first id is `404`. A body with no `hourRatePence` or no address is `400` and `message` is an array.

## Invoices from records (step 17)

Earned income is the feed transaction. The bonus is `bonusPence` on that transaction. An invoice is a bill for a recipient and a period. Creating an invoice does not insert a transaction. Paying it does not insert a transaction. Rows that step 11 already created on pay stay where they are, including their `invoiceId`. A transaction that still has `invoiceId` stays immutable with `409` `"Invoice income is changed by updating the invoice"`.

New invoices do not set `invoiceId` on the source transaction. The link is the line's `sourceTransactionId`. Those source rows stay editable. The issued lines do not change when the source changes. Deleting a source sets the line's source id to null and leaves the line amounts in place. The next daily summary no longer includes the deleted source. The invoice total does not change.

```ts
interface InvoiceLine {
  kind: "service" | "additional_fee" | "bonus";
  description: string;
  quantity: number;
  quantityUnit: "session";
  ratePence: number;
  amountPence: number;
  occurredOn: string;
  sourceTransactionId?: number;
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
  supplierAddressLine1?: string;
  supplierAddressLine2?: string;
  supplierTown?: string;
  supplierPostcode?: string;
  recipientAddressLine1?: string;
  recipientAddressLine2?: string;
  recipientTown?: string;
  recipientPostcode?: string;
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

Eligible income is this user's `income` rows whose `occurredOn` is inside the clipped period, which are not already referenced by an invoice line, and which match the recipient: `workplaceId` for a spa or clinic, `clientId` for a client. Expenses are never eligible. A row that has `invoiceId` set is not eligible. The row's additional fee and bonus are billed with that row for every recipient, including a client. There is no separate bonus list.

Lines are ordered by `occurredOn` ascending, then service, then additional fee, then bonus. A monthly invoice uses that order as the breakdown by date. The line builder is a pure function. For each eligible income it emits a `service` line: `quantity` 1, `quantityUnit` `"session"`, `ratePence` and `amountPence` equal to `basePence` when that is set, otherwise `amountPence`. `description` is the massage name from the table above, the custom text when the type is `other`, or `"Income"` when there is no massage type. When `additionalFeePence` is greater than 0 it also emits an `additional_fee` line with quantity 1, `quantityUnit` `"session"`, description `"Additional Massage Fee"`, and that fee as both rate and amount. When `bonusPence` is greater than 0 it also emits a `bonus` line with quantity 1, `quantityUnit` `"session"`, description `"Bonus"`, and that bonus as both rate and amount. The bonus is not added again into the service amount or into the invoice total.

`amountPence` on the invoice is the sum of the line amounts. The client cannot send it. Preview returns `200` with `lines`, `amountPence`, the recipient, and the period bounds. An empty eligible set is `200` with `lines: []` and `amountPence: 0`. `POST` of an empty set is `400` `"No records to invoice for this recipient and period"`. `POST` of a non-empty set copies the user's business address and the recipient's address onto the invoice and returns `201` and the `RecordedInvoice`, status `issued`, with the lines stored. A missing business address is `400` `"Add your business address before issuing an invoice"`. A recipient with no address is `400` `"Add an address for this recipient before issuing an invoice"`. Those checks run after the empty-set check. A later preview or create skips those sources. There is no second bill for the same work. A later edit of either address does not change the copy stored on the invoice.

`PATCH` is still only `{ status: "paid", paidOn? }`. `paidOn` defaults to today, must be on or after `issuedOn`, and must sit in the tax year. The handler sets status and `paidOn`. It does not create a transaction. A second pay is `409` `"Invoice is already paid"`.

`GET /invoices/:id/pdf` stays `200`, `Content-Type: application/pdf`, and `Content-Disposition: attachment; filename="<number>.pdf"`. The PDF is an A4 invoice. It shows the word INVOICE, the invoice number, the therapist's name, email, and business address, the recipient's name and address, the invoice date, the supply period, each line's date, description, quantity, rate, and amount, the total in GBP, the status, and `paidOn` when paid. It states that the issuer is a sole trader who is not registered for VAT, so no VAT is charged. Amounts use the truncated pounds and two-digit pence converter. A baseline invoice with no lines still draws one row from the client, the service, and the amount. An invoice stored before addresses existed draws `Address not recorded` for a missing party. A long table continues on the next page. The unit test does not use HTTP. The bytes still start with `%PDF`.

Postman, after steps 13–16: save a spa, log Swedish income of base `6000`, fee `200`, and bonus `500` on `01-05-2026` for that spa. `GET /invoices/preview` for that spa, `period` `day`, and that date returns three lines and `amountPence` `6700` (service 6000, fee 200, bonus 500). The bonus line appears once. The same spa with `period` `month`, `month` `5`, and `year` `2026` includes that day and excludes a row dated `01-06-2026`. `POST /invoices` with the same fields returns `201`. `GET /transactions?type=income` has no new row whose note is the invoice number. `PATCH` to `paid` returns `200` with `paidOn` and still no new income row. `GET /invoices/:id` after a `PATCH` of the source transaction's `basePence` still shows the original line amount. A second `POST` for that day and spa is `400` `"No records to invoice for this recipient and period"`. A clinic workplace preview does not include the spa's rows. A saved client whose income has `bonusPence` greater than 0 gets a Bonus line. Another user's workplace id is `404`. `GET /invoices/:id/pdf` is `200` with `application/pdf`. `npm test` still passes, including the tax, mileage, and PDF tests.

## Errors

Every error body carries `message`, because that is the field a client has to read. Two shapes occur, and the client must accept both:

- DTO validation (`ValidationPipe`, with whitelist and `forbidNonWhitelisted`): `message` is an array of strings.
- A deliberate `400` / `401` / `403` / `404` / `409` / `500`: `message` is a string. Receipt storage uses the `500` strings in the Receipt section.

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
| Not onboarded, on transactions, invoices, tax, workplaces, the daily summary, or clients | 403 | `Complete onboarding before using this resource` |
| Validation, bad `taxYear`, date outside 2026–27, unknown category, miles/amount clashing with `expenseMethod`, bad receipt type or size, `paidOn` before `issuedOn`, massage or recipient rules in the later steps | 400 | array, or one of the strings specified above |
| Duplicate email | 409 | `Email already registered` |
| Second onboarding | 409 | `Onboarding already completed` |
| Edit or delete of income that has `invoiceId` | 409 | `Invoice income is changed by updating the invoice` |
| Pay an invoice that is already paid | 409 | `Invoice is already paid` |
| Duplicate workplace or client name for this user | 409 | `Workplace already saved` or `Client already saved` |
| Invoice issued without a business address | 400 | `Add your business address before issuing an invoice` |
| Invoice issued for a recipient with no address | 400 | `Add an address for this recipient before issuing an invoice` |
| Address postcode is not a UK postcode | 400 | `Enter a UK postcode` |
| Delete a client that a transaction or invoice still uses | 409 | `Client is used by a record` |
| Unknown id, including another user's id | 404 | `<Resource> <id> not found` |
| Receipt image could not be saved | 500 | `Receipt could not be stored` |
| Receipt link could not be signed | 500 | `Receipt could not be opened` |
| Receipt image could not be deleted | 500 | `Receipt could not be removed` |

## Out of scope

The proposal's phase 2, plus the limits stated above. These are not endpoints and not optional fields:

- Recurring invoices, and emailing an invoice to a client. Day and month lines are step 17
- A client-supplied invoice total, or an `amountPence` that disagrees with base plus additional fee plus bonus. The server computes those. A bonus is not derived from hours
- VAT, including the VAT Flat Rate Scheme
- Scottish Income Tax, student loans, and reliefs other than the full personal allowance
- Motorcycle mileage, and changing `expenseMethod` after onboarding
- A business-use percentage computed by the server
- User-created categories
- Editing or deleting a transaction that has `invoiceId` through `/transactions`. A step 17 source row has no `invoiceId` and stays editable; the issued line amounts do not follow that edit
- Any tax year other than 2026–27

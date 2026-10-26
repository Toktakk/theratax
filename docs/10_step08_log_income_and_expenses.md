# Step 8 — Log income and expenses

Guide: [Project plan](02_project_plans.md). Previous: [Step 7 — Expense categories](09_step07_expense_categories.md). Next: [Step 9 — Tax summary](11_step09_tax_summary.md).

## Why this step comes first

The feed is what a therapist uses between clients, 30 to 60 seconds per row. One `POST /transactions` finishes one row. A receipt image is a second request, and only when there is an image, so it is not in this step. The tax summary in [step 9](11_step09_tax_summary.md) only adds the rows this step stores, so `GET /tax/summary` stays closed.

Before there is a route, have a date helper that is a pure function, with its own tests. Open the endpoint only after the date tests pass.

## Not in this step

Do not write `GET /tax/summary`. Do not upload images. Do not create invoices. A row tied to `invoiceId` is blocked from edits on this path, but nobody creates a row like that until [step 11](13_step11_invoices_and_pdf.md).

## Concept

One row is one income or one expense. Money is pence. The day is `DD-MM-YYYY`.

```ts
interface Transaction {
  id: number;
  type: 'income' | 'expense';
  occurredOn: string;
  amountPence: number;
  hasReceipt: boolean;
  note?: string;
  categorySlug?: string;
  miles?: number;
  invoiceId?: number;
}
```

`hasReceipt` is always present, so the feed can draw the camera state from this object without asking for an image row by row. Right now every row is `false`. Other keys are omitted when they are unused. Cash income is therefore a small object: no `categorySlug`, no `miles`, and no `invoiceId` until [step 11](13_step11_invoices_and_pdf.md) is the one that sets it.

The body you can create

```ts
interface CreateTransaction {
  type: 'income' | 'expense';
  occurredOn?: string;
  note?: string;
  amountPence?: number;
  categorySlug?: string;
  miles?: number;
}
```

An omitted `occurredOn` is today on the `Europe/London` calendar. `note`, when sent, is 1 to 500 characters. `amountPence` is an integer from 1 to `100_000_000`, which is no more than £1,000,000. `miles` is an integer from 1 to `100_000`.

The DTO leaves the possible fields optional, except `type`, because which fields are required changes with the type and the category. The pipe checks types and lengths. Business rules throw `BadRequestException` with a string. Those two shapes must stay separate, the same way as [step 4](06_step04_enable_validation_pipe.md).

Rules after the body is combined:

- Income must have `amountPence`. It must not have `categorySlug` and must not have `miles`. `invoiceId` exists only when the server creates it as an invoice is paid. The message when that rule is broken: `Income does not take a category or miles`. The message when there is no amount: `Amount is required`. This lesson fixes both sentences so the handler uses them the same way, because the contract does not lock the wording of these two cases.
- A `general` expense must have `categorySlug` and `amountPence`. It must not have `miles`. The message when miles are sent: `Miles are only valid for mileage`. When there is no category: `Category is required`. When there is no money: `Amount is required`.
- A flat-rate mileage expense must have `miles`. Do not send `amountPence`, because the server calculates it. The sentence the contract locks is `Amount is computed from miles`. When there are no miles, use `Miles are required`.
- A `vehicle-costs` expense must have `amountPence`. It must not have `miles`. This amount is the deductible money the user types. The server does not calculate a private-use percentage, because that would become a form, and rounding in the feed is not a form.
- Using `mileage` while on actual cost, or `vehicle-costs` while on flat rate, returns `400` with the message `Category <slug> is not valid for <expenseMethod>`, for example `Category mileage is not valid for actual_cost`.
- A slug that does not exist returns `400` with the message `Unknown category <slug>`.
- A date in the wrong shape, or a date that does not exist, such as `31-02-2026`, returns `400` through the pipe or through the date checker. A date outside `06-04-2026` through `05-04-2027` returns `400`. The locked message is `Date is outside the 2026-27 tax year`.

`PATCH /transactions/:id` accepts a subset of `occurredOn`, `note`, `amountPence`, `categorySlug`, `miles`. `type` must not be on the DTO. Sending `type` is therefore a 400 from the pipe, because of `forbidNonWhitelisted`. The row after the old values are merged with the new ones is checked with the same rule set. The client cannot edit `invoiceId`.

A row that has `invoiceId` cannot be edited or deleted on this path. Respond `409`.

```json
{ "message": "Invoice income is changed by updating the invoice", "error": "Conflict", "statusCode": 409 }
```

`DELETE` gets `204` and no body.

An `:id` that is not a number goes through `ParseIntPipe` and gets `400` with the message `Validation failed (numeric string is expected)`. A row that does not exist, or that belongs to someone else, returns `404` with the message `Transaction <id> not found`. Use the same message for both cases, so someone else's id does not become information.

On every path in this module, if `onboardedAt` is still `null`, respond `403`.

```json
{ "message": "Complete onboarding before using this resource", "error": "Forbidden", "statusCode": 403 }
```

The list uses this envelope.

```ts
interface ListResponse<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
}
```

Order by `occurredOn` descending, then `id` descending. The newest row is therefore at the top of the feed. `limit` is an integer from 1 to 100, default 20. `skip` is an integer from 0, default 0. Outside that range is `400` from the pipe. An empty page is `200` with `items: []` and `total: 0`. The query `type` accepts only `income` or `expense`.

`total` is counted before `skip` and `limit` cut the page.

## Dates

The helper lives at `src/tax-engine/civil-date.ts`, because the tax-year window is a rule of the calculator. Transactions, invoices, and the tax summary use the same helper. It still has no route.

- `todayInLondon` reads the day, month, and year from `Intl.DateTimeFormat` in the zone `Europe/London`, format `en-GB`, then builds `DD-MM-YYYY`. If the day, month, or year part is missing, throw `Error`, because that is a runtime failure, not the user's body.
- `isValidCivilDate` accepts only `\d{2}-\d{2}-\d{4}`, then builds `Date.UTC` to reject a date that does not exist.
- `isInTaxYear` compares a `YYYY-MM-DD` key between `2026-04-06` and `2027-04-05`.
- `civilDateToUtcDate` returns a `Date` at UTC midnight of that day, so it can be stored in `@db.Date` without shifting the day.
- `utcDateToCivilDate` reads year, month, and day with `getUTC*` and returns `DD-MM-YYYY`.

The unit tests must pass at least these three before you open the route: `06-04-2026` is inside the year, `05-04-2026` is not, `31-02-2026` is not a real day, and `civilDateToUtcDate('06-04-2026').toISOString()` is `2026-04-06T00:00:00.000Z`, then converting back yields the original string.

If a day shifts by one when you read it back from the database, the driver is returning a `Date` that is not the UTC midnight you wrote. Adjust the converter at this single read-and-write point. Do not add hours scattered through the controller.

The onboarding check lives at `src/auth/assert-onboarded.ts` and is used for the first time in this step.

```ts
import { ForbiddenException } from '@nestjs/common';
import type { PublicUser } from './public-user.js';

type OnboardedUser = PublicUser & {
  practiceType: 'mobile' | 'fixedLocation' | 'mixed';
  expenseMethod: 'flat_rate' | 'actual_cost';
  onboardedAt: string;
};

export function assertOnboarded(user: PublicUser): asserts user is OnboardedUser {
  if (
    user.onboardedAt === null ||
    user.practiceType === null ||
    user.expenseMethod === null
  ) {
    throw new ForbiddenException('Complete onboarding before using this resource');
  }
}
```

After this function, `user.expenseMethod` is `'flat_rate' | 'actual_cost'` without using `!`.

## Mileage for the whole year

The column `amountPence` cannot be empty. Creating a mileage row therefore writes `0` in the insert, then, immediately inside the same database transaction, loads every row whose `categorySlug` is `mileage` for this user and whose day is inside the tax year, calls `allocateMileageAmounts` from [step 5](07_step05_tax_calculator.md), and `update`s every row with the new amount. Read the row you just created back again before sending it to the client. The user therefore never sees the 0.

It has to happen after the insert, because two rows on the same day are ordered by `id`, and the id exists only after the insert.

Editing or deleting a mileage row, and moving a row out of the mileage category, also calls this calculation against the rows that remain. A backdated row changes the money of rows with a later date, matching the [step 5](07_step05_tax_calculator.md) test.

A mileage row whose `miles` is `null` is broken data. Throw `InternalServerErrorException` instead of skipping that row.

## Files for this step

- `src/tax-engine/civil-date.ts` and `src/tax-engine/civil-date.spec.ts`
- `src/auth/assert-onboarded.ts`
- `src/transactions/dto/create-transaction.dto.ts`
- `src/transactions/dto/update-transaction.dto.ts`
- `src/transactions/dto/list-transactions-query.dto.ts`
- `src/transactions/transactions.service.ts`
- `src/transactions/transactions.controller.ts`
- `src/transactions/transactions.module.ts`
- `src/app.module.ts` adds the module

The create DTO uses `IsIn` for `type`, `IsOptional`, `Matches` for the day, `IsString`, `MinLength(1)`, `MaxLength(500)` for the note, `IsInt`, `Min(1)`, `Max(100_000_000)` for money, `IsString` for the slug, and `IsInt`, `Min(1)`, `Max(100_000)` for miles.

The update DTO has the same fields except it has no `type`. Every field is optional.

The query DTO

```ts
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class ListTransactionsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsIn(['income', 'expense'])
  type?: 'income' | 'expense';
}
```

`@Type(() => Number)` is required because a query arrives as a string. `transform: true` from [step 4](06_step04_enable_validation_pipe.md) is what calls this converter. Without `@IsInt()`, it sees a string and returns 400 even though the user correctly sent `limit=20`.

In the service, if `skip` is `undefined`, use 0. If `limit` is `undefined`, use 20. Then send both values back inside the envelope, so they reflect the values that were actually used.

The controller uses `@UseGuards(AuthGuard)` on the whole class. `POST` has no `@HttpCode`, so it gets 201. `DELETE` has `@HttpCode(HttpStatus.NO_CONTENT)`. The id parameter is `@Param('id', ParseIntPipe) id: number`. The module has `imports: [AuthModule]` and can use `ExpenseCategoriesService` by having the categories module export that service, then importing `ExpenseCategoriesModule`.

The mapper from a row to JSON sets `hasReceipt` from whether a `receipt` row exists. It includes `note` when it is not empty, `categorySlug` when it is not `null`, `miles` when it is not `null`, and `invoiceId` when it is not `null`. The day goes through `utcDateToCivilDate`. Do not send a `Date`.

## Commands you run

Run the date tests before you send anything from Postman.

```bash
npm test
```

Then use Ada's token, who is already `flat_rate`, as Bearer `{{token}}`, and Bea's token, who is not onboarded yet, as Bearer `{{bee}}`. If an old session has expired, log in again and update `token` and `bee`.

Bea cannot log yet.

```text
POST {{baseUrl}}/transactions
```

```json
{"type":"income","amountPence":100}
```

Ada logs 11,000 miles on 1 June 2026.

```text
POST {{baseUrl}}/transactions
```

```json
{"type":"expense","categorySlug":"mileage","miles":11000,"occurredOn":"01-06-2026"}
```

Then insert a trip of 1,000 miles on 6 April 2026, which is earlier, and fetch the list.

```text
POST {{baseUrl}}/transactions
```

```json
{"type":"expense","categorySlug":"mileage","miles":1000,"occurredOn":"06-04-2026"}
```

```text
GET {{baseUrl}}/transactions?limit=20
```

Cash income of £20,000, and a date outside the year. These requests are Ada's. Use Bearer `{{token}}`.

```text
POST {{baseUrl}}/transactions
```

```json
{"type":"income","amountPence":2000000,"occurredOn":"01-05-2026","note":"cash session"}
```

```text
POST {{baseUrl}}/transactions
```

```json
{"type":"expense","categorySlug":"mileage","miles":11000,"occurredOn":"01-06-2026","amountPence":1}
```

```text
POST {{baseUrl}}/transactions
```

```json
{"type":"expense","categorySlug":"mileage","miles":10,"occurredOn":"01-04-2026"}
```

```text
POST {{baseUrl}}/transactions
```

```json
{"type":"expense","categorySlug":"vehicle-costs","amountPence":5000,"occurredOn":"02-05-2026"}
```

```text
GET {{baseUrl}}/transactions?type=cash
```

Have Bea onboard as `actual_cost`, then try the mileage category, which must be rejected. After that she can use `vehicle-costs`. That is Bea's `PATCH /users/me/onboarding` with `expenseMethod` of `actual_cost`, using Bearer `{{bee}}`.

```text
PATCH {{baseUrl}}/users/me/onboarding
```

```json
{"practiceType":"fixedLocation","expenseMethod":"actual_cost"}
```

```text
POST {{baseUrl}}/transactions
```

```json
{"type":"expense","categorySlug":"mileage","miles":10,"occurredOn":"02-05-2026"}
```

## What you must see

`npm test` still passes, including the date tests added in this step.

Bea, before onboarding, gets `403` and the message `Complete onboarding before using this resource`.

The 11,000-mile row gets `201`, `amountPence` of `575000`, `miles` of `11000`, `hasReceipt` of `false`, and no key for an amount the client sent.

After you insert 1,000 miles on 6 April, the list must show that row as `55000` pence, and the 11,000-mile row on 1 June becomes `545000` pence. That matches the function test in [step 5](07_step05_tax_calculator.md).

The £20,000 income gets `201`, `amountPence` of `2000000`, no `categorySlug`, no `miles`, no `invoiceId`, and `note` of `cash session`.

Sending both miles and money gets `400` and the message `Amount is computed from miles`.

The date `01-04-2026` gets `400` and the message `Date is outside the 2026-27 tax year`.

Ada sending `vehicle-costs` gets `400` and the message `Category vehicle-costs is not valid for flat_rate`.

`type=cash` gets `400` and `message` is an array.

After Bea chooses `actual_cost`, sending `mileage` gets `400` and the message `Category mileage is not valid for actual_cost`.

`GET /tax/summary` is not a check for this step.

## If it fails

- The 11,000-mile row gets `605000`: the handler multiplied the whole thing by 55 itself and did not call `allocateMileageAmounts`.
- After you insert the trip, the June amount does not change: you calculated only the new row. You must write back every mileage row of the year inside the same transaction.
- The day `06-04-2026` becomes `05-04-2026` in JSON: the `Date` was read in a different zone from the one used when writing. Go back to the UTC converter.
- Sending `amountPence` together with miles still gets 201: the business rule is in the wrong place, or it was checked before the body was merged.
- Income has `categorySlug: null` in JSON: the mapper must omit the key, not put null. The contract always omits a key for a field that is absent, except `hasReceipt` and the user fields that are defined to always be present.
- The list has older days on top: `orderBy` must be `occurredOn` descending, then `id` descending.
- The query `limit=20` gets 400 about a number: `@Type(() => Number)` is missing.

**Pass this step, then continue.** Leave Ada's income of `2_000_000` pence in place for [step 9](11_step09_tax_summary.md). If you only have mileage rows, log that income before you continue.

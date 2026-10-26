# Step 15 — Hourly bonuses

Guide: [Project plan](02_project_plans.md). Previous: [Step 14 — Massage income](16_step14_massage_income.md). Next: [Step 16 — Daily income summary](18_step16_daily_income_summary.md).

## Why this step comes first

A bonus is hours the user marked as bonus-eligible, at a workplace, on a date. It is not another income transaction. [Step 16](18_step16_daily_income_summary.md) adds it once. An invoice in [step 17](19_step17_invoices_from_records.md) snapshots it once. Paying that invoice must not add it again.

This step needs workplaces from [step 13](15_step13_workplaces.md). It does not need massage fields to be stored, but this lesson opens it after step 14 so only one check is in progress. A build that already has workplaces can do this step before massage income. Do not do both at once.

## Not in this step

Do not add the bonus into `GET /tax/summary` yet. That is step 16. Do not create an income row when a bonus is saved. Do not change invoices. Do not treat every working hour as a bonus. Only minutes sent on this request count.

## Concept

Hours are integer minutes. `eligibleMinutes` is 1 to 1440. 90 minutes is 1.5 hours. One minute is the smallest step. The client does not send a decimal hour and does not send `totalPence`.

```prisma
model HourlyBonus {
  id               Int       @id @default(autoincrement())
  occurredOn       DateTime  @db.Date
  eligibleMinutes  Int
  ratePencePerHour Int
  totalPence       Int
  note             String?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
  userId           Int
  workplaceId      Int
  user             User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  workplace        Workplace @relation(fields: [workplaceId], references: [id], onDelete: Cascade)

  @@unique([userId, workplaceId, occurredOn])
  @@index([userId, occurredOn])
}
```

Add `bonuses HourlyBonus[]` on `User` and on `Workplace`.

You run the migration. Do not reset the database.

```bash
npx prisma migrate dev --name hourly_bonuses
```

The total is a pure function in `src/hourly-bonuses/bonus-amount.ts`. The controller does not divide.

For a positive product, divide `eligibleMinutes * ratePencePerHour` by 60. The penny count is the quotient. If the remainder is 30 or more, add one penny. That is half away from zero. 90 minutes at 200 pence an hour is `18000 / 60 = 300`. 1 minute at 100 pence an hour is `100 / 60`, remainder 40, so `2` pence.

`ratePencePerHour` is an integer from 1 to `100_000_000`. £2 is `200`. The rate is whatever the user typed for that row. Do not store a rate per massage type.

```ts
interface HourlyBonus {
  id: number;
  workplaceId: number;
  occurredOn: string;
  eligibleMinutes: number;
  ratePencePerHour: number;
  totalPence: number;
  note?: string;
  createdAt: string;
  updatedAt: string;
}
```

`POST /hourly-bonuses` takes `workplaceId`, optional `occurredOn`, `eligibleMinutes`, `ratePencePerHour`, and optional `note` (1–500 characters). An omitted day is today in `Europe/London`. The day must sit in the 2026–27 tax year, or the message is `Date is outside the 2026-27 tax year`.

The workplace must belong to the user. Otherwise `404` `Workplace <id> not found`.

One bonus per user, workplace, and civil date. A second create is `409`.

```json
{ "message": "Hourly bonus already recorded for this workplace and date", "error": "Conflict", "statusCode": 409 }
```

`GET /hourly-bonuses` uses the list envelope. Order by `occurredOn` descending, then `id` descending. Optional `workplaceId` and `date` filter this user's rows. `GET /hourly-bonuses/:id` returns one row. A missing id and another user's id are `404` `Hourly bonus <id> not found`.

`PATCH` accepts any subset of `workplaceId`, `occurredOn`, `eligibleMinutes`, `ratePencePerHour`, and `note`. Recompute `totalPence`. Sending `totalPence` is `400` from the pipe, because it is not on the DTO. A patch that lands on an existing workplace and date is the same `409`. `DELETE` is `204`.

Missing minutes, a negative count, a count above 1440, a missing rate, and a negative rate are `400` and `message` is an array.

Bearer and onboarding match step 13. The bonus is not returned from `GET /transactions`.

## Files for this step

- `prisma/schema.prisma`
- `src/hourly-bonuses/bonus-amount.ts`
- `src/hourly-bonuses/bonus-amount.spec.ts`
- `src/hourly-bonuses/dto/create-hourly-bonus.dto.ts`
- `src/hourly-bonuses/dto/update-hourly-bonus.dto.ts`
- `src/hourly-bonuses/dto/list-hourly-bonuses-query.dto.ts`
- `src/hourly-bonuses/hourly-bonuses.service.ts`
- `src/hourly-bonuses/hourly-bonuses.controller.ts`
- `src/hourly-bonuses/hourly-bonuses.module.ts`
- `src/app.module.ts` adds `HourlyBonusesModule`

Write the unit test before the route. The test calls the function. It does not boot Nest.

## Commands you run

```bash
npm test
```

Then, as Ada, with her workplace id:

```text
POST {{baseUrl}}/hourly-bonuses
```

```json
{"workplaceId":1,"occurredOn":"01-05-2026","eligibleMinutes":90,"ratePencePerHour":200,"note":"Saturday clinic"}
```

Store the id as `bonusId`. Send the same body again. Then send these:

```json
{"workplaceId":1,"occurredOn":"02-05-2026","ratePencePerHour":200}
```

```json
{"workplaceId":1,"occurredOn":"02-05-2026","eligibleMinutes":-5,"ratePencePerHour":200}
```

```json
{"workplaceId":1,"occurredOn":"02-05-2026","eligibleMinutes":1441,"ratePencePerHour":200}
```

```json
{"workplaceId":1,"occurredOn":"03-05-2026","eligibleMinutes":60,"ratePencePerHour":200,"totalPence":200}
```

`GET /hourly-bonuses/{{bonusId}}` as Ada, then as another onboarded user. `GET /transactions?type=income` and confirm the bonus did not add a row.

## What you must see

The unit test passes for `300` and for the 1-minute case of `2`. The tax and mileage tests still pass.

The first `POST` gets `201`. `totalPence` is `300`. `eligibleMinutes` is `90`. `ratePencePerHour` is `200`. `note` is `Saturday clinic`. `createdAt` and `updatedAt` are ISO 8601. There is no `userId`.

The second create gets `409` and the message `Hourly bonus already recorded for this workplace and date`.

A missing minute count, a negative count, and `1441` each get `400`, and `message` is an array. A body that includes `totalPence` gets `400`, and `message` is an array.

Ada's `GET` by id gets `200` and `totalPence` `300`. The other user gets `404` and the message `Hourly bonus <id> not found`.

The income list has no new row for this bonus. `GET /tax/summary` has not moved because of the bonus. That add is the next step.

## If it fails

- `totalPence` is `18000`: the handler returned the product and did not divide by 60, or it did the division in the controller instead of the function.
- `totalPence` is `1` for the 1-minute test: the remainder 40 was dropped. A remainder of 30 or more adds a penny.
- A second `POST` gets `201`: the unique key is missing, or the service did not map that database error to `409`.
- The feed gained an income row: delete that write. A bonus is only a bonus row.
- Every hour the user worked was counted: the handler invented minutes. Only `eligibleMinutes` on this request counts.

**Pass this step, then continue.**

# Step 15 — Bonus

Guide: [Project plan](02_project_plans.md). Previous: [Step 14 — Massage income](16_step14_massage_income.md). Next: [Step 16 — Daily income summary](18_step16_daily_income_summary.md).

## Why this step comes first

A bonus is an amount the user received for one massage income row. The screen label is Bonus. The field is `bonusPence`. It works like the additional fee: the user types it, and the total includes it once.

It is not hours. It is not a rate. It is not a separate table. [Step 16](18_step16_daily_income_summary.md) reads it from the transaction. An invoice in [step 17](19_step17_invoices_from_records.md) snapshots that same amount once. Paying that invoice must not add it again.

This step needs massage income from [step 14](16_step14_massage_income.md). Do not open it before that check passes. Do not do both at once.

## Not in this step

Do not add `GET /income/summary`. Do not change `GET /tax/summary`. The bonus is already inside `amountPence`, so the tax sum of `amountPence` will include it when a row exists. Do not add `bonusPence` again beside that sum. Do not change invoices. Do not require a receipt. Do not add a React page. The feed page will send this field later.

Do not create `HourlyBonus`. Do not add `/hourly-bonuses`. Do not store minutes or a rate. The tree may still contain `src/hourly-bonuses` and an `HourlyBonus` model from the previous contract. Do not extend them. This step's check replaces that contract. You run the migration yourself. Do not reset the database.

## Concept

On `Transaction`, add optional `bonusPence`. It is an integer number of pence, the same kind of column as `additionalFeePence`.

```prisma
bonusPence Int?
```

You run the migration. Do not reset the database.

```bash
npx prisma migrate dev --name bonus_pence
```

The total is a pure function. Put it next to the transaction code, for example `src/transactions/massage-income-total.ts`. The controller does not add. The service calls the function when `basePence` is set.

```ts
function massageIncomeTotal(basePence: number, additionalFeePence: number, bonusPence: number): number {
  return basePence + additionalFeePence + bonusPence;
}
```

`bonusPence` on the DTO is optional, an integer from 0 to `100_000_000`. The pipe uses `IsOptional`, `IsInt`, `Min(0)`, and `Max`. A negative bonus is `400` and `message` is an array. The client does not send a computed total for the bonus. There is no `totalPence` on this request.

When `massageType` is set, an omitted bonus is stored as `0`, and the response includes `bonusPence: 0`. The server sets:

`amountPence = basePence + additionalFeePence + bonusPence`

A client `amountPence` that is not that sum is `400` `Amount must equal base plus additional fee and bonus`. If the sum is above `100_000_000`, the message is `Amount is above the maximum`. Step 14's message, which stopped at the fee, is replaced by this one.

Empty and `0` do not increase the total. Base `6000` and fee `200` with no bonus is `6200`. The same row with bonus `500` is `6700`, which is £60 + £2 + £5 = £67.

The bonus is whatever the user typed for that row. Another row can hold a different amount. Do not look up a rate. Do not read hours. `eligibleMinutes` and `ratePencePerHour` are not fields. The pipe rejects them as unknown.

A bonus on an expense, or a bonus without a massage type, is `400` `Bonus is only valid on massage income`. Cash income still sends only `amountPence` and omits `bonusPence`.

`PATCH` may change `bonusPence`. The merged row is checked again, and `amountPence` is recomputed when `basePence` is set. Sending `type` is still `400` from the pipe.

Bearer and onboarding match step 13. The bonus is returned on the transaction. It is not a second list.

## Files for this step

- `prisma/schema.prisma`
- `src/transactions/massage-income-total.ts`
- `src/transactions/massage-income-total.spec.ts`
- `src/transactions/dto/create-transaction.dto.ts`
- `src/transactions/dto/update-transaction.dto.ts`
- `src/transactions/transactions.service.ts`
- `src/transactions/transaction-response.ts`

Write the unit test before the route. The test calls the function. It does not boot Nest. One case is base `6000`, fee `200`, bonus `500`, total `6700`. A second add of that same `500` must fail the test: the total is not `7200`. An omitted bonus is passed as `0` and the total is `6200`.

Do not add a file under `src/hourly-bonuses`. Do not register that folder for a new route. The check is not met while `POST /hourly-bonuses` still returns `201`.

## Commands you run

```bash
npm test
```

As Ada, with her workplace id from step 13:

```text
POST {{baseUrl}}/transactions
```

```json
{"type":"income","occurredOn":"01-05-2026","massageType":"swedish","basePence":6000,"additionalFeePence":200,"bonusPence":500,"workplaceId":1}
```

Replace `workplaceId` with Ada's real id. Store the id as `massageTx`. Then send these:

```json
{"type":"income","massageType":"swedish","basePence":6000,"additionalFeePence":200,"occurredOn":"02-05-2026"}
```

```json
{"type":"income","massageType":"swedish","basePence":6000,"additionalFeePence":200,"bonusPence":-1,"occurredOn":"03-05-2026"}
```

```json
{"type":"expense","categorySlug":"other","amountPence":100,"occurredOn":"01-05-2026","bonusPence":500}
```

```json
{"type":"income","massageType":"swedish","basePence":6000,"additionalFeePence":200,"bonusPence":500,"amountPence":6200,"occurredOn":"04-05-2026"}
```

```json
{"type":"income","amountPence":100,"occurredOn":"05-05-2026","bonusPence":500}
```

`GET /transactions/{{massageTx}}` as Ada, then as another onboarded user.

## What you must see

The unit test passes for `6700` and for `6200`. It fails if the function adds the bonus twice. The tax and mileage tests still pass.

The first `POST` gets `201`. `basePence` is `6000`. `additionalFeePence` is `200`. `bonusPence` is `500`. `amountPence` is `6700`. `massageType` is `swedish`. `hasReceipt` is `false`. There is no `eligibleMinutes` and no `ratePencePerHour`. `createdAt` and `updatedAt` are ISO 8601.

The omitted bonus gets `201`, `bonusPence` `0`, and `amountPence` `6200`.

A negative bonus gets `400` and `message` is an array. The expense gets `400` and the message `Bonus is only valid on massage income`. A total that ignores the bonus gets `400` and the message `Amount must equal base plus additional fee and bonus`. Cash income that also sends `bonusPence` gets `400` and the message `Bonus is only valid on massage income`.

Ada's `GET` by id gets `200` and `amountPence` `6700`. The other user gets `404` and the message `Transaction <id> not found`.

`GET /tax/summary` is not given a second bonus add in this step. Once the invoice that bills this row is paid, `incomePence` includes the bonus through that bill's lines, once.

## If it fails

- `amountPence` is `6200` on the first POST: the bonus was stored and then left out of the sum. Add it once.
- `amountPence` is `7200`: the bonus was added twice. The function returns base plus fee plus bonus, one of each.
- `amountPence` was computed from minutes: delete that path. The user types `bonusPence`.
- A second table was created for the bonus: delete it. The column is on `Transaction`.
- Cash income from step 8 now gets `400`: `bonusPence` was made required. It is stored only when a massage type is set.
- `POST /hourly-bonuses` still returns `201`: that route is not this step. Do not extend it.

**Pass this step, then continue.**

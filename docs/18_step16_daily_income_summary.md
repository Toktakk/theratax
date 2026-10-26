# Step 16 — Daily income summary

Guide: [Project plan](02_project_plans.md). Previous: [Step 15 — Hourly bonuses](17_step15_hourly_bonuses.md). Next: [Step 17 — Invoices from records](19_step17_invoices_from_records.md).

## Why this step comes first

The feed shows rows. This step adds one read that totals a civil date: base, additional fees, and recorded bonuses. The total is computed when the request arrives. There is no daily-total column to edit.

Depends on massage income from [step 14](16_step14_massage_income.md) and bonuses from [step 15](17_step15_hourly_bonuses.md). The tax summary learns to add bonuses here, once. The pure tax function in [step 5](07_step05_tax_calculator.md) stays as it is.

## Not in this step

Do not create invoices from these totals. Do not add invoice `amountPence` into the day. Do not insert a transaction for a bonus. Do not add a new React route. The summary will be shown from `FeedPage.tsx` later.

## Concept

`GET /income/summary` takes optional `date` as `DD-MM-YYYY`. Omitted, it is today in `Europe/London`. A date outside `06-04-2026` through `05-04-2027` is `400` `Date is outside the 2026-27 tax year`.

```ts
interface DailyIncomeSummary {
  date: string;
  basePence: number;
  additionalFeePence: number;
  hourlyBonusPence: number;
  totalPence: number;
  byWorkplace: {
    workplaceId: number;
    name: string;
    kind: 'spa' | 'clinic';
    basePence: number;
    additionalFeePence: number;
    hourlyBonusPence: number;
    totalPence: number;
  }[];
  byMassageType: {
    massageType: string;
    customMassageType?: string;
    basePence: number;
    additionalFeePence: number;
    totalPence: number;
  }[];
}
```

The grouping is a pure function, `summariseDay`, in `src/income-summary/summarise-day.ts`. The handler loads this user's income rows and bonus rows for that civil date and calls the function. The controller does not add.

For each income row:

- When `basePence` is set, add `basePence` to base and `additionalFeePence` to fees. Do not also add `amountPence`. `amountPence` is already base plus fee.
- When `basePence` is absent, add `amountPence` to base and add nothing to fees.

`hourlyBonusPence` is the sum of bonus `totalPence` on that date. `totalPence` is base plus fees plus bonuses.

`byWorkplace` has one object per workplace that has income or a bonus that day. Read the workplace name and kind from the `Workplace` row. Income with no workplace stays in the top-level numbers and is left out of `byWorkplace`. `byMassageType` includes only rows that have `massageType`. The same type and the same custom text are one bucket. Two different custom texts stay two buckets. Cash income with no massage type stays in the top-level base only.

An empty day is `200`. Every pence field is `0`. Both arrays are empty.

In `src/tax-engine/tax-engine.service.ts`, add this user's bonus `totalPence` for days inside the tax year onto the income sum, once, before `calculateTaxSummary`. Do not add `basePence`. Do not add invoice amounts. Do not put `20`, `6`, or the disclaimer in the controller. With no bonus rows the extra sum is 0, so [step 9](11_step09_tax_summary.md) still matches.

Bearer and onboarding match step 13.

## Files for this step

- `src/income-summary/summarise-day.ts`
- `src/income-summary/summarise-day.spec.ts`
- `src/income-summary/dto/daily-summary-query.dto.ts`
- `src/income-summary/income-summary.service.ts`
- `src/income-summary/income-summary.controller.ts`
- `src/income-summary/income-summary.module.ts`
- `src/app.module.ts` adds `IncomeSummaryModule`
- `src/tax-engine/tax-engine.service.ts` adds the bonus sum to the income total

The query DTO uses optional `date` with `Matches(/^\d{2}-\d{2}-\d{4}$/)`.

The unit test must fail if the function adds `amountPence` on top of base and fee. An income of base `1000`, fee `200`, and `amountPence` `1200`, plus a bonus of `300`, returns `totalPence` `1500`, not `2700`.

## Commands you run

```bash
npm test
```

Remember `incomePence` from `GET /tax/summary` for a user who has no bonus rows. The £20,000 check from step 9 still applies to a user whose only income is `2_000_000` pence and who has no expenses and no bonuses: `estimatedTaxOwedPence` is `193180`.

As Ada, on `01-05-2026`, you need one Swedish income (`basePence` `1000`, `additionalFeePence` `200`) and one bonus (`totalPence` `300`) at the same workplace. If those rows were deleted, create them again. Move or delete any other income or bonus on that date, so the top-level total is exactly `1500`.

```text
GET {{baseUrl}}/income/summary?date=01-05-2026
```

Create an unpaid one-line invoice with `POST /invoices` for an amount that is not `1500`, issued on that date. Do not pay it. Request the summary again.

Delete the Swedish income. Request the summary again. Request `GET /tax/summary` while the bonus still exists, then delete the bonus and request the tax summary again.

```text
GET {{baseUrl}}/income/summary?date=01-01-2026
```

```text
GET {{baseUrl}}/income/summary?date=01-04-2026
```

## What you must see

`npm test` passes, including the `1500` summary test and the unchanged tax function tests.

The summary for `01-05-2026` has `basePence` `1000`, `additionalFeePence` `200`, `hourlyBonusPence` `300`, and `totalPence` `1500`. `byWorkplace` names that spa or clinic and its totals add to `1500`. `byMassageType` has `swedish` with base `1000`, fee `200`, and total `1200`. The bonus is not inside `byMassageType`.

The unpaid invoice does not change those four numbers.

After the income is deleted, base and fee are `0`, `hourlyBonusPence` is `300`, and `totalPence` is `300`.

While the bonus exists, `incomePence` on the tax summary is `300` higher than it was before that bonus. It is not `600` higher. After the bonus is deleted, `incomePence` returns to the remembered value. A user with £20,000 and no bonus still has `estimatedTaxOwedPence` `193180`.

`01-01-2026` gets `200` and zeros, if Ada has nothing on that day. `01-04-2026` gets `400` and the message `Date is outside the 2026-27 tax year`.

No Bearer gets `401`. A user who is not onboarded gets `403`.

## If it fails

- `totalPence` is `2700`: `amountPence` was added as well as base and fee. Add the base and the fee, not the total that already contains them.
- `totalPence` is `1800`: the bonus was added twice, once as if it were income and once as a bonus.
- The summary changed when the unpaid invoice was created: the query read `Invoice`. It must read transactions and bonuses only.
- Deleting the income left the summary unchanged: a stored daily total was written. Delete that column. Compute the numbers in the function.
- The tax function file changed: put the bonus sum in the handler that loads data. Leave `calculateTaxSummary` as it was in step 5.

**Pass this step, then continue.**

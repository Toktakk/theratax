# Step 16 — Daily income summary

Guide: [Project plan](02_project_plans.md). Previous: [Step 15 — Bonus](17_step15_bonus.md). Next: [Step 17 — Invoices from records](19_step17_invoices_from_records.md).

## Why this step comes first

The feed shows rows. This step adds one read that totals a civil date: base, additional fees, and bonuses. The total is computed when the request arrives. There is no daily-total column to edit.

Depends on massage income from [step 14](16_step14_massage_income.md) and `bonusPence` from [step 15](17_step15_bonus.md). The bonus is already inside each massage row's `amountPence`. This step breaks that amount back into the three parts for one day. It does not add the bonus a second time. The pure tax function in [step 5](07_step05_tax_calculator.md) stays as it is. `GET /tax/summary` keeps summing income `amountPence` only.

## Not in this step

Do not create invoices from these totals. Do not add invoice `amountPence` into the day. Do not insert a transaction for a bonus. Do not add a new React route. The summary will be shown from `FeedPage.tsx` later. Do not read `HourlyBonus`. If the tax handler still adds a separate bonus total, remove that add. `amountPence` already includes `bonusPence`.

## Concept

`GET /income/summary` takes optional `date` as `DD-MM-YYYY`. Omitted, it is today in `Europe/London`. A date outside `06-04-2026` through `05-04-2027` is `400` `Date is outside the 2026-27 tax year`.

```ts
interface DailyIncomeSummary {
  date: string;
  basePence: number;
  additionalFeePence: number;
  bonusPence: number;
  totalPence: number;
  byWorkplace: {
    workplaceId: number;
    name: string;
    kind: 'spa' | 'clinic';
    basePence: number;
    additionalFeePence: number;
    bonusPence: number;
    totalPence: number;
  }[];
  byMassageType: {
    massageType: string;
    customMassageType?: string;
    basePence: number;
    additionalFeePence: number;
    bonusPence: number;
    totalPence: number;
  }[];
}
```

The grouping is a pure function, `summariseDay`, in `src/income-summary/summarise-day.ts`. The handler loads this user's income rows for that civil date and calls the function. It does not load a bonus table. The controller does not add.

For each income row:

- When `basePence` is set, add `basePence` to base, `additionalFeePence` (or 0) to fees, and `bonusPence` (or 0) to bonuses. Do not also add `amountPence`. `amountPence` is already base plus fee plus bonus.
- When `basePence` is absent, add `amountPence` to base and add nothing to fees or bonuses.

`totalPence` is base plus fees plus bonuses.

`byWorkplace` has one object per workplace that has income that day. Read the workplace name and kind from the `Workplace` row. Income with no workplace stays in the top-level numbers and is left out of `byWorkplace`. A row's bonus is inside that workplace's `bonusPence` and inside its `totalPence`.

`byMassageType` includes only rows that have `massageType`. The same type and the same custom text are one bucket. Two different custom texts stay two buckets. The bucket's `bonusPence` is the sum of `bonusPence` on those rows, and its `totalPence` includes that bonus. Cash income with no massage type stays in the top-level base only.

The top-level bonus counts each row once. Adding a workplace total to a massage-type total counts the same row twice and is not the daily total.

An empty day is `200`. Every pence field is `0`. Both arrays are empty.

In `src/tax-engine/tax-engine.service.ts`, `incomePence` is the paid invoice lines for the tax year, plus a baseline paid invoice that has no lines. Do not add `bonusPence` on top. Do not add the live source `amountPence` when those lines exist. Do not add the invoice total beside the lines. Do not put `20`, `6`, or the disclaimer in the controller. A paid massage bill of `6700` raises `incomePence` by `6700`, once. Editing or deleting that source afterwards does not change it.

Bearer and onboarding match step 13.

## Files for this step

- `src/income-summary/summarise-day.ts`
- `src/income-summary/summarise-day.spec.ts`
- `src/income-summary/dto/daily-summary-query.dto.ts`
- `src/income-summary/income-summary.service.ts`
- `src/income-summary/income-summary.controller.ts`
- `src/income-summary/income-summary.module.ts`
- `src/app.module.ts` adds `IncomeSummaryModule`
- `src/tax-engine/tax-engine.service.ts` sums paid invoice lines, and baseline invoices that have no lines

The query DTO uses optional `date` with `Matches(/^\d{2}-\d{2}-\d{4}$/)`.

The unit test must fail if the function adds `amountPence` on top of the three parts. An income of base `6000`, fee `200`, bonus `500`, and `amountPence` `6700` returns `totalPence` `6700`, not `13400`. It must also fail if the bonus is added twice (`7200`) or dropped (`6200`). A missing bonus is `0`.

## Commands you run

```bash
npm test
```

The £20,000 check from step 9 still applies to a user whose only income is `2_000_000` pence and who has no expenses: `estimatedTaxOwedPence` is `193180`. Read `GET /tax/summary` before this massage row is on a paid invoice when you can. Deleting the source after that invoice is paid does not change `incomePence`.

As Ada, on `01-05-2026`, you need one Swedish income at one workplace: `basePence` `6000`, `additionalFeePence` `200`, `bonusPence` `500`. Reuse the step 15 row if it is still there. Move or delete any other income on that date, so the top-level total is exactly `6700`.

```text
GET {{baseUrl}}/income/summary?date=01-05-2026
```

Create an unpaid invoice only if the current `POST /invoices` still accepts a one-line body that is not `6700`. If create already requires a recipient and a period, skip that invoice and do not pay one. Request the summary again either way. The summary must not read `Invoice`.

Request `GET /tax/summary` while the Swedish row exists and remember `incomePence`. Delete the Swedish income. Request the summary again, then request `GET /tax/summary` again.

```text
GET {{baseUrl}}/income/summary?date=01-01-2026
```

```text
GET {{baseUrl}}/income/summary?date=01-04-2026
```

## What you must see

`npm test` passes, including the `6700` summary test and the unchanged tax function tests.

The summary for `01-05-2026` has `basePence` `6000`, `additionalFeePence` `200`, `bonusPence` `500`, and `totalPence` `6700`. `byWorkplace` names that spa or clinic, and its four figures match the top level. `byMassageType` has `swedish` with base `6000`, fee `200`, bonus `500`, and total `6700`.

An invoice does not change those four numbers.

After the income is deleted, base, fee, bonus, and total are `0`. The bonus does not remain behind on its own.

While a paid invoice bills that row, `incomePence` on the tax summary is `6700` higher than it was before payment. It is not `7200` higher and not `6200` higher. After the source row is deleted, `incomePence` stays at that higher value because the paid lines remain. A user with £20,000 and no other income still has `estimatedTaxOwedPence` `193180`.

`01-01-2026` gets `200` and zeros, if Ada has nothing on that day. `01-04-2026` gets `400` and the message `Date is outside the 2026-27 tax year`.

No Bearer gets `401`. A user who is not onboarded gets `403`.

## If it fails

- `totalPence` is `13400`: `amountPence` was added as well as the three parts. Add the parts, not the total that already contains them.
- `totalPence` is `7200`: the bonus was added twice.
- `totalPence` is `6200`: the bonus column was ignored.
- The summary changed when an invoice was created: the query read `Invoice`. It must read income transactions only.
- Deleting the income left a bonus behind: the bonus was stored on another row. It is `bonusPence` on the transaction.
- Deleting the income left the summary unchanged: a stored daily total was written. Delete that column. Compute the numbers in the function.
- The tax summary rose by more than `6700`: the handler added `bonusPence` on top of `amountPence`. Delete that add. Leave `calculateTaxSummary` as it was in step 5.

**Pass this step, then continue.**

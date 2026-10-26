# Step 5 — Tax calculator

Guide: [Project plan](02_project_plans.md). Previous: [Step 4 — Enable ValidationPipe](06_step04_enable_validation_pipe.md). Next: [Step 6 — Register, login, onboarding](08_step06_register_login_onboarding.md).

## Why this step comes first

The tax figures and the mileage figures are a contract that unit tests can lock without a user, without a token, and without a row in the database. If you put the formula in a controller and only later open `GET /tax/summary`, you cannot tell whether a wrong penny came from the formula or from the query.

[Step 8](10_step08_log_income_and_expenses.md) is the one that calls the mileage calculator. [Step 9](11_step09_tax_summary.md) is the one that calls the tax calculator. Neither of those steps may write the formula again.

## Not in this step

Do not create `GET /tax/summary`. Do not create `POST /transactions`. Do not create an HTTP module for `tax-engine`. In this step the folder has only the functions and the test files.

## Concept

The 2026–27 tax year in this contract is `06-04-2026` through `05-04-2027`. The rates are for England, Wales, and Northern Ireland. The personal allowance of £12,570 is applied in full. It is not tapered at £100,000, because this group of users earns under £50,000 and the API does not store other income.

The bounds in pence are `1_257_000`, `5_027_000`, and `12_514_000`.

| Slice of taxable profit | Income tax | Class 4 |
| --- | --- | --- |
| £0 to £12,570 | 0% | 0% |
| Above £12,570 up to £50,270 | 20% | 6% |
| Above £50,270 up to £125,140 | 40% | 2% |
| Above £125,140 | 45% | 2% |

The slice between bounds `from` and `to` is `max(0, min(profit, to) - from)`. The slice with no ceiling is `max(0, profit - from)`.

Income tax rounds three slices separately: 20% between `1_257_000` and `5_027_000`, 40% between `5_027_000` and `12_514_000`, and 45% above `12_514_000`.

Class 4 rounds two slices: 6% between `1_257_000` and `5_027_000`, and 2% of everything above `5_027_000`. The 2% band is one slice. It is not split at £125,140, because only income tax changes rate there. Splitting the 2% band into two slices rounds twice, and the result can move by one penny.

Rounding each slice means multiply by the rate, divide by 100, and round half away from zero for a non-negative remainder. The method used in the code: take the truncated quotient, and if the remainder is greater than or equal to 50, add one penny. Then add the rounded slices. Rounding once at the end gives a different penny from the tests.

An example the tests must lock. A profit of £20,000 is `2_000_000` pence, with no expenses.

- The basic-rate slice is `2_000_000 - 1_257_000 = 743_000`.
- Income tax is `round(743_000 × 20 / 100) = 148_600`.
- Class 4 is `round(743_000 × 6 / 100) = 44_580`.
- Estimated tax `193_180` is £1,931.80.
- Class 2 is treated as paid, because £20,000 is above the £7,105 threshold (`710_500` pence).

Class 2 is not added into `estimatedTaxOwedPence`. It has not been a compulsory payment since April 2024. The voluntary rate for 2026–27 is £3.65 a week, so `voluntaryWeeklyPence: 365` always. Below £7,105, `treatedAsPaid` is `false`.

Another example proves that each slice is rounded on its own. Profit of `5_027_025` pence.

- The 20% slice is `3_770_000` long and the tax is `754_000`.
- The 40% slice is `25` long and gives `round(1000 / 100) = 10`.
- Income tax total is `754_010`.
- The Class 4 6% slice is `226_200`, and the 2% slice on the `25` pence of profit above `5_027_000` is `round(50 / 100) = 1`, because the remainder equals 50.
- Class 4 total is `226_201`. Estimated tax is `980_211`.

If you round the 2% band together with another slice, that remainder of 50 pence of the product may not become one penny.

A loss must stay visible. Income `100_000` and expenses `250_000` make `netProfitPence` `-150_000`, `taxableProfitPence` `0`, tax and Class 4 `0`, and Class 2 is not treated as paid.

`assumptions` has six items in this order. Copy the characters from the contract, including the en dash in `2026–27`.

1. `Rates are for England, Wales, and Northern Ireland for 2026–27. Scottish Income Tax is not applied.`
2. `Trading profit is treated as the user's only income. The personal allowance of £12,570 is applied in full and is not tapered.`
3. `Cash basis: income counts when it is received, expenses when they are paid. Unpaid invoices are excluded.`
4. `Student loans, pension contributions, Marriage Allowance, and other reliefs are not applied.`
5. `Class 2 National Insurance is not included in estimated tax owed. At or above £7,105 it is treated as paid. Below that, voluntary Class 2 is £3.65 a week and is not added here.`
6. `Flat-rate vehicle costs use simplified mileage for a car or van (55p then 25p). Motorcycle rates are not applied.`

`disclaimer` is this sentence, the whole sentence.

`TheraTax produces estimated tax figures for planning purposes only and is not a substitute for formal accounting or tax advice.`

The tax function receives totals that are already calculated. It does not receive a list of transactions. Choosing which rows fall inside the year is the handler's job in [step 9](11_step09_tax_summary.md). So in this step `taxYear`, `periodStart`, and `periodEnd` are constants for 2026–27.

## 11,000 miles

The car or van mileage rate for 2026–27 is 55 pence per mile for the first 10,000 business miles of the year, and 25 pence after that. Motorcycle rates are out of scope.

One row of 11,000 miles at the start of the year is `10_000 × 55 + 1_000 × 25 = 575_000` pence, which is £5,750.

The mileage function receives every mileage row for that year, then sorts them itself by `occurredOn` ascending. On the same day, the smaller `id` comes first. Then it walks a running total of miles.

- Miles still inside the first 10,000 of the year are priced at 55.
- Miles that overflow are priced at 25.
- That row's `amountPence` is `miles in the first band × 55 + miles in the later band × 25`.

Inserting a row in the past changes the money of the rows that come after it. An example the tests should lock:

- A row dated `01-06-2026`, id `2`, of 11,000 miles, standing alone, is `575_000`.
- When a row dated `06-04-2026`, id `1`, of 1,000 miles is added, that row comes first, gets `1_000 × 55 = 55_000`, and uses 1,000 of the quota.
- The remaining 11,000-mile row therefore gets 55 pence on another `9_000` miles and 25 pence on `2_000` miles, which is `495_000 + 50_000 = 545_000`.

[Step 8](10_step08_log_income_and_expenses.md) loads every mileage row for the year, calls this function, then writes `amountPence` back on every row. Deleting or editing a row calls the same set. The function therefore returns the money for every id that was passed in. It does not return only the row that was just created.

Dates in this function are `DD-MM-YYYY` strings. Sorting that string form directly is the wrong order, because the day is at the start of the string. Build a `YYYY-MM-DD` key only for the comparison.

## Files for this step

- `src/tax-engine/calculate-tax.ts`
- `src/tax-engine/calculate-tax.spec.ts`
- `src/tax-engine/allocate-mileage.ts`
- `src/tax-engine/allocate-mileage.spec.ts`

There is no `tax-engine.module.ts` in this step.

`src/tax-engine/calculate-tax.ts`

```ts
export interface TaxCalculationInput {
  incomePence: number;
  allowableExpensesPence: number;
  expenseMethod: 'flat_rate' | 'actual_cost';
}

export interface TaxSummary {
  taxYear: string;
  periodStart: string;
  periodEnd: string;
  expenseMethod: 'flat_rate' | 'actual_cost';
  incomePence: number;
  allowableExpensesPence: number;
  netProfitPence: number;
  taxableProfitPence: number;
  incomeTaxPence: number;
  class4NationalInsurancePence: number;
  estimatedTaxOwedPence: number;
  class2: {
    treatedAsPaid: boolean;
    voluntaryWeeklyPence: 365;
  };
  assumptions: string[];
  disclaimer: string;
}

const PERSONAL_ALLOWANCE_PENCE = 1_257_000;
const BASIC_RATE_LIMIT_PENCE = 5_027_000;
const ADDITIONAL_RATE_LIMIT_PENCE = 12_514_000;
const CLASS2_THRESHOLD_PENCE = 710_500;

const ASSUMPTIONS = [
  'Rates are for England, Wales, and Northern Ireland for 2026–27. Scottish Income Tax is not applied.',
  'Trading profit is treated as the user\'s only income. The personal allowance of £12,570 is applied in full and is not tapered.',
  'Cash basis: income counts when it is received, expenses when they are paid. Unpaid invoices are excluded.',
  'Student loans, pension contributions, Marriage Allowance, and other reliefs are not applied.',
  'Class 2 National Insurance is not included in estimated tax owed. At or above £7,105 it is treated as paid. Below that, voluntary Class 2 is £3.65 a week and is not added here.',
  'Flat-rate vehicle costs use simplified mileage for a car or van (55p then 25p). Motorcycle rates are not applied.',
];

const DISCLAIMER =
  'TheraTax produces estimated tax figures for planning purposes only and is not a substitute for formal accounting or tax advice.';

function sliceBetween(profitPence: number, fromPence: number, toPence: number): number {
  return Math.max(0, Math.min(profitPence, toPence) - fromPence);
}

function sliceAbove(profitPence: number, fromPence: number): number {
  return Math.max(0, profitPence - fromPence);
}

function roundToPenny(numerator: number): number {
  const quotient = Math.trunc(numerator / 100);
  const remainder = numerator % 100;
  if (remainder >= 50) {
    return quotient + 1;
  }
  return quotient;
}

export function calculateTaxSummary(input: TaxCalculationInput): TaxSummary {
  const netProfitPence = input.incomePence - input.allowableExpensesPence;
  const taxableProfitPence = Math.max(0, netProfitPence);
  const basicSlice = sliceBetween(
    taxableProfitPence,
    PERSONAL_ALLOWANCE_PENCE,
    BASIC_RATE_LIMIT_PENCE,
  );
  const higherSlice = sliceBetween(
    taxableProfitPence,
    BASIC_RATE_LIMIT_PENCE,
    ADDITIONAL_RATE_LIMIT_PENCE,
  );
  const additionalSlice = sliceAbove(taxableProfitPence, ADDITIONAL_RATE_LIMIT_PENCE);
  const incomeTaxPence =
    roundToPenny(basicSlice * 20) +
    roundToPenny(higherSlice * 40) +
    roundToPenny(additionalSlice * 45);
  const class4NationalInsurancePence =
    roundToPenny(basicSlice * 6) +
    roundToPenny(sliceAbove(taxableProfitPence, BASIC_RATE_LIMIT_PENCE) * 2);

  return {
    taxYear: '2026-27',
    periodStart: '06-04-2026',
    periodEnd: '05-04-2027',
    expenseMethod: input.expenseMethod,
    incomePence: input.incomePence,
    allowableExpensesPence: input.allowableExpensesPence,
    netProfitPence,
    taxableProfitPence,
    incomeTaxPence,
    class4NationalInsurancePence,
    estimatedTaxOwedPence: incomeTaxPence + class4NationalInsurancePence,
    class2: {
      treatedAsPaid: taxableProfitPence >= CLASS2_THRESHOLD_PENCE,
      voluntaryWeeklyPence: 365,
    },
    assumptions: ASSUMPTIONS,
    disclaimer: DISCLAIMER,
  };
}
```

`src/tax-engine/allocate-mileage.ts`

```ts
export interface MileageDraft {
  id: number;
  occurredOn: string;
  miles: number;
}

export interface MileageAmount {
  id: number;
  amountPence: number;
}

const BAND_LIMIT_MILES = 10_000;
const RATE_FIRST_PENCE = 55;
const RATE_SECOND_PENCE = 25;

function sortKey(occurredOn: string): string {
  const [day, month, year] = occurredOn.split('-');
  return `${year}-${month}-${day}`;
}

export function allocateMileageAmounts(rows: MileageDraft[]): MileageAmount[] {
  const ordered = [...rows].sort((left, right) => {
    const byDate = sortKey(left.occurredOn).localeCompare(sortKey(right.occurredOn));
    if (byDate !== 0) {
      return byDate;
    }
    return left.id - right.id;
  });

  let used = 0;
  return ordered.map((row) => {
    const room = Math.max(0, BAND_LIMIT_MILES - used);
    const milesAt55 = Math.min(row.miles, room);
    const milesAt25 = row.miles - milesAt55;
    used += row.miles;
    return {
      id: row.id,
      amountPence: milesAt55 * RATE_FIRST_PENCE + milesAt25 * RATE_SECOND_PENCE,
    };
  });
}
```

Tests use Vitest through `npm test`. The project already turns `globals` on, so you can call `describe`, `it`, and `expect` without importing them.

`src/tax-engine/calculate-tax.spec.ts` must contain these three cases.

```ts
import { calculateTaxSummary } from './calculate-tax.js';

describe('calculateTaxSummary', () => {
  it('estimates tax on a £20,000 profit', () => {
    const summary = calculateTaxSummary({
      incomePence: 2_000_000,
      allowableExpensesPence: 0,
      expenseMethod: 'flat_rate',
    });

    expect(summary.taxYear).toBe('2026-27');
    expect(summary.periodStart).toBe('06-04-2026');
    expect(summary.periodEnd).toBe('05-04-2027');
    expect(summary.netProfitPence).toBe(2_000_000);
    expect(summary.taxableProfitPence).toBe(2_000_000);
    expect(summary.incomeTaxPence).toBe(148_600);
    expect(summary.class4NationalInsurancePence).toBe(44_580);
    expect(summary.estimatedTaxOwedPence).toBe(193_180);
    expect(summary.class2).toEqual({
      treatedAsPaid: true,
      voluntaryWeeklyPence: 365,
    });
    expect(summary.assumptions).toHaveLength(6);
    expect(summary.disclaimer).toBe(
      'TheraTax produces estimated tax figures for planning purposes only and is not a substitute for formal accounting or tax advice.',
    );
  });

  it('rounds each slice on its own', () => {
    const summary = calculateTaxSummary({
      incomePence: 5_027_025,
      allowableExpensesPence: 0,
      expenseMethod: 'actual_cost',
    });

    expect(summary.expenseMethod).toBe('actual_cost');
    expect(summary.incomeTaxPence).toBe(754_010);
    expect(summary.class4NationalInsurancePence).toBe(226_201);
    expect(summary.estimatedTaxOwedPence).toBe(980_211);
  });

  it('keeps a loss visible and charges no tax', () => {
    const summary = calculateTaxSummary({
      incomePence: 100_000,
      allowableExpensesPence: 250_000,
      expenseMethod: 'flat_rate',
    });

    expect(summary.netProfitPence).toBe(-150_000);
    expect(summary.taxableProfitPence).toBe(0);
    expect(summary.incomeTaxPence).toBe(0);
    expect(summary.class4NationalInsurancePence).toBe(0);
    expect(summary.estimatedTaxOwedPence).toBe(0);
    expect(summary.class2.treatedAsPaid).toBe(false);
    expect(summary.class2.voluntaryWeeklyPence).toBe(365);
  });
});
```

`src/tax-engine/allocate-mileage.spec.ts`

```ts
import { allocateMileageAmounts } from './allocate-mileage.js';

describe('allocateMileageAmounts', () => {
  it('prices 11,000 miles at the start of the year as £5,750', () => {
    const amounts = allocateMileageAmounts([
      { id: 1, occurredOn: '06-04-2026', miles: 11_000 },
    ]);

    expect(amounts).toEqual([{ id: 1, amountPence: 575_000 }]);
  });

  it('reprices the later row when an earlier trip is inserted', () => {
    const amounts = allocateMileageAmounts([
      { id: 2, occurredOn: '01-06-2026', miles: 11_000 },
      { id: 1, occurredOn: '06-04-2026', miles: 1_000 },
    ]);

    expect(amounts).toEqual([
      { id: 1, amountPence: 55_000 },
      { id: 2, amountPence: 545_000 },
    ]);
  });
});
```

The second test puts the June row first in the array, to prove that the function sorts itself and does not trust the order the caller sent.

## Commands you run

```bash
npm test
```

## What you must see

The £20,000 profit case passes, with `estimatedTaxOwedPence` equal to `193180` in the expectation.

The 11,000-mile case passes, with `amountPence` equal to `575000`.

The rounding case and the loss case pass too. The app at `localhost:3000` still answers `Hello World!`, and there is still no `GET /tax/summary`.

Send this from Postman.

```text
GET {{baseUrl}}/tax/summary
```

This request must not yet be the tax-summary response. If an old draft already has this route, do not use it as the check for step 5. The check is `npm test`.

## If it fails

- `193181` or `193179`: the formula rounded once at the end, or it used a decimal number of pounds. Multiply in pence and round each slice.
- Class 4 on the `5_027_025` case is `226200`: the remainder of 50 was not rounded up. The condition is a remainder greater than or equal to 50.
- `assumptions` is not length 6, or the disclaimer does not match: compare the characters with [`api-spec.md`](api-spec.md), including the `–` in `2026–27`.
- 11,000 miles gives `605000`: all 11,000 miles were priced at 55 pence. Mile 10,001 onward must be 25.
- The backdated-row test gives the same money as a single row: the function sorted `DD-MM-YYYY` as a raw string. The date `06-04-2026` must come before `01-06-2026` through a `YYYY-MM-DD` key.
- The test cannot find the module: the import in the test file must end in `.js`.

**Pass this step, then continue.** [Step 6](08_step06_register_login_onboarding.md) is the first step that writes a product endpoint.

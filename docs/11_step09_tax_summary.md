# Step 9 — Tax summary

Guide: [Project plan](02_project_plans.md). Previous: [Step 8 — Log income and expenses](10_step08_log_income_and_expenses.md). Next: [Step 10 — Receipt images](12_step10_receipt_images.md).

## Why this step comes first

You now have the function from [step 5](07_step05_tax_calculator.md) and the money rows from [step 8](10_step08_log_income_and_expenses.md). This step only loads the totals and calls the function. If you write the 20% or 6% rate again in the controller, the unit tests still pass and the summary page walks a different formula.

## Not in this step

Do not upload images. Do not create invoices. An unpaid invoice has no income row, so it is already left out of the total without this step knowing the invoice table.

## Concept

`GET /tax/summary` accepts a query `taxYear` as an integer. Sending it is optional.

The default is the tax year that contains today in `Europe/London`. The contract supports only 2026–27. If today falls inside `06-04-2026` through `05-04-2027`, omitting the query means `2026`. If today falls outside that window and the query is omitted, return `400`. If `taxYear` is sent and it is not `2026`, return `400` with the message `Only the 2026-27 tax year is supported`. The contract locks the status at 400, and this lesson locks this sentence so it is used in one place.

`taxYear=abc` is a 400 from the pipe, and `message` is an array, because the query DTO uses `@Type(() => Number)` with `@IsInt()`. That is a different shape from the string message above.

The handler does four things and stops.

1. `assertOnboarded`. If onboarding is not finished, return 403 with the same message.
2. Decide the year 2026, or 400.
3. `aggregate` the sum of `amountPence` for income, and for expenses, whose `occurredOn` is inside `06-04-2026` through `05-04-2027` for this user. A sum that is `null` because there are no rows counts as 0.
4. Call `calculateTaxSummary` with those two sums and `user.expenseMethod`, then return the whole value the function returns.

The controller must not contain the numbers `20`, `6`, `55`, `1257000`, or the disclaimer text. Open the controller file and search for those words. They must not be there.

Income that is counted includes both feed income and the income [step 11](13_step11_invoices_and_pdf.md) will create when an invoice is paid. This step has no invoices yet, so you only see rows you logged yourself. Allowable expenses are the sum of `expense` rows in the same window. A loss stays on `netProfitPence`. Tax uses `taxableProfitPence`, which is not negative.

[Step 16](18_step16_daily_income_summary.md) adds hourly-bonus `totalPence` into `incomePence` once. A database with no bonus rows leaves this step's check unchanged, because that extra sum is 0. Do not add `basePence` on top of `amountPence`. Do not make that change in this step.

## Files for this step

- `src/tax-engine/dto/tax-summary-query.dto.ts`
- `src/tax-engine/tax-engine.service.ts`
- `src/tax-engine/tax-engine.controller.ts`
- `src/tax-engine/tax-engine.module.ts`
- `src/app.module.ts` adds the module

The service injects only `PrismaService`. Do not inject the calculator as a class, because the function can be imported directly.

```ts
return calculateTaxSummary({
  incomePence: income._sum.amountPence ?? 0,
  allowableExpensesPence: expenses._sum.amountPence ?? 0,
  expenseMethod: user.expenseMethod,
});
```

The controller is `@Controller('tax')`, `@UseGuards(AuthGuard)`, and the method `@Get('summary')` takes `@CurrentUser() user: PublicUser` and `@Query() query: TaxSummaryQueryDto`. The module has `imports: [AuthModule]`.

## Commands you run

Register a third user named Cai. Do not onboard yet, then call the summary. Use Ada, who has income `2000000` from [step 8](10_step08_log_income_and_expenses.md), for the number case. If Ada also has mileage expenses, the result will not be exactly £20,000. Use a new user who onboards as `flat_rate`, logs a single income of `2000000` on `01-05-2026` with no expenses, and then call the summary with that person's token. Store `accessToken` in the variable `cai`.

Before Cai onboards, her first request must be 403. The order is therefore: register, call the summary to see 403, onboard, log the single income, call the summary again.

The first four requests use Bearer `{{cai}}`. The last request has Authorization turned off.

```text
GET {{baseUrl}}/tax/summary
```

```text
GET {{baseUrl}}/tax/summary?taxYear=2026
```

```text
GET {{baseUrl}}/tax/summary?taxYear=2025
```

```text
GET {{baseUrl}}/tax/summary?taxYear=abc
```

```text
GET {{baseUrl}}/tax/summary
```

## What you must see

Before onboarding you get `403` and the message `Complete onboarding before using this resource`.

After income of `2_000_000` pence and no expenses, the `200` response has

- `taxYear` of `2026-27`
- `periodStart` of `06-04-2026`
- `periodEnd` of `05-04-2027`
- `incomePence` of `2000000`
- `allowableExpensesPence` of `0`
- `netProfitPence` of `2000000`
- `taxableProfitPence` of `2000000`
- `incomeTaxPence` of `148600`
- `class4NationalInsurancePence` of `44580`
- `estimatedTaxOwedPence` of `193180`
- `class2.treatedAsPaid` of `true`
- `class2.voluntaryWeeklyPence` of `365`
- `assumptions` of length 6, with text matching [step 5](07_step05_tax_calculator.md)
- `disclaimer` matching the sentence in the contract
- `expenseMethod` matching what was onboarded

`taxYear=2025` gets `400` and the message `Only the 2026-27 tax year is supported`.

`taxYear=abc` gets `400` and `message` is an array.

No Bearer gets `401` and the message `Unauthorized`.

`npm test` still passes. This set of numbers must match the £20,000 test. Do not recalculate them in your head.

## If it fails

- The totals are right but the tax pence do not match the test: the service rounded or multiplied a rate itself. Delete those numbers and call `calculateTaxSummary`.
- Income is 0 even though rows exist: the `aggregate` date window does not match the dates written into `@db.Date`, or you forgot to filter `type`.
- You included Ada's mileage and the number is not `193180`: that is correct, because there are expenses. The exact-number check uses a user with no expense rows.
- There are no invoices yet, but you wrote a query against the `Invoice` table: that is [step 11](13_step11_invoices_and_pdf.md). The total comes only from the transaction table. Bonus rows are [step 16](18_step16_daily_income_summary.md). With none in the database, this check does not add them.

**Pass this step, then continue.**

# Step 14 — Massage income

Guide: [Project plan](02_project_plans.md). Previous: [Step 13 — Workplaces](15_step13_workplaces.md). Next: [Step 15 — Hourly bonuses](17_step15_hourly_bonuses.md).

## Why this step comes first

The feed logs a massage on the transaction that [step 8](10_step08_log_income_and_expenses.md) already stores. Income and expense stay one table. The list puts income before expense on the same day so the feed does not need a second request or a second store.

Depends on step 13, because `workplaceId` must point at a saved workplace. Cash income with only `amountPence` must keep working, so step 8's bodies still get `201`.

## Not in this step

Do not add hourly bonuses or `GET /income/summary`. Do not add `clientId`. Do not change invoice pay. Do not require a receipt. Do not add a React page.

## Concept

Add the enum and the columns. Declare `income` before `expense` in `TransactionType`, which is already the order in the schema. `type: 'asc'` then puts income first.

```prisma
enum MassageType {
  deep_tissue
  thai_oil
  thai_yoga
  aroma
  pregnancy
  lymphatic
  foot
  swedish
  back_neck
  sport
  hot_stone
  other
}
```

On `Transaction`, add optional `massageType`, `customMassageType`, `basePence`, `additionalFeePence`, and `workplaceId`. Add `createdAt DateTime @default(now())` and `updatedAt DateTime @updatedAt`. Add the relation to `Workplace`, and add `transactions Workplace[]` on `Workplace`.

You run the migration. Do not reset the database. Existing rows gain timestamps and null massage columns.

```bash
npx prisma migrate dev --name massage_income
```

The names the feed and a later invoice line show:

| Value | Name |
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

Create accepts the step 8 fields plus optional `massageType`, `customMassageType` (1–100 characters), `basePence` (integer 1 to `100_000_000`), `additionalFeePence` (integer 0 to `100_000_000`), and `workplaceId`. Update accepts any subset of those, and still has no `type`. Sending `type` is `400` from the pipe.

The pipe checks types and ranges. The service checks the combination.

- Cash income may still send only `amountPence`. Omit the massage keys on the way out.
- When `massageType` is set, `basePence` is required. The message is `Base amount is required`. An omitted fee is stored as `0`, and the response includes `additionalFeePence: 0`.
- The server sets `amountPence` to `basePence + additionalFeePence`. A client `amountPence` that is not that sum is `400` `Amount must equal base plus additional fee`. If the sum is above `100_000_000`, the message is `Amount is above the maximum`.
- The fee is the number the user sent. Do not look up a fee from the massage type.
- `customMassageType` is required when the type is `other`. The message is `Custom massage type is required`. On any other type it is `400` `Custom massage type is only valid for other`.
- A massage type on an expense is `400` `Massage type is only valid on income`. A fee, a base, or a custom type on an expense is `400` `Additional fee is only valid on massage income`. `workplaceId` on an expense is `400` `Workplace is only valid on income`.
- `workplaceId` must be this user's workplace. A missing id and another user's id are both `404` `Workplace <id> not found`. Store the id only. Do not copy the workplace name onto the transaction.
- `createdAt` and `updatedAt` are always present, ISO 8601. The client does not send them. A `PATCH` changes `updatedAt`.

`GET /transactions` orders by `occurredOn` descending, then `type` ascending, then `id` descending. Because the enum lists `income` before `expense`, ascending type puts income first inside one day. Newer days stay above older days. `?type=income` and `?type=expense` still filter.

Mileage math from step 8 is unchanged. A row that has `invoiceId` is still immutable.

## Files for this step

- `prisma/schema.prisma`
- `src/transactions/dto/create-transaction.dto.ts`
- `src/transactions/dto/update-transaction.dto.ts`
- `src/transactions/transactions.service.ts`
- `src/transactions/transaction-response.ts`

The new money fields use `IsOptional`, `IsInt`, `Min`, and `Max`. `massageType` uses `IsIn` with the twelve values. `workplaceId` uses `IsInt` and `Min(1)`.

## Commands you run

```bash
npm test
```

Use Ada as Bearer `{{token}}` and the workplace id from step 13. Log Swedish income of £10.00 plus a £2.00 fee on 1 May 2026.

```text
POST {{baseUrl}}/transactions
```

```json
{"type":"income","occurredOn":"01-05-2026","massageType":"swedish","basePence":1000,"additionalFeePence":200,"workplaceId":1}
```

Replace `workplaceId` with Ada's real id. Store the new transaction id as `massageTx`.

Then send the failures, still as Ada.

```json
{"type":"income","massageType":"swedish","basePence":1000,"additionalFeePence":-1}
```

```json
{"type":"expense","categorySlug":"other","amountPence":100,"occurredOn":"01-05-2026","massageType":"swedish"}
```

```json
{"type":"income","massageType":"other","basePence":1000,"occurredOn":"01-05-2026"}
```

```json
{"type":"income","massageType":"swedish","basePence":1000,"additionalFeePence":200,"amountPence":999,"occurredOn":"01-05-2026"}
```

```json
{"type":"income","amountPence":100,"occurredOn":"02-05-2026"}
```

Repeat a successful `POST` once for each remaining type, with `basePence` `100` and a date inside the tax year: `deep_tissue`, `thai_oil`, `thai_yoga`, `aroma`, `pregnancy`, `lymphatic`, `foot`, `back_neck`, `sport`, `hot_stone`. For `other`, include `"customMassageType":"Chair massage"`.

Create an expense on `01-05-2026` after the Swedish income exists, then list that day. The list is the normal `GET /transactions?limit=100`. Also `GET` the Swedish row and `PATCH` its note to `follow up`.

Try Ada's body with Bea's workplace id, or with a workplace id that does not exist. Use a user who is not Ada. If you have no second workplace, `workplaceId` `999999` is enough for the not-found check.

## What you must see

`npm test` still passes, including mileage and the £20,000 tax test.

The Swedish `POST` gets `201`. `amountPence` is `1200`. `additionalFeePence` is `200`, which is £2. `basePence` is `1000`. `massageType` is `swedish`. `hasReceipt` is `false`. There is no copied workplace name. `createdAt` and `updatedAt` are ISO 8601.

A negative fee gets `400` and `message` is an array. The expense with a massage type gets `400` and the message `Massage type is only valid on income`. `other` without custom text gets `400` and the message `Custom massage type is required`. A total that is not base plus fee gets `400` and the message `Amount must equal base plus additional fee`.

Each of the twelve types gets `201`. `other` echoes `customMassageType` of `Chair massage`.

Cash income of `100` pence gets `201` and does not include `massageType`, `basePence`, or `additionalFeePence`.

On `01-05-2026`, the income row appears before the expense row. A later day still appears above an earlier day.

`PATCH` of the note gets `200`, the same `amountPence`, and a later `updatedAt`.

Another user's workplace id, or an unknown id, gets `404` and the message `Workplace <id> not found`.

`POST` still does not take a file. This income row has no receipt.

## If it fails

- `amountPence` is `200` and `basePence` is missing: the handler stored the fee as the total. The total is base plus fee.
- The fee became `500` because the type was Swedish: a table of fees was added. Delete it. The user types the fee.
- The list shows the expense above the income on the same day: `orderBy` is missing `type: 'asc'`, or `income` is not the first value of the enum.
- Cash income from step 8 now gets `400`: `massageType` was made required for every income row. It is required only when it is sent.
- `createdAt` is a `Date` object in JSON: format it with `toISOString()` before you send it.

**Pass this step, then continue.**

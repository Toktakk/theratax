# Step 7 — Expense categories

Guide: [Project plan](02_project_plans.md). Previous: [Step 6 — Register, login, onboarding](08_step06_register_login_onboarding.md). Next: [Step 8 — Log income and expenses](10_step08_log_income_and_expenses.md).

## Why this step comes first

The logging screen needs the category list before it can pick a category and hint from a note. The contract lets you fetch this list even before onboarding, so the client can prepare the list in advance. This step therefore has one endpoint, and it does not accept money yet.

## Not in this step

Do not write `POST /transactions`. Do not build a hint endpoint. Hinting is the browser's job in [step 12](14_step12_react_pages.md).

## Concept

Categories are seeded as a fixed list. The user cannot create their own, because the point of the product is that they do not set up a chart of accounts. `GET /expense-categories` returns a bare array. It is not wrapped in `{ items }`, and it is not paginated. There are always 7 rows, in this order.

| slug | name | kind | keywords |
| --- | --- | --- | --- |
| `oils-consumables` | Oils and consumables | `general` | oil, oils, cream, wax, tape, consumable, balm |
| `hcpc-fees` | HCPC registration | `general` | hcpc, registration, membership |
| `professional-insurance` | Professional insurance | `general` | indemnity, insurance |
| `laundry` | Laundry | `general` | laundry, towel, linen, washing |
| `mileage` | Mileage | `mileage` | mileage, miles, petrol, fuel, travel |
| `vehicle-costs` | Vehicle costs | `vehicle_actual` | fuel, petrol, mot, service, repair, servicing |
| `other` | Other | `general` | no keywords |

The five profession categories from the proposal are oils and consumables, HCPC fees, mileage, insurance, and laundry. `vehicle-costs` exists so someone who chose actual cost has a place for fuel and repairs. `other` exists so a 30-second log can finish when no named category matches.

Alphabetical slug order is not this order, so the database cannot sort it for you. A constant array in the code is the order that goes out. The service reads every row, then puts them back into that order. If any slug is missing, the seed is incomplete. Respond with `InternalServerErrorException`, because that is an internal failure, not the client's fault.

Seed in this service's `onModuleInit`, through the `PrismaService` that is already injected. Use `upsert` so a restart can run again without creating duplicate rows. Do not construct another `PrismaClient` in a seed script.

`mileage` is allowed only when `expenseMethod` is `flat_rate`. `vehicle-costs` is allowed only when it is `actual_cost`. The five `general` categories are always allowed. This rule is not enforced in this step, because nothing writes a transaction yet. [Step 8](10_step08_log_income_and_expenses.md) enforces it. This step only returns the full list, so the client knows what exists.

The words `fuel` and `petrol` sit in both the mileage category and the vehicle-cost category. At one moment the user has only one of those categories left, so the hint can land on only one. Under flat rate, a note "petrol" should be `mileage`, because the 55-then-25 pence rate already covers fuel and the user types miles. Under actual cost, the same note should be `vehicle-costs`, and the user types the deductible amount.

Parking, tolls, and train fares can be claimed on top of mileage, on the same GOV.UK page. They are not mileage. Log them as `other` with `amountPence`. Those words are left out of `mileage` keywords on purpose, and `other` has no keywords, so it is never hinted.

This path requires Bearer. It can be called before onboarding. Calling transactions or the tax summary before onboarding is not allowed. That is a different gate, and it is not built in this step.

## Files for this step

- `src/expense-categories/expense-categories.ts` the constant array
- `src/expense-categories/expense-categories.service.ts`
- `src/expense-categories/expense-categories.controller.ts`
- `src/expense-categories/expense-categories.module.ts`
- `src/app.module.ts` adds this module

The shape of a returned row

```ts
export interface ExpenseCategory {
  slug: string;
  name: string;
  keywords: string[];
  kind: 'general' | 'mileage' | 'vehicle_actual';
}

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  {
    slug: 'oils-consumables',
    name: 'Oils and consumables',
    kind: 'general',
    keywords: ['oil', 'oils', 'cream', 'wax', 'tape', 'consumable', 'balm'],
  },
  {
    slug: 'hcpc-fees',
    name: 'HCPC registration',
    kind: 'general',
    keywords: ['hcpc', 'registration', 'membership'],
  },
  {
    slug: 'professional-insurance',
    name: 'Professional insurance',
    kind: 'general',
    keywords: ['indemnity', 'insurance'],
  },
  {
    slug: 'laundry',
    name: 'Laundry',
    kind: 'general',
    keywords: ['laundry', 'towel', 'linen', 'washing'],
  },
  {
    slug: 'mileage',
    name: 'Mileage',
    kind: 'mileage',
    keywords: ['mileage', 'miles', 'petrol', 'fuel', 'travel'],
  },
  {
    slug: 'vehicle-costs',
    name: 'Vehicle costs',
    kind: 'vehicle_actual',
    keywords: ['fuel', 'petrol', 'mot', 'service', 'repair', 'servicing'],
  },
  {
    slug: 'other',
    name: 'Other',
    kind: 'general',
    keywords: [],
  },
];
```

The service injects `PrismaService`. In `onModuleInit`, `upsert` every row with `where: { slug }`, updating `name`, `keywords`, and `kind`, and creating with the same payload.

The `list` method reads every row, builds a `Map` from slug, then `map`s along `EXPENSE_CATEGORIES`. The `findBySlug` method returns the row or `null`. [Step 8](10_step08_log_income_and_expenses.md) will call that method. Do not add another route for it.

The controller

```ts
@Controller('expense-categories')
@UseGuards(AuthGuard)
export class ExpenseCategoriesController {
  constructor(private readonly categories: ExpenseCategoriesService) {}

  @Get()
  list(): Promise<ExpenseCategory[]> {
    return this.categories.list();
  }
}
```

The module has `imports: [AuthModule]` and registers the controller and the service. `AppModule` imports this module.

## Commands you run

Restart the app so `onModuleInit` inserts the rows. Register a second user who is not onboarded yet. On the Tests tab, store the token in `bee`.

```text
POST {{baseUrl}}/auth/register
```

```json
{"email":"bee@example.com","password":"correct-horse","name":"Bea"}
```

```js
pm.environment.set('bee', pm.response.json().accessToken);
```

Then

```text
GET {{baseUrl}}/expense-categories
```

The first request uses Bearer `{{bee}}`. The second sends the same path with Authorization turned off.

```bash
docker compose exec postgres psql -U theratax -d theratax_dev -c 'SELECT slug FROM "ExpenseCategory"'
```

## What you must see

Bea's request gets `200` and is an array of length 7. There is no `items` key. The slug order is `oils-consumables`, `hcpc-fees`, `professional-insurance`, `laundry`, `mileage`, `vehicle-costs`, `other`.

`mileage` keywords include `petrol` and `fuel`. `vehicle-costs` has those two words as well. `other` has `keywords` of `[]`.

Bea's `onboardedAt` is still `null`, which you can see from `GET /users/me`. Her category request still succeeds.

A request with no Bearer gets `401` and the message `Unauthorized`.

`SELECT` shows 7 slugs. Restart the app once more and the count is still 7.

## If it fails

- You get an object with `items`: that is the paginated shape from [step 8](10_step08_log_income_and_expenses.md). This path returns a bare array.
- The order is alphabetical: you answered from `findMany` without arranging it to the constant array.
- Bea gets 403: the onboarding check was called by accident. The category path must not call it.
- You get 401 even with Bearer: this module does not `imports: [AuthModule]`, or `AuthModule` does not export the guard yet. The app cannot construct the guard, or it constructs it and cannot find `AuthService`.
- The table is empty: the process that is running is an old one that does not have this `onModuleInit`.

**Pass this step, then continue.**

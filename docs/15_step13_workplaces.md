# Step 13 — Workplaces

Guide: [Project plan](02_project_plans.md). Previous: [Step 12 — React pages](14_step12_react_pages.md). Next: [Step 14 — Massage income](16_step14_massage_income.md).

## Why this step comes first

Massage income and hourly bonuses both point at a saved spa or clinic. The invoice in [step 17](19_step17_invoices_from_records.md) reuses the same row. This step only creates and lists workplaces. It does not put a workplace id on a transaction yet.

Depends on the bearer token and `assertOnboarded` from [step 8](10_step08_log_income_and_expenses.md). Do not start it before that step's check passes.

## Not in this step

Do not add massage fields. Do not add bonuses, clients, or a daily summary. Do not change `POST /invoices`. Do not add a React route. The feed page will call this list later. It does not call it in this step.

## Concept

One workplace belongs to one user. A transaction will store the id, not a copy of the name. That copy happens only when an invoice is issued, in step 17.

Add this to `prisma/schema.prisma`. Leave the existing models in place. Add the relation on `User` and do not add `workplaceId` to `Transaction` yet.

```prisma
enum WorkplaceKind {
  spa
  clinic
}

model Workplace {
  id        Int           @id @default(autoincrement())
  name      String
  kind      WorkplaceKind
  createdAt DateTime      @default(now())
  updatedAt DateTime      @updatedAt
  userId    Int
  user      User          @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}
```

You run the migration. Do not reset the database. The command only adds this table.

```bash
npx prisma migrate dev --name workplaces
```

```ts
interface Workplace {
  id: number;
  name: string;
  kind: 'spa' | 'clinic';
  createdAt: string;
  updatedAt: string;
}
```

`POST /workplaces` takes `name` and `kind`. Trim `name`, then it must be 1 to 200 characters. A name that is only spaces is `400` with the message `Name is required`. `kind` is only `spa` or `clinic`.

The same user, the same kind, and the same name ignoring case is `409`.

```json
{ "message": "Workplace already saved", "error": "Conflict", "statusCode": 409 }
```

`North Spa` and `north spa` are one workplace. A spa and a clinic may use the same display name. Store the trimmed name from the first save.

`GET /workplaces` uses the `items`, `total`, `skip`, `limit` envelope from step 8. Order by `name` ascending, then `id` ascending. Return only rows whose `userId` is the token user. `skip` and `limit` use the same bounds as the transaction list.

`createdAt` and `updatedAt` are ISO 8601. Do not send a `Date`. Do not send `userId`.

Every path uses `AuthGuard` and `assertOnboarded`. No token is `401` `Unauthorized`. A user who is not onboarded is `403` `Complete onboarding before using this resource`.

## Files for this step

- `prisma/schema.prisma`
- `src/workplaces/dto/create-workplace.dto.ts`
- `src/workplaces/dto/list-workplaces-query.dto.ts`
- `src/workplaces/workplaces.service.ts`
- `src/workplaces/workplaces.controller.ts`
- `src/workplaces/workplaces.module.ts`
- `src/app.module.ts` adds `WorkplacesModule`

The create DTO uses `IsString`, `MinLength(1)`, `MaxLength(200)`, and `IsIn(['spa', 'clinic'])`. The module imports `AuthModule`. `POST` has no `@HttpCode`, so it is 201.

## Commands you run

Use Ada, who is already onboarded, as Bearer `{{token}}`. Use Bea, before she is onboarded, as Bearer `{{bee}}`. If Bea is already onboarded, register a new user and store that token as `bee`.

```text
POST {{baseUrl}}/workplaces
```

```json
{"name":"North Spa","kind":"spa"}
```

On the Tests tab, store the id.

```js
pm.environment.set('workplaceId', String(pm.response.json().id));
```

Send the same name with different capitals, then the same name as a clinic, then a blank kind.

```json
{"name":"north spa","kind":"spa"}
```

```json
{"name":"North Spa","kind":"clinic"}
```

```json
{"name":" ","kind":"spa"}
```

```json
{"name":"Hotel","kind":"hotel"}
```

```text
GET {{baseUrl}}/workplaces?limit=20
```

Repeat that GET with Bearer `{{bee}}` before Bea is onboarded, and again with no Authorization header.

## What you must see

The first `POST` gets `201`. `kind` is `spa`. `name` is `North Spa`. `createdAt` and `updatedAt` are ISO 8601. There is no `userId`.

`north spa` gets `409` and the message `Workplace already saved`.

The clinic `POST` gets `201`. A spa and a clinic may share the display name.

The space name gets `400` and the message `Name is required`. `kind` `hotel` gets `400` and `message` is an array.

Ada's list contains her spa and her clinic and nobody else's rows. `total` counts before `skip` and `limit`.

Bea, not onboarded, gets `403` and the message `Complete onboarding before using this resource`. No Bearer gets `401` and the message `Unauthorized`.

`npm test` still passes. `POST /transactions` from step 8 still gets `201` with no workplace field.

## If it fails

- `north spa` gets `201`: the comparison was case-sensitive, or the name was not trimmed before the check.
- Bea's list contains Ada's id: the query did not filter `userId`.
- The migration dropped `Transaction`: the command was a reset. Stop. Restore the database from the existing migration history. Do not run `migrate reset`.

**Pass this step, then continue.**

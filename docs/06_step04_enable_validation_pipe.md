# Step 4 — Enable ValidationPipe

Guide: [Project plan](02_project_plans.md). Previous: [Step 3 — Add Prisma](05_step03_add_prisma.md). Next: [Step 5 — Tax calculator](07_step05_tax_calculator.md).

## Why this step comes first

Every later body depends on the same pipe. If you have not seen a strange field get rejected, you will misread [step 6](08_step06_register_login_onboarding.md) and think the register DTO is written wrong, when the pipe is not running yet.

## Not in this step

Do not write `POST /auth/register` or any product endpoint. The probe in this step exists to prove the pipe, and you must delete it before the step ends.

## Concept

A global `ValidationPipe` runs on every `@Body()` that is a class.

- `whitelist: true` strips fields that are not on the DTO from the object passed to the method.
- `forbidNonWhitelisted: true` does not strip them quietly. A strange field returns `400` immediately. A `type` field a user sends to edit a transaction in [step 8](10_step08_log_income_and_expenses.md) therefore fails at the pipe, because the `PATCH` DTO has no `type`.
- `transform: true` converts values to the declared type. For example the query `limit=20` goes from a string to a number when the DTO uses `@Type(() => Number)`.

When the pipe rejects, the response has this shape. `message` is an array.

```json
{
  "message": ["label must be a string"],
  "error": "Bad Request",
  "statusCode": 400
}
```

When code in a service throws `BadRequestException` with a string, `message` is a single string. This step does not throw that itself. It only needs you to see the array shape first.

The probe uses a DTO with one required field named `label`. You must see `400` in two cases.

1. The body has a field the class does not declare.
2. The body has no `label`.

A correct `label` must get `200` temporarily, so you know the pipe is not rejecting everything. Then delete the probe, and the same request must no longer reach a handler.

## Files for this step

- `src/main.ts` adds the pipe
- `src/dev/probe.dto.ts` created temporarily
- `src/dev/probe.controller.ts` created temporarily
- `src/app.module.ts` registers `ProbeController` temporarily

In `bootstrap`, after `NestFactory.create` and before `listen`

```ts
import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
```

`src/dev/probe.dto.ts`

```ts
import { IsString, MinLength } from 'class-validator';

export class ProbeDto {
  @IsString()
  @MinLength(1)
  label: string;
}
```

`src/dev/probe.controller.ts`

```ts
import { Body, Controller, Post } from '@nestjs/common';
import { ProbeDto } from './probe.dto.js';

@Controller('dev')
export class ProbeController {
  @Post('validate')
  validate(@Body() body: ProbeDto): { label: string } {
    return { label: body.label };
  }
}
```

Put `ProbeController` in `controllers` of `AppModule`, then restart `start:dev`.

## Commands you run

Send three requests from Postman to the same path.

```text
POST {{baseUrl}}/dev/validate
```

A strange field

```json
{"label":"ok","extra":1}
```

A missing required field

```json
{}
```

A body that follows the rule

```json
{"label":"ok"}
```

When those three requests match the check, delete `src/dev/probe.dto.ts`, `src/dev/probe.controller.ts`, and remove `ProbeController` from `AppModule`. Restart, then send `{"label":"ok"}` again.

`GET {{baseUrl}}/` must still be `Hello World!`.

## What you must see

The request with `extra` gets `400`, and `message` is an array that mentions the property `extra` should not exist.

The request `{}` gets `400`, and `message` is an array that mentions `label`.

The request `{"label":"ok"}` before you delete the probe gets `200` and the response `{"label":"ok"}`. The field `extra` must not appear in the response of the first case, because that case is rejected as a whole.

After you delete the probe, the same request gets `404`. The pipe in `main.ts` is still there.

## If it fails

- A field `extra` gets `200` with only `label`: you have `whitelist` but not `forbidNonWhitelisted`. The project's check wants a rejection, not a quiet strip.
- You get `200` even though the body is `{}`: the parameter uses `import type` for `ProbeDto`, or it has no `@Body()`. Change it to a value import of the class.
- `message` is a string, not an array: that is the shape of an exception you threw yourself. It is not the pipe's shape yet. Check that the request actually runs through `ValidationPipe`.
- After you delete the files the request still gets `200`: `start:dev` is still holding the old controller. Restart, and check that `AppModule` no longer lists `ProbeController`.

**Pass this step, then continue.** The folder `src/dev/` must not be in the project.

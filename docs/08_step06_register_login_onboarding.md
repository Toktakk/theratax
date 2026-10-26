# Step 6 — Register, login, onboarding

Guide: [Project plan](02_project_plans.md). Previous: [Step 5 — Tax calculator](07_step05_tax_calculator.md). Next: [Step 7 — Expense categories](09_step07_expense_categories.md).

## Why this step comes first

The feed, expense categories, receipts, and the tax summary must know which user they belong to. The token is that evidence. `onboardedAt` is the gate for whether they have chosen a vehicle method yet. Without those two, you cannot check `GET /expense-categories` or transactions, because both require `Authorization`.

This is the first set of product endpoints. The paths in this step are only these four.

| Method | Path | Status when it succeeds | Auth |
| --- | --- | --- | --- |
| POST | `/auth/register` | 201 | none |
| POST | `/auth/login` | 200 | none |
| GET | `/users/me` | 200 | Bearer |
| PATCH | `/users/me/onboarding` | 200 | Bearer |

`GET /` still answers `Hello World!`. The guard must not close that path.

## Not in this step

Do not write transactions, expense categories, invoices, receipts, or `GET /tax/summary`. Do not build React pages.

## Concept

The token is a random 32-byte string, encoded as `base64url`, stored in the `Session` table with `expiresAt` seven days later. It is not a JWT. The client does not decode a payload. Every request that must be logged in sends

```text
Authorization: Bearer <accessToken>
```

The guard splits the word `Bearer` from the token with a single space. If the header is missing, the shape is not `Bearer`, the token is empty, the token is not in the table, or it has expired, respond `401` with this body.

```json
{ "message": "Unauthorized", "error": "Unauthorized", "statusCode": 401 }
```

That message is a different matter from a failed login. A login whose email or password does not match also returns `401`, but the message is locked to

```json
{ "message": "Invalid email or password", "error": "Unauthorized", "statusCode": 401 }
```

Do not say whether the email or the password was wrong.

A password is 8 to 72 characters. Character 73 onward is bcrypt's input ceiling. If you let bcrypt truncate it, the user will believe the whole long password was stored. The DTO therefore rejects before the hash. Use a cost of 10 rounds. `passwordHash` lives only in the database. The response has no password field.

The email must be an email. The name is 1 to 200 characters. A duplicate email returns `409`.

```json
{ "message": "Email already registered", "error": "Conflict", "statusCode": 409 }
```

Register and login return the same shape.

```ts
interface AuthResponse {
  accessToken: string;
  user: User;
}
```

```ts
interface User {
  id: number;
  email: string;
  name: string;
  practiceType: 'mobile' | 'fixedLocation' | 'mixed' | null;
  expenseMethod: 'flat_rate' | 'actual_cost' | null;
  onboardedAt: string | null;
}
```

`onboardedAt` must always be present as a key, even when the value is still `null`. The web page reads `GET /users/me` when the app opens, then uses this field to decide whether to force onboarding or enter the feed. If you omit the key, that gate is ambiguous.

Nest gives `POST` status 201 on its own, so register does not need `@HttpCode`. Login must be 200, as the contract says. Put `@HttpCode(HttpStatus.OK)` on it.

Onboarding can be done once. The body is

```ts
interface OnboardingRequest {
  practiceType: 'mobile' | 'fixedLocation' | 'mixed';
  expenseMethod: 'flat_rate' | 'actual_cost';
}
```

On success you get a `User` with both fields set, and `onboardedAt` as ISO 8601. The user is a sole trader. There is no legal-form field. `practiceType` does not change which categories the server accepts. A therapist in a clinic can still log mileage.

`expenseMethod` applies to vehicle costs only. Once simplified mileage has been used for that car, the method stays for as long as the car stays in the business, following the GOV.UK simplified expenses page. A second `PATCH` therefore returns `409`. It does not overwrite quietly.

```json
{ "message": "Onboarding already completed", "error": "Conflict", "statusCode": 409 }
```

The way to close the door on two requests at once is `updateMany` with the condition `onboardedAt: null`. If `count` is 0, it was already done, or the user is gone. Then read the row and decide 409 or 401. A read followed by a write as two separate commands leaves a gap where both can pass.

The guard sits on the whole `UsersController` class. Do not use a global guard, because `POST /auth/register` and `POST /auth/login` must be callable with no token. `AuthModule` must `exports` both `AuthService` and `AuthGuard` from this step on. From [step 7](09_step07_expense_categories.md) onward, other modules import this module to use the same guard.

`CurrentUser` reads `request.user`, which the guard just set. If it is missing, throw `UnauthorizedException`. The decorator's parameter must declare the type `PublicUser`.

A unique violation on email (`P2002`) must become `ConflictException('Email already registered')`. It must not leak as a 500. The Prisma 7 error class name lives in the generated file. If the name does not match the example, open `src/generated/prisma/client.ts` and use the name that file actually exports.

## Files for this step

- `src/auth/public-user.ts`
- `src/auth/dto/register.dto.ts`
- `src/auth/dto/login.dto.ts`
- `src/auth/dto/onboarding.dto.ts`
- `src/auth/auth.service.ts`
- `src/auth/auth.guard.ts`
- `src/auth/current-user.decorator.ts`
- `src/auth/auth.controller.ts`
- `src/auth/users.controller.ts`
- `src/auth/auth.module.ts`
- `src/app.module.ts` adds `AuthModule` to `imports`

`src/auth/public-user.ts`

```ts
export interface PublicUser {
  id: number;
  email: string;
  name: string;
  practiceType: 'mobile' | 'fixedLocation' | 'mixed' | null;
  expenseMethod: 'flat_rate' | 'actual_cost' | null;
  onboardedAt: string | null;
}

export interface AuthResponse {
  accessToken: string;
  user: PublicUser;
}
```

`src/auth/dto/register.dto.ts`

```ts
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;
}
```

`src/auth/dto/login.dto.ts` has the same `email` and `password`. It has no `name`.

`src/auth/dto/onboarding.dto.ts`

```ts
import { IsIn } from 'class-validator';

export class OnboardingDto {
  @IsIn(['mobile', 'fixedLocation', 'mixed'])
  practiceType: 'mobile' | 'fixedLocation' | 'mixed';

  @IsIn(['flat_rate', 'actual_cost'])
  expenseMethod: 'flat_rate' | 'actual_cost';
}
```

`src/auth/auth.service.ts`

```ts
import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import type { LoginDto } from './dto/login.dto.js';
import type { OnboardingDto } from './dto/onboarding.dto.js';
import type { RegisterDto } from './dto/register.dto.js';
import type { AuthResponse, PublicUser } from './public-user.js';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

interface UserRow {
  id: number;
  email: string;
  name: string;
  passwordHash: string;
  practiceType: PublicUser['practiceType'];
  expenseMethod: PublicUser['expenseMethod'];
  onboardedAt: Date | null;
}

function toPublicUser(user: UserRow): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    practiceType: user.practiceType,
    expenseMethod: user.expenseMethod,
    onboardedAt: user.onboardedAt === null ? null : user.onboardedAt.toISOString(),
  };
}

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async register(input: RegisterDto): Promise<AuthResponse> {
    const passwordHash = await bcrypt.hash(input.password, 10);
    try {
      const user = await this.prisma.user.create({
        data: {
          email: input.email,
          name: input.name,
          passwordHash,
        },
      });
      const accessToken = await this.createSession(user.id);
      return { accessToken, user: toPublicUser(user) };
    } catch (error: unknown) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Email already registered');
      }
      throw error;
    }
  }

  async login(input: LoginDto): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
    });
    const matches =
      user !== null && (await bcrypt.compare(input.password, user.passwordHash));
    if (user === null || !matches) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const accessToken = await this.createSession(user.id);
    return { accessToken, user: toPublicUser(user) };
  }

  async userForToken(token: string): Promise<PublicUser | null> {
    const session = await this.prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });
    if (session === null || session.expiresAt.getTime() <= Date.now()) {
      return null;
    }
    return toPublicUser(session.user);
  }

  async completeOnboarding(userId: number, input: OnboardingDto): Promise<PublicUser> {
    const updated = await this.prisma.user.updateMany({
      where: { id: userId, onboardedAt: null },
      data: {
        practiceType: input.practiceType,
        expenseMethod: input.expenseMethod,
        onboardedAt: new Date(),
      },
    });
    if (updated.count === 0) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user === null) {
        throw new UnauthorizedException();
      }
      throw new ConflictException('Onboarding already completed');
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user === null) {
      throw new UnauthorizedException();
    }
    return toPublicUser(user);
  }

  private async createSession(userId: number): Promise<string> {
    const token = randomBytes(32).toString('base64url');
    await this.prisma.session.create({
      data: {
        token,
        userId,
        expiresAt: new Date(Date.now() + SEVEN_DAYS_MS),
      },
    });
    return token;
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}
```

The helper `isUniqueViolation` looks at the code `P2002` without casting the whole error object to a Prisma type. If this repo's types include `Prisma.PrismaClientKnownRequestError` and you can use `instanceof` without `as`, use that instead.

The guard and the decorator

```ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service.js';
import type { PublicUser } from './public-user.js';

export interface AuthenticatedRequest extends Request {
  user?: PublicUser;
}

function readBearer(header: string | undefined): string | null {
  if (header === undefined) {
    return null;
  }
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || token === undefined || token.length === 0) {
    return null;
  }
  return token;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;
    const token = readBearer(typeof header === 'string' ? header : undefined);
    if (token === null) {
      throw new UnauthorizedException();
    }
    const user = await this.authService.userForToken(token);
    if (user === null) {
      throw new UnauthorizedException();
    }
    request.user = user;
    return true;
  }
}
```

```ts
import { createParamDecorator, UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest } from './auth.guard.js';
import type { PublicUser } from './public-user.js';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): PublicUser => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (request.user === undefined) {
      throw new UnauthorizedException();
    }
    return request.user;
  },
);
```

`auth.controller.ts` receives `RegisterDto` and `LoginDto` as real imports, not `import type`. The `login` method has `@HttpCode(HttpStatus.OK)`.

`users.controller.ts`

```ts
import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from './auth.guard.js';
import { AuthService } from './auth.service.js';
import { CurrentUser } from './current-user.decorator.js';
import { OnboardingDto } from './dto/onboarding.dto.js';
import type { PublicUser } from './public-user.js';

@Controller('users')
@UseGuards(AuthGuard)
export class UsersController {
  constructor(private readonly authService: AuthService) {}

  @Get('me')
  me(@CurrentUser() user: PublicUser): PublicUser {
    return user;
  }

  @Patch('me/onboarding')
  onboard(
    @CurrentUser() user: PublicUser,
    @Body() body: OnboardingDto,
  ): Promise<PublicUser> {
    return this.authService.completeOnboarding(user.id, body);
  }
}
```

`auth.module.ts` registers both controllers, provides both `AuthService` and `AuthGuard`, then `exports: [AuthService, AuthGuard]`. `AppModule` puts `AuthModule` in `imports` next to `PrismaModule`.

## Commands you run

Restart `start:dev`. Use an email that has never been registered. If you run it again and get 409, change the email, or use the login request instead of the register request.

Register. On the Tests tab, store the token in `token`.

```text
POST {{baseUrl}}/auth/register
```

```json
{"email":"ada@example.com","password":"correct-horse","name":"Ada Lovelace"}
```

```js
pm.environment.set('token', pm.response.json().accessToken);
```

Login. Use the same Tests script, so `token` is the latest token.

```text
POST {{baseUrl}}/auth/login
```

```json
{"email":"ada@example.com","password":"correct-horse"}
```

Then Ada's requests use Bearer `{{token}}`.

```text
GET {{baseUrl}}/users/me
```

```text
PATCH {{baseUrl}}/users/me/onboarding
```

```json
{"practiceType":"mobile","expenseMethod":"flat_rate"}
```

Send the same PATCH body again, still with Bearer `{{token}}`.

Send the same PATCH body again, but turn Authorization off.

Login with the wrong password. Turn Authorization off.

```text
POST {{baseUrl}}/auth/login
```

```json
{"email":"ada@example.com","password":"wrong-password"}
```

Register the same email again.

```text
POST {{baseUrl}}/auth/register
```

```json
{"email":"ada@example.com","password":"correct-horse","name":"Ada Lovelace"}
```

A short password and a strange field.

```text
POST {{baseUrl}}/auth/register
```

```json
{"email":"ada@example.com","password":"short","extra":true}
```

## What you must see

Register gets `201`. It has `accessToken` as a string, and `user.onboardedAt` is `null`. The keys `practiceType` and `expenseMethod` are present and `null`. There is no `password` or `passwordHash`.

Login gets `200` and a new token. `GET /users/me` with Bearer returns the same user.

The first onboarding gets `200`. Both fields match what was sent, and `onboardedAt` is an ISO 8601 time string. The second gets `409` with the message `Onboarding already completed`.

An onboarding request with no Bearer gets `401` with the message `Unauthorized`. That is the result of a request that has not sent a token.

A wrong password gets `401` with the message `Invalid email or password`. A duplicate email gets `409` with the message `Email already registered`.

A password shorter than 8 characters, together with the field `extra`, gets `400`, and `message` is an array, because that is the pipe's job from [step 4](06_step04_enable_validation_pipe.md), not a single-string message.

## If it fails

- Onboarding gets `401` even though you think you sent a token: check that Authorization is Bearer Token, the value is `{{token}}`, and `token` in the environment is not empty.
- Login returns `201`: you forgot `@HttpCode(HttpStatus.OK)`. Nest's default for POST is 201.
- `onboardedAt` disappears before onboarding: `toPublicUser` must include this key even when the value is `null`. Omitting the key and the value `null` are not the same in JSON.
- The response contains `passwordHash`: you are returning the whole Prisma row. Pass it through `toPublicUser` before sending.
- A duplicate email returns 500: the unique exception is not yet caught as `ConflictException`.
- `GET /` becomes 401: the guard was applied globally. It belongs only on `UsersController`.
- The field `extra` on register returns 201: the pipe from [step 4](06_step04_enable_validation_pipe.md) was not installed, or the DTO was imported with `import type` in the controller.

**Pass this step, then continue.** Keep Ada's `token` variable for [step 8](10_step08_log_income_and_expenses.md). She has onboarded as `flat_rate`.

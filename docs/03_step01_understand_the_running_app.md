# Step 1 — Understand the running app

Guide: [Project plan](02_project_plans.md). Next: [Step 2 — Open the database](04_step02_open_the_database.md).

## Why this step comes first

If you have not seen `Hello World!` and you go on to start the database or write a new route, you have no evidence that Nest is listening on port 3000. Later failures mix "the app is not up" with "the new route is wrong".

## Not in this step

Do not run Docker. Do not create Prisma files. Do not add `ValidationPipe`. Do not add any route other than `GET /`.

## Concept

Nest splits one request into three pieces that walk in a straight line.

1. `main.ts` creates the app from the root module, then makes the process listen on a port.
2. `AppModule` says which controller exists and which service can be injected.
3. `AppController` receives `GET /` and calls `AppService`, which returns the string `Hello World!`.

`AppModule` is the list of parts. `AppController` is the HTTP door. `AppService` is where the work sits. The work is only returning a string, so it looks short, but this is the shape every later domain repeats.

The import is written `./app.module.js` even though the real file is named `app.module.ts`. TypeScript compiles `.ts` to `.js`, and Node loads the `.js`. The compiler does not rewrite the string inside `import` for you. If you write `./app.module.ts` or drop the extension, the app cannot find the file at runtime.

`await bootstrap()` at the end of the file works because the project is an ES module. You do not wrap it in `void bootstrap()`.

## Files for this step

- [`src/main.ts`](../src/main.ts)
- [`src/app.module.ts`](../src/app.module.ts)
- [`src/app.controller.ts`](../src/app.controller.ts)
- [`src/app.service.ts`](../src/app.service.ts)

If a draft in the repo already wired in `ValidationPipe`, `PrismaModule`, or `AuthModule`, do not delete them in this step. Just do not add a new route, and pass the check below first. [Step 4](06_step04_enable_validation_pipe.md) checks the pipe again.

The starting shape this lesson describes is only this.

```ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
```

```ts
import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

```ts
import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
```

```ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }
}
```

`@Controller()` with no path means this route is at the root. `@Get()` with no path means `GET /`. The return value is a string. Nest sends that string as the response.

## Commands you run

Install once from the project root. If `node_modules` is already there, skip that line.

```bash
npm install
npm run start:dev
```

Open a browser at `http://localhost:3000`, then send the same request from Postman.

```text
GET {{baseUrl}}/
```

There is already a unit test for this controller at `src/app.controller.spec.ts`. It checks the string without opening a port. It does not replace opening the browser.

## What you must see

The browser shows the text `Hello World!`.

Postman gets status `200` and the response contains `Hello World!`. The `start:dev` log has a line that Nest is listening on port 3000.

## If it fails

- Port 3000 is already in use: find the old process and stop it, or set `PORT` and open the URL for that port. The lesson's check is port 3000 when `PORT` is not set in the environment.
- A blank page or connection refused: `start:dev` is not up yet, or it came up and then crashed. Read the last error line before going to [step 2](04_step02_open_the_database.md).
- You get JSON `Cannot GET /`: some other process is listening on port 3000. It is not this app.
- An import fails with `ERR_MODULE_NOT_FOUND`: check that project-file imports end in `.js`.

**Pass this step, then continue.** You can leave `start:dev` running. [Step 2](04_step02_open_the_database.md) can check the database without a restart.

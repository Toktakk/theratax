# TheraTax

TheraTax is a bookkeeping app for a self-employed massage therapist in the UK. It records income and expenses, keeps a receipt file when there is one, bills a spa, clinic, or client from those income rows, and estimates Income Tax and Class 4 National Insurance for the 2026–27 tax year.

Repository: https://github.com/Toktakk/theratax

The figures are for planning. They are not a tax return and they are not advice.

## What you can do

1. Register and sign in. Choose a practice type (mobile, fixed location, or mixed) and a vehicle method (simplified mileage or actual vehicle costs). That choice is once.
2. Save a business address, and correct it later from the profile.
3. Log an income or expense in one request. Massage income can name a saved spa, clinic, or client, a massage type, hours, an additional fee, and a bonus typed on that row. The amount is base plus additional fee plus bonus. The hour rate lives on the workplace or the client.
4. Attach one JPEG, PNG, WebP, or PDF (up to 10 MiB) to a row. The API returns a private link that lasts 15 minutes. An image is shown on the row. A PDF opens from that same link.
5. See the day's massage income once: base, additional fees, and bonuses.
6. Issue an invoice for one day or one month from the income already logged for that recipient. Download a PDF. Mark it paid. Paying it does not create a second income row. Tax counts that income when the invoice is paid.
7. Read an estimated tax summary for 6 April 2026 through 5 April 2027.

Money on the API is an integer number of pence. £20 is `2000`. Civil dates are `DD-MM-YYYY` in `Europe/London`. Clock times are ISO 8601.

## Screens

The client runs at `http://localhost:5173`.

| Path | Screen |
| --- | --- |
| `/` | Sign in. After onboarding, the same path is the feed. |
| `/register` | Create an account. |
| (no path) | Onboarding replaces the app until practice type and vehicle method are saved. |
| `/workplaces` | Spas, clinics, and private clients, with an hour rate. |
| `/invoices` | Preview, issue, pay, and download a PDF. |
| `/tax` | Estimated tax for 2026–27. |
| `/profile` | Account details and the business address. |

<table>
  <tr>
    <td align="center" width="50%">
      <img src="docs/screenshots/loginPage.png" alt="Sign in" width="280"><br>
      <strong>Sign in</strong>
    </td>
    <td align="center" width="50%">
      <img src="docs/screenshots/registerPage.png" alt="Create an account" width="280"><br>
      <strong>Create an account</strong>
    </td>
  </tr>
  <tr>
    <td align="center" width="50%">
      <img src="docs/screenshots/feedPage.png" alt="Feed" width="280"><br>
      <strong>Feed</strong>
    </td>
    <td align="center" width="50%">
      <img src="docs/screenshots/workplacesPage.png" alt="Workplaces" width="280"><br>
      <strong>Workplaces</strong>
    </td>
  </tr>
  <tr>
    <td align="center" width="50%">
      <img src="docs/screenshots/invoicesPage.png" alt="Invoices" width="280"><br>
      <strong>Invoices</strong>
    </td>
    <td align="center" width="50%">
      <img src="docs/screenshots/taxSummaryPage.png" alt="Estimated tax" width="280"><br>
      <strong>Estimated tax</strong>
    </td>
  </tr>
</table>

A signed-in session is a bearer token in `localStorage`, sent as `Authorization: Bearer <token>`. It expires after 7 days.

## Stack

- API: NestJS 12, TypeScript, Node.js 24, ESM (`"type": "module"`)
- Database: PostgreSQL 16 through Prisma 7
- Receipt files: S3-compatible storage (MinIO in Docker)
- PDF: `pdf-lib`
- Client: React 19, React Router 7, Vite

Nest fits a small API that checks every request: validation on the body, a session on the route, and one folder per job. Prisma is the only way the app talks to PostgreSQL, so the tables and the seed of the eight categories can be created again from the migrations. Receipt bytes stay in MinIO, outside the money rows, and the API hands out a link that lasts 15 minutes. The tax, mileage, daily total, and invoice lines are pure functions, so those figures can be tested without HTTP.

A spreadsheet can hold the same rows. This API keeps each therapist's rows on their own account, rejects a date outside the tax year, and leaves the logged income in place when an invoice is paid. Keeping the books only in the browser would drop them with that browser profile. Docker on this machine avoids a paid host for the four-week build. The client calls `http://localhost:3000`, and CORS allows `http://localhost:5173` only, so the hand-in runs where those two processes run.

There is no `/api` prefix. The HTTP contract is [`docs/api-spec.md`](docs/api-spec.md). The user flow is [`docs/01_user_flow.md`](docs/01_user_flow.md).

## Prerequisites

- Node.js 24
- Docker, for Postgres and MinIO

## Run it locally

From the repository root:

```bash
docker compose up -d
npm install
npm install --prefix client
```

Create `.env` in the repository root. Do not commit it.

```text
DATABASE_URL=postgresql://theratax:theratax@localhost:5432/theratax_dev
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=theratax
S3_SECRET_KEY=theratax-secret
S3_BUCKET=receipts
```

Those database and MinIO passwords match `docker-compose.yml`. They are for this machine only.

Apply the schema and generate the Prisma client. The generated client is not in git.

```bash
npx prisma migrate dev
npx prisma generate
```

Start the API (port 3000) and the client (port 5173) in two terminals:

```bash
npm run start:dev
```

```bash
npm run dev --prefix client
```

`GET http://localhost:3000/` returns the text `Hello World!`. That is the process check. Product routes are listed in the API spec. The browser allows the client origin `http://localhost:5173` only.

On startup the API seeds the eight expense categories and creates the receipts bucket if it is missing. Categories are fixed. The browser suggests one from the note. There is no hint endpoint.

MinIO's console is `http://localhost:9001` (user `theratax`, password `theratax-secret`).

## Tests

```bash
npm test                 # API unit tests
npm run test:client      # client tests
npm run test:e2e         # HTTP tests
```

End-to-end tests talk to a real Postgres database named `theratax_test` and refuse to reset any other database. Create it once, then migrate it. MinIO must be running, because the app opens the receipt store on startup.

```bash
docker compose exec postgres psql -U theratax -d theratax_dev -c 'CREATE DATABASE theratax_test'
DATABASE_URL=postgresql://theratax:theratax@localhost:5432/theratax_test npx prisma migrate deploy
```

`npm run test:e2e` sets `DATABASE_URL` to that test database for the test process. Your `.env` still points the app you run by hand at `theratax_dev`.

These ten cases are the hand-in record. Automated rows were run on 27 October 2026 and passed. The install row is the README sequence on a machine that already has Node.js 24 and Docker.

| Group | Input | Expected | Actual |
| --- | --- | --- | --- |
| Normal use | Register and log in as `ada@example.com` | `200`/`201`, and the body has no `passwordHash` | Passed in `test/auth.e2e-spec.ts` |
| Normal use | Swedish massage income, then an expense on the same day | Income is priced from the hour rate and listed before the expense | Passed in `test/transactions.e2e-spec.ts` |
| Normal use | Preview and issue a day invoice of `6700` pence, then mark it paid | PDF path stays available, no second income row, a second bill for that period is `400` | Passed in `test/invoices.e2e-spec.ts` |
| Normal use | Tax summary before and after that invoice is paid | Logged income is ignored until paid, then `6700` is added once | Passed in `test/tax-summary.e2e-spec.ts` |
| Important rule | Complete onboarding, then send it again, then change the address | The second onboarding is `409`. The address still updates | Passed in `test/auth.e2e-spec.ts` |
| Important rule | Upload a PDF whose bytes start with `%PDF-` and contain `%%EOF`, then a `.txt` file | The PDF is stored as `application/pdf`. The text file is `400` | Passed in `src/upload/store-receipt.spec.ts` |
| Bad input | Massage fields on an expense, and Other with no custom name | `400` with the field message | Passed in `test/transactions.e2e-spec.ts` |
| Bad input | Workplace with an empty name, an unknown kind, or no address | `400` | Passed in `test/workplaces.e2e-spec.ts` |
| Boundary | Save the same spa name twice, then open that id as another user | The duplicate is `409`. The other user gets `404` | Passed in `test/workplaces.e2e-spec.ts` |
| Install | `docker compose up -d`, install, migrate, generate, start the API and the client | `GET /` is `Hello World!` and the client opens at port 5173 | Follow the commands above on the marker's machine |

## Layout

```text
src/auth/                 register, login, session, onboarding, address
src/expense-categories/   eight seeded categories
src/transactions/         income and expenses, mileage, massage rows
src/upload/               receipt files and 15-minute links
src/invoices/             invoices from income rows, and the PDF
src/tax-engine/           pure tax and mileage maths, and GET /tax/summary
src/workplaces/           spas and clinics
src/clients/              private clients
src/income-summary/       one civil day's massage income
src/prisma/               the only place that constructs the Prisma client
prisma/schema.prisma
client/src/pages/         the screens above
docs/api-spec.md          HTTP contract
```

Handlers load rows and call pure functions for tax, mileage, the daily summary, and invoice lines. Those functions do not talk to the database.

## Tax rules this build uses

The tax year is only 2026–27 (6 April 2026 through 5 April 2027). Any other year is rejected.

- Rates are for England, Wales, and Northern Ireland. Scottish Income Tax is not applied.
- Trading profit is treated as the only income. The personal allowance is £12,570, applied in full.
- Income counts when an invoice is marked paid. Expenses count when they are logged.
- Class 4 National Insurance is included. Class 2 is not added to the estimate.
- Flat-rate vehicle costs use simplified mileage for a car or van: 55p per mile for the first 10,000 business miles in the year, then 25p. Motorcycle rates are not applied.
- The vehicle method cannot be changed after onboarding. Oils, HCPC fees, insurance, laundry, and public transport are an amount the user types under either method.

## Out of scope

VAT, emailing an invoice, recurring invoices, Scottish tax, student loans, other reliefs, motorcycle mileage, user-created categories, and any tax year other than 2026–27.

## User stories

1. A therapist registers and chooses a practice type and a vehicle method once, so later mileage and categories stay consistent.
2. A therapist saves a business address, and corrects it from the profile, so the invoice can show it.
3. A therapist logs one massage, with a workplace or a client, a type, a fee, and a bonus, so the row total is base plus fee plus bonus once.
4. A therapist attaches one JPEG, PNG, WebP, or PDF, so they can open that receipt later from a short-lived link.
5. A therapist bills a saved recipient for a day or a month from those rows, downloads the PDF, and marks it paid, so the work is not recorded a second time.
6. A therapist reads the 2026–27 estimate, so they can plan, knowing the figure is not a tax return.

## Acceptance

- Register, sign in, finish onboarding once, and change the address later.
- One income or expense is one request. A massage total is base plus additional fee plus bonus.
- A receipt is a complete JPEG, PNG, WebP, or PDF up to 10 MiB. Any other file is rejected and the row stays. The link lasts 15 minutes.
- The day's massage total counts base, fees, and bonuses once.
- An invoice is built from income already logged for one recipient and one day or month. Paying it does not add an income row. A second bill for that same recipient and period is rejected.
- The tax summary accepts 2026–27 only. Income counts when the invoice is paid. Expenses count when they are logged.

## AI and sources

Cursor’s coding agent was used to draft, review, and edit parts of the app, the tests, and this README. Generated code was kept where it matched `docs/api-spec.md` and the tests. No `.env` file and no real client records were pasted into a prompt. The author is responsible for the behaviour and for the figures.

Screenshots in `docs/screenshots/` are captures of this app. The tax and mileage rules are the ones in the section above, implemented in `src/tax-engine/`. Invoice PDFs are built with `pdf-lib`. The screens and styles live in `client/src/`. The files under `docs/` that are numbered as steps are the build notes for this project.

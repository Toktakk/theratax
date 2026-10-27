# TheraTax

TheraTax is a bookkeeping app for a self-employed massage therapist in the UK. It records income and expenses, keeps a photo of a receipt when there is one, bills a spa, clinic, or client from those income rows, and estimates Income Tax and Class 4 National Insurance for the 2026–27 tax year.

The figures are for planning. They are not a tax return and they are not advice.

## What you can do

1. Register and sign in. Choose a practice type (mobile, fixed location, or mixed) and a vehicle method (simplified mileage or actual vehicle costs). That choice is once.
2. Save a business address, and correct it later from the profile.
3. Log an income or expense in one request. Massage income can name a saved spa, clinic, or client, a massage type, hours, an additional fee, and a bonus typed on that row. The amount is base plus additional fee plus bonus. The hour rate lives on the workplace or the client.
4. Attach one JPEG, PNG, or WebP (up to 10 MiB) to a row. The API returns a private link that lasts 15 minutes.
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

## Layout

```text
src/auth/                 register, login, session, onboarding, address
src/expense-categories/   eight seeded categories
src/transactions/         income and expenses, mileage, massage rows
src/upload/               receipt images and 15-minute links
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

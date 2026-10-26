# Step 2 — Open the database

Guide: [Project plan](02_project_plans.md). Previous: [Step 1 — Understand the running app](03_step01_understand_the_running_app.md). Next: [Step 3 — Add Prisma](05_step03_add_prisma.md).

## Why this step comes first

Prisma in [step 3](05_step03_add_prisma.md) needs a Postgres that is already accepting connections. If there is no server yet, Prisma's error messages mix with schema problems.

## Not in this step

Do not run `prisma migrate`, `prisma generate`, or `prisma db push`. Do not create tables. Do not write endpoints. Port 5432 accepting a connection does not mean the TheraTax tables exist.

## Concept

[`docker-compose.yml`](../docker-compose.yml) starts Postgres 16 for the developer machine. The values in that file are the values for this machine.

| Value | Source |
| --- | --- |
| User | `theratax` |
| Password | `theratax` |
| Database name | `theratax_dev` |
| Port on the machine | `5432` forwarded to `5432` in the container |
| Persistent data | a volume named `pgdata` pointing at `/var/lib/postgresql/data` |

The volume keeps the data when the container stops. This password is only for the local development database. Do not use it as a real server password, and do not commit `.env`.

The connection string the next step will read is

```text
postgresql://theratax:theratax@localhost:5432/theratax_dev
```

That shape is `postgresql://user:password@host:port/database`. The host is `localhost` because the Nest app runs on your machine, while Postgres listens through the port compose publishes.

## Files for this step

Edit only `.env` at the project root. Create it if it is not there. The compose file already exists. Do not edit it in this step.

```text
DATABASE_URL=postgresql://theratax:theratax@localhost:5432/theratax_dev
```

Check that `.gitignore` does not send `.env` to git. If this file shows up in `git status`, stop and ignore it before continuing.

## Commands you run

From the project root

```bash
docker compose up -d
docker compose exec postgres pg_isready -U theratax -d theratax_dev
docker compose exec postgres psql -U theratax -d theratax_dev -c 'SELECT 1'
```

Then confirm the [step 1](03_step01_understand_the_running_app.md) app is still answering. Send this from Postman.

```text
GET {{baseUrl}}/
```

## What you must see

`pg_isready` says the database at `/var/run/postgresql:5432` is accepting connections. The message usually contains the words `accepting connections`.

`SELECT 1` returns one row whose value is `1`.

Postman still gets `Hello World!`.

In `psql` there does not have to be a `User` table or any other table yet. Having no tables in this step is the correct result.

## If it fails

- `Cannot connect to the Docker daemon`: open Docker Desktop first, then run `docker compose up -d` again.
- Port 5432 clashes with a Postgres installed on the machine: stop that service. You can still pass the check through `docker compose exec`, because that command goes inside the container and does not travel through the machine's port. The app in [step 3](05_step03_add_prisma.md) also needs the machine's port 5432. If they clash, stop the other Postgres before step 3.
- `pg_isready` says it is not ready yet: wait a few seconds and run it again. The first time compose creates the volume is slower than the next time.
- The password or database name does not match: read `environment` in `docker-compose.yml` and make `.env` match those values.

**Pass this step, then continue.**

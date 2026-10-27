import 'dotenv/config';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

const RESET_SQL =
  'TRUNCATE TABLE "InvoiceLine", "Receipt", "HourExtra", "HourlyBonus", "Transaction", "Invoice", "Session", "Workplace", "Client", "User" RESTART IDENTITY CASCADE';

export function assertTestDatabase(): void {
  const url = process.env.DATABASE_URL;
  if (url === undefined || url.length === 0) {
    throw new Error('DATABASE_URL is not set');
  }
  const database = databaseName(url);
  if (database !== 'theratax_test') {
    throw new Error(
      `Refusing to reset database "${database}". e2e tests only reset theratax_test.`,
    );
  }
}

export async function createTestApp(): Promise<INestApplication<App>> {
  assertTestDatabase();
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleFixture.createNestApplication<INestApplication<App>>();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.init();
  return app;
}

export async function resetDatabase(app: INestApplication<App>): Promise<void> {
  assertTestDatabase();
  const prisma = app.get(PrismaService);
  await prisma.$executeRawUnsafe(RESET_SQL);
}

export async function registerOnboardedUser(
  app: INestApplication<App>,
  email: string,
): Promise<string> {
  const registered = await request(app.getHttpServer())
    .post('/auth/register')
    .send({ email, password: 'password1', name: 'Ada' })
    .expect(201);
  const token = readAccessToken(registered.body);
  await request(app.getHttpServer())
    .patch('/users/me/onboarding')
    .set(bearer(token))
    .send({ practiceType: 'mobile', expenseMethod: 'flat_rate' })
    .expect(200);
  await request(app.getHttpServer())
    .patch('/users/me/address')
    .set(bearer(token))
    .send({
      addressLine1: '1 High Street',
      town: 'London',
      postcode: 'SW1A 1AA',
    })
    .expect(200);
  return token;
}

export function bearer(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}

export function readAccessToken(body: unknown): string {
  if (typeof body !== 'object' || body === null || !('accessToken' in body)) {
    throw new Error('Missing access token');
  }
  const token = body.accessToken;
  if (typeof token !== 'string' || token.length === 0) {
    throw new Error('Missing access token');
  }
  return token;
}

export function readId(body: unknown): number {
  if (typeof body !== 'object' || body === null || !('id' in body) || typeof body.id !== 'number') {
    throw new Error('Missing id');
  }
  return body.id;
}

function databaseName(url: string): string {
  const pathname = new URL(url).pathname.replace(/^\//, '');
  return pathname.split('/')[0] ?? '';
}

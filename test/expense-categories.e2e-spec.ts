import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { bearer, createTestApp, readAccessToken, resetDatabase } from './create-app.js';

describe('expense categories (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(app);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('returns the eight seeded categories before onboarding', async () => {
    const server = app.getHttpServer();
    const registered = await request(server)
      .post('/auth/register')
      .send({ email: 'ada@example.com', password: 'password1', name: 'Ada' })
      .expect(201);
    const token = readAccessToken(registered.body);

    const categories = await request(server)
      .get('/expense-categories')
      .set(bearer(token))
      .expect(200);

    expect(Array.isArray(categories.body)).toBe(true);
    expect(categories.body).toHaveLength(8);
    expect(categories.body[0]).toMatchObject({ slug: 'oils-consumables' });
    expect(categories.body.map((category: { slug: string }) => category.slug)).toContain('mileage');
  });
});

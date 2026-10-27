import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { bearer, createTestApp, readId, registerOnboardedUser, resetDatabase } from './create-app.js';

const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC';

describe('receipts (e2e)', () => {
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

  it('stores a png, returns a link, and deletes it', async () => {
    const server = app.getHttpServer();
    const token = await registerOnboardedUser(app, 'ada@example.com');
    const income = await request(server)
      .post('/transactions')
      .set(bearer(token))
      .send({
        type: 'income',
        occurredOn: '01-05-2026',
        amountPence: 1500,
      })
      .expect(201);
    const id = readId(income.body);

    await request(server)
      .get(`/transactions/${id}/receipt`)
      .set(bearer(token))
      .expect(404);

    const uploaded = await request(server)
      .post(`/transactions/${id}/receipt`)
      .set(bearer(token))
      .attach('file', Buffer.from(PNG_BASE64, 'base64'), 'slip.png')
      .expect(201);
    expect(uploaded.body).toMatchObject({ transactionId: id, contentType: 'image/png' });

    const link = await request(server)
      .get(`/transactions/${id}/receipt`)
      .set(bearer(token))
      .expect(200);
    expect(typeof link.body.url).toBe('string');
    expect(link.body.url.length).toBeGreaterThan(0);

    await request(server).delete(`/transactions/${id}/receipt`).set(bearer(token)).expect(204);
    await request(server).get(`/transactions/${id}/receipt`).set(bearer(token)).expect(404);
  });
});
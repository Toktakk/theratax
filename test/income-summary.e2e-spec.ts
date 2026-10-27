import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { bearer, createTestApp, readId, registerOnboardedUser, resetDatabase } from './create-app.js';

describe('income summary (e2e)', () => {
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

  it('totals base, fee, and bonus once', async () => {
    const server = app.getHttpServer();
    const token = await registerOnboardedUser(app, 'ada@example.com');
    const workplace = await request(server)
      .post('/workplaces')
      .set(bearer(token))
      .send({
        name: 'North Spa',
        kind: 'spa',
        hourRatePence: 2500,
        addressLine1: '4 Spa Lane',
        town: 'Leeds',
        postcode: 'LS1 4AP',
      })
      .expect(201);

    await request(server)
      .post('/transactions')
      .set(bearer(token))
      .send({
        type: 'income',
        occurredOn: '01-05-2026',
        massageType: 'swedish',
        basePence: 6000,
        additionalFeePence: 200,
        bonusPence: 500,
        workplaceId: readId(workplace.body),
      })
      .expect(201);

    const summary = await request(server)
      .get('/income/summary')
      .query({ date: '01-05-2026' })
      .set(bearer(token))
      .expect(200);

    expect(summary.body).toMatchObject({
      date: '01-05-2026',
      basePence: 6000,
      additionalFeePence: 200,
      bonusPence: 500,
      totalPence: 6700,
    });
  });
});

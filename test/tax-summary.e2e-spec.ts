import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { bearer, createTestApp, readId, registerOnboardedUser, resetDatabase } from './create-app.js';

async function spaId(app: INestApplication<App>, token: string): Promise<number> {
  const created = await request(app.getHttpServer())
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
  return readId(created.body);
}

describe('tax summary (e2e)', () => {
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

  it('ignores logged income until the invoice is paid, then adds 6700 once', async () => {
    const server = app.getHttpServer();
    const token = await registerOnboardedUser(app, 'ada@example.com');
    const workplaceId = await spaId(app, token);
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
        workplaceId,
      })
      .expect(201);

    const before = await request(server)
      .get('/tax/summary')
      .query({ taxYear: 2026 })
      .set(bearer(token))
      .expect(200);
    expect(before.body.incomePence).toBe(0);

    const invoice = await request(server)
      .post('/invoices')
      .set(bearer(token))
      .send({
        recipientKind: 'spa',
        workplaceId,
        period: 'day',
        date: '01-05-2026',
        issuedOn: '01-05-2026',
      })
      .expect(201);
    const issued = await request(server)
      .get('/tax/summary')
      .query({ taxYear: 2026 })
      .set(bearer(token))
      .expect(200);
    expect(issued.body.incomePence).toBe(0);

    await request(server)
      .patch(`/invoices/${readId(invoice.body)}`)
      .set(bearer(token))
      .send({ status: 'paid', paidOn: '02-05-2026' })
      .expect(200);

    const after = await request(server)
      .get('/tax/summary')
      .query({ taxYear: 2026 })
      .set(bearer(token))
      .expect(200);
    expect(after.body.incomePence).toBe(6700);
  });

  it('matches the £20,000 tax figures for a paid invoice', async () => {
    const server = app.getHttpServer();
    const token = await registerOnboardedUser(app, 'ada@example.com');
    const workplaceId = await spaId(app, token);
    await request(server)
      .post('/transactions')
      .set(bearer(token))
      .send({
        type: 'income',
        occurredOn: '01-05-2026',
        massageType: 'swedish',
        basePence: 2_000_000,
        workplaceId,
      })
      .expect(201);
    const invoice = await request(server)
      .post('/invoices')
      .set(bearer(token))
      .send({
        recipientKind: 'spa',
        workplaceId,
        period: 'day',
        date: '01-05-2026',
        issuedOn: '01-05-2026',
      })
      .expect(201);
    await request(server)
      .patch(`/invoices/${readId(invoice.body)}`)
      .set(bearer(token))
      .send({ status: 'paid', paidOn: '02-05-2026' })
      .expect(200);

    const summary = await request(server)
      .get('/tax/summary')
      .query({ taxYear: 2026 })
      .set(bearer(token))
      .expect(200);

    expect(summary.body).toMatchObject({
      taxYear: '2026-27',
      incomePence: 2_000_000,
      allowableExpensesPence: 0,
      incomeTaxPence: 148_600,
      class4NationalInsurancePence: 44_580,
      estimatedTaxOwedPence: 193_180,
    });
  });
});

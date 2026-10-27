import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { bearer, createTestApp, readId, registerOnboardedUser, resetDatabase } from './create-app.js';

describe('transactions (e2e)', () => {
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

  it('prices Swedish income at 1200 and lists income before an expense on the same day', async () => {
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

    const income = await request(server)
      .post('/transactions')
      .set(bearer(token))
      .send({
        type: 'income',
        occurredOn: '01-05-2026',
        massageType: 'swedish',
        basePence: 1000,
        additionalFeePence: 200,
        workplaceId: readId(workplace.body),
      })
      .expect(201);
    expect(income.body.amountPence).toBe(1200);

    await request(server)
      .post('/transactions')
      .set(bearer(token))
      .send({
        type: 'expense',
        occurredOn: '01-05-2026',
        amountPence: 250,
        categorySlug: 'other',
      })
      .expect(201);

    const list = await request(server).get('/transactions').set(bearer(token)).expect(200);
    expect(list.body.items.map((item: { type: string }) => item.type)).toEqual(['income', 'expense']);
  });

  it('rejects massage fields on an expense and a custom type that was omitted', async () => {
    const server = app.getHttpServer();
    const token = await registerOnboardedUser(app, 'ada@example.com');

    const massageOnExpense = await request(server)
      .post('/transactions')
      .set(bearer(token))
      .send({
        type: 'expense',
        amountPence: 250,
        categorySlug: 'other',
        massageType: 'swedish',
      })
      .expect(400);
    expect(massageOnExpense.body.message).toBe('Massage type is only valid on income');

    const other = await request(server)
      .post('/transactions')
      .set(bearer(token))
      .send({
        type: 'income',
        massageType: 'other',
        basePence: 1000,
      })
      .expect(400);
    expect(other.body.message).toBe('Custom massage type is required');

    const negativeFee = await request(server)
      .post('/transactions')
      .set(bearer(token))
      .send({
        type: 'income',
        massageType: 'swedish',
        basePence: 1000,
        additionalFeePence: -1,
      })
      .expect(400);
    expect(Array.isArray(negativeFee.body.message)).toBe(true);
  });

  it('keeps the invoiced line amount after the source base changes', async () => {
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
    const workplaceId = readId(workplace.body);
    const income = await request(server)
      .post('/transactions')
      .set(bearer(token))
      .send({
        type: 'income',
        occurredOn: '01-05-2026',
        massageType: 'swedish',
        basePence: 1000,
        additionalFeePence: 200,
        workplaceId,
      })
      .expect(201);
    const created = await request(server)
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
      .patch(`/transactions/${readId(income.body)}`)
      .set(bearer(token))
      .send({ basePence: 3000, amountPence: 3200 })
      .expect(200);
    const invoice = await request(server)
      .get(`/invoices/${readId(created.body)}`)
      .set(bearer(token))
      .expect(200);
    expect(invoice.body.lines[0]).toMatchObject({ kind: 'service', amountPence: 1000 });
    expect(invoice.body.amountPence).toBe(1200);
  });
});

import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { bearer, createTestApp, readId, registerOnboardedUser, resetDatabase } from './create-app.js';

async function saveSpa(app: INestApplication<App>, token: string): Promise<number> {
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

describe('invoices (e2e)', () => {
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

  it('previews and issues 6700, pays without new income, and refuses a second bill', async () => {
    const server = app.getHttpServer();
    const token = await registerOnboardedUser(app, 'ada@example.com');
    const workplaceId = await saveSpa(app, token);
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
    await request(server)
      .post('/transactions')
      .set(bearer(token))
      .send({
        type: 'income',
        occurredOn: '01-06-2026',
        massageType: 'swedish',
        basePence: 1000,
        workplaceId,
      })
      .expect(201);

    const preview = await request(server)
      .get('/invoices/preview')
      .query({ recipientKind: 'spa', workplaceId, period: 'day', date: '01-05-2026' })
      .set(bearer(token))
      .expect(200);
    expect(preview.body.amountPence).toBe(6700);
    expect(preview.body.lines.map((line: { kind: string }) => line.kind)).toEqual([
      'service',
      'additional_fee',
      'bonus',
    ]);
    expect(preview.body.lines.filter((line: { kind: string }) => line.kind === 'bonus')).toHaveLength(1);

    const month = await request(server)
      .get('/invoices/preview')
      .query({ recipientKind: 'spa', workplaceId, period: 'month', month: 5, year: 2026 })
      .set(bearer(token))
      .expect(200);
    expect(month.body.amountPence).toBe(6700);

    const before = await request(server)
      .get('/transactions')
      .query({ type: 'income' })
      .set(bearer(token))
      .expect(200);
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
    const invoiceId = readId(created.body);
    expect(created.body).toMatchObject({ amountPence: 6700, status: 'issued' });

    const afterCreate = await request(server)
      .get('/transactions')
      .query({ type: 'income' })
      .set(bearer(token))
      .expect(200);
    expect(afterCreate.body.total).toBe(before.body.total);

    const paid = await request(server)
      .patch(`/invoices/${invoiceId}`)
      .set(bearer(token))
      .send({ status: 'paid', paidOn: '02-05-2026' })
      .expect(200);
    expect(paid.body.paidOn).toBe('02-05-2026');

    const afterPay = await request(server)
      .get('/transactions')
      .query({ type: 'income' })
      .set(bearer(token))
      .expect(200);
    expect(afterPay.body.total).toBe(before.body.total);
    expect(
      afterPay.body.items.some(
        (item: { note?: string }) => item.note === created.body.number,
      ),
    ).toBe(false);

    const duplicate = await request(server)
      .post('/invoices')
      .set(bearer(token))
      .send({
        recipientKind: 'spa',
        workplaceId,
        period: 'day',
        date: '01-05-2026',
        issuedOn: '01-05-2026',
      })
      .expect(400);
    expect(duplicate.body.message).toBe('No records to invoice for this recipient and period');

    const pdf = await request(server)
      .get(`/invoices/${invoiceId}/pdf`)
      .set(bearer(token))
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer | string) => {
          chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
        });
        res.on('end', () => {
          callback(null, Buffer.concat(chunks));
        });
      })
      .expect(200)
      .expect('Content-Type', /application\/pdf/);
    expect(Buffer.isBuffer(pdf.body)).toBe(true);
    expect(pdf.body.subarray(0, 4).toString('utf8')).toBe('%PDF');
  });

  it('does not include a spa day on a clinic preview, and bills a client bonus once', async () => {
    const server = app.getHttpServer();
    const token = await registerOnboardedUser(app, 'ada@example.com');
    const workplaceId = await saveSpa(app, token);
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

    const clinic = await request(server)
      .post('/workplaces')
      .set(bearer(token))
      .send({
        name: 'City Clinic',
        kind: 'clinic',
        hourRatePence: 2500,
        addressLine1: '1 Clinic Road',
        town: 'Manchester',
        postcode: 'M1 1AE',
      })
      .expect(201);
    const clinicPreview = await request(server)
      .get('/invoices/preview')
      .query({
        recipientKind: 'clinic',
        workplaceId: readId(clinic.body),
        period: 'day',
        date: '01-05-2026',
      })
      .set(bearer(token))
      .expect(200);
    expect(clinicPreview.body).toMatchObject({ lines: [], amountPence: 0 });

    const client = await request(server)
      .post('/clients')
      .set(bearer(token))
      .send({
        name: 'Ada Client',
        hourRatePence: 2500,
        addressLine1: '12 High Street',
        town: 'London',
        postcode: 'SW1A 1AA',
      })
      .expect(201);
    await request(server)
      .post('/transactions')
      .set(bearer(token))
      .send({
        type: 'income',
        occurredOn: '03-05-2026',
        massageType: 'swedish',
        basePence: 1000,
        bonusPence: 500,
        clientId: readId(client.body),
      })
      .expect(201);
    const clientPreview = await request(server)
      .get('/invoices/preview')
      .query({
        recipientKind: 'client',
        clientId: readId(client.body),
        period: 'day',
        date: '03-05-2026',
      })
      .set(bearer(token))
      .expect(200);
    expect(clientPreview.body.lines.map((line: { description: string }) => line.description)).toEqual([
      'Swedish',
      'Bonus',
    ]);
  });
});

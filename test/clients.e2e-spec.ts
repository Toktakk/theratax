import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { bearer, createTestApp, readAccessToken, readId, registerOnboardedUser, resetDatabase } from './create-app.js';

const adaClient = {
  name: 'Ada Client',
  hourRatePence: 2500,
  addressLine1: '12 High Street',
  town: 'London',
  postcode: 'SW1A 1AA',
};

describe('clients (e2e)', () => {
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

  it('saves a client, rejects the same name, and hides the id from another user', async () => {
    const server = app.getHttpServer();
    const token = await registerOnboardedUser(app, 'ada@example.com');
    const created = await request(server).post('/clients').set(bearer(token)).send(adaClient).expect(201);
    const id = readId(created.body);
    expect(created.body).toMatchObject({ name: 'Ada Client', hourRatePence: 2500, postcode: 'SW1A 1AA' });

    await request(server)
      .post('/clients')
      .set(bearer(token))
      .send({ ...adaClient, name: 'ada client' })
      .expect(409)
      .expect((response) => {
        expect(response.body.message).toBe('Client already saved');
      });

    const other = await request(server)
      .post('/auth/register')
      .send({ email: 'bea@example.com', password: 'password1', name: 'Bea' })
      .expect(201);
    const otherToken = readAccessToken(other.body);
    await request(server)
      .patch('/users/me/onboarding')
      .set(bearer(otherToken))
      .send({ practiceType: 'fixedLocation', expenseMethod: 'actual_cost' })
      .expect(200);

    await request(server).get(`/clients/${id}`).set(bearer(otherToken)).expect(404);
  });

  it('rejects a body with no hour rate or address', async () => {
    const server = app.getHttpServer();
    const token = await registerOnboardedUser(app, 'ada@example.com');
    const missing = await request(server)
      .post('/clients')
      .set(bearer(token))
      .send({ name: 'Ada Client' })
      .expect(400);
    expect(Array.isArray(missing.body.message)).toBe(true);
  });
});

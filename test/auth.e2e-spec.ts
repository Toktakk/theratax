import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { bearer, createTestApp, readAccessToken, resetDatabase } from './create-app.js';

describe('auth (e2e)', () => {
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

  it('registers and logs in without returning the password hash', async () => {
    const server = app.getHttpServer();
    const registered = await request(server)
      .post('/auth/register')
      .send({ email: 'ada@example.com', password: 'password1', name: 'Ada' })
      .expect(201);
    const token = readAccessToken(registered.body);
    expect(registered.body).toMatchObject({ user: { email: 'ada@example.com' } });
    expect(registered.body.user).not.toHaveProperty('passwordHash');

    const loggedIn = await request(server)
      .post('/auth/login')
      .send({ email: 'ada@example.com', password: 'password1' })
      .expect(200);
    expect(readAccessToken(loggedIn.body).length).toBeGreaterThan(0);
    expect(loggedIn.body.user).not.toHaveProperty('passwordHash');

    await request(server).get('/users/me').expect(401);
    await request(server).get('/users/me').set(bearer(token)).expect(200);
  });

  it('completes onboarding once and allows a later address change', async () => {
    const server = app.getHttpServer();
    const registered = await request(server)
      .post('/auth/register')
      .send({ email: 'ada@example.com', password: 'password1', name: 'Ada' })
      .expect(201);
    const token = readAccessToken(registered.body);
    const profile = { practiceType: 'mobile', expenseMethod: 'flat_rate' };

    await request(server).patch('/users/me/onboarding').set(bearer(token)).send(profile).expect(200);
    await request(server).patch('/users/me/onboarding').set(bearer(token)).send(profile).expect(409);

    const address = {
      addressLine1: '4 Spa Lane',
      town: 'Leeds',
      postcode: 'ls14ap',
    };
    const first = await request(server)
      .patch('/users/me/address')
      .set(bearer(token))
      .send(address)
      .expect(200);
    const second = await request(server)
      .patch('/users/me/address')
      .set(bearer(token))
      .send({ ...address, addressLine1: '5 Spa Lane' })
      .expect(200);

    expect(first.body.postcode).toBe('LS1 4AP');
    expect(second.body.addressLine1).toBe('5 Spa Lane');
    expect(second.body.postcode).toBe('LS1 4AP');
  });
});

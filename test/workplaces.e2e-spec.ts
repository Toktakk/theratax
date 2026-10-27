import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { bearer, createTestApp, readAccessToken, readId, registerOnboardedUser, resetDatabase } from './create-app.js';

const northSpa = {
  name: 'North Spa',
  kind: 'spa',
  hourRatePence: 2500,
  addressLine1: '4 Spa Lane',
  town: 'Leeds',
  postcode: 'LS1 4AP',
  hourExtras: [
    { massageType: 'pregnancy', extraPence: 200 },
    { massageType: 'request', extraPence: 200 },
    { massageType: 'body_scrub', extraPence: 500 },
  ],
};

describe('workplaces (e2e)', () => {
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

  it('saves a spa, rejects a duplicate name, and hides it from another user', async () => {
    const server = app.getHttpServer();
    const token = await registerOnboardedUser(app, 'ada@example.com');
    const created = await request(server).post('/workplaces').set(bearer(token)).send(northSpa).expect(201);
    const id = readId(created.body);

    expect(created.body).toMatchObject({
      name: 'North Spa',
      kind: 'spa',
      hourRatePence: 2500,
      postcode: 'LS1 4AP',
    });
    expect(created.body.hourExtras).toEqual([
      { massageType: 'pregnancy', extraPence: 200 },
      { massageType: 'body_scrub', extraPence: 500 },
      { massageType: 'request', extraPence: 200 },
    ]);

    await request(server)
      .post('/workplaces')
      .set(bearer(token))
      .send({ ...northSpa, name: 'north spa' })
      .expect(409)
      .expect((response) => {
        expect(response.body.message).toBe('Workplace already saved');
      });

    const clinic = await request(server)
      .post('/workplaces')
      .set(bearer(token))
      .send({
        name: 'North Spa',
        kind: 'clinic',
        hourRatePence: 2500,
        addressLine1: '1 Clinic Road',
        town: 'Manchester',
        postcode: 'M1 1AE',
      })
      .expect(201);
    expect(clinic.body.hourExtras).toEqual([]);

    const renamed = await request(server)
      .patch(`/workplaces/${id}`)
      .set(bearer(token))
      .send({
        name: 'South Spa',
        hourRatePence: 2500,
        addressLine1: '4 Spa Lane',
        town: 'Leeds',
        postcode: 'LS1 4AP',
        hourExtras: northSpa.hourExtras,
      })
      .expect(200);
    expect(renamed.body.name).toBe('South Spa');

    const other = await request(server)
      .post('/auth/register')
      .send({ email: 'bea@example.com', password: 'password1', name: 'Bea' })
      .expect(201);
    const otherToken = readAccessToken(other.body);
    await request(server)
      .patch('/users/me/onboarding')
      .set(bearer(otherToken))
      .send({ practiceType: 'mobile', expenseMethod: 'flat_rate' })
      .expect(200);
    const hidden = await request(server).get('/workplaces').set(bearer(otherToken)).expect(200);
    const ids = hidden.body.items.map((item: { id: number }) => item.id);
    expect(ids).not.toContain(id);
    expect(ids).not.toContain(readId(clinic.body));
  });

  it('rejects an empty name, an unknown kind, and a missing address', async () => {
    const server = app.getHttpServer();
    const token = await registerOnboardedUser(app, 'ada@example.com');

    const emptyName = await request(server)
      .post('/workplaces')
      .set(bearer(token))
      .send({ ...northSpa, name: '' })
      .expect(400);
    expect(Array.isArray(emptyName.body.message)).toBe(true);

    const hotel = await request(server)
      .post('/workplaces')
      .set(bearer(token))
      .send({ ...northSpa, kind: 'hotel' })
      .expect(400);
    expect(Array.isArray(hotel.body.message)).toBe(true);

    const noAddress = await request(server)
      .post('/workplaces')
      .set(bearer(token))
      .send({ name: 'North Spa', kind: 'spa', hourRatePence: 2500 })
      .expect(400);
    expect(Array.isArray(noAddress.body.message)).toBe(true);
  });
});

import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { createTestApp } from './create-app.js';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  it('/ (GET)', async () => {
    await request(app.getHttpServer()).get('/').expect(200).expect('Hello World!');
  });

  afterAll(async () => {
    await app?.close();
  });
});

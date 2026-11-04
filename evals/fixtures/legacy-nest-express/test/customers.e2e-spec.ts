import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { seedTwoCompanies, tokenFor } from './support/seed';

describe('GET /api/v1/customers', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
    await seedTwoCompanies();
  });

  afterAll(() => app.close());

  it('returns only the caller’s customers', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/customers')
      .set('Authorization', `Bearer ${await tokenFor('alice')}`)
      .expect(200);
    expect(res.body.items.every((c: { name: string }) => c.name.startsWith('Alice'))).toBe(true);
  });
});

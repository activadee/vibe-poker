import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { RoomsModule } from './rooms.module';

describe('RoomsController (e2e-lite)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [RoomsModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /rooms returns human-readable id', async () => {
    const res = await request(app.getHttpServer())
      .post('/rooms')
      .send({ hostName: 'Alice' })
      .expect(201);

    expect(res.body.id).toMatch(/^[A-HJ-NP-Z]{4}-\d{4}$/);
    expect(typeof res.body.expiresAt).toBe('number');
  });

  it('400 when hostName missing', async () => {
    await request(app.getHttpServer()).post('/rooms').send({}).expect(400);
  });
});

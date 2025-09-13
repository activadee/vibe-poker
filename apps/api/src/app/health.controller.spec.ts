import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './app.module';

describe('HealthController', () => {
  it('GET /healthz returns ok:true', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const app = moduleRef.createNestApplication();
    await app.init();

    await request(app.getHttpServer())
      .get('/healthz')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual({ ok: true });
      });

    await app.close();
  });
});


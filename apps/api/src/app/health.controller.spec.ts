import { Test } from '@nestjs/testing';
import { AppModule } from './app.module';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('returns ok:true (unit)', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const controller = moduleRef.get(HealthController);
    expect(controller.get()).toEqual({ ok: true });
  });
});

import { Test } from '@nestjs/testing';
import { RoomsGateway } from './rooms.gateway';
import { RoomsService } from './rooms.service';
import { PerfService } from '../perf/perf.service';
import { LoggingService } from '../logging/logging.service';

describe('RoomsGateway CORS', () => {
  it('afterInit applies CORS allowlist from env', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [RoomsGateway, RoomsService, PerfService, LoggingService],
    }).compile();

    const gateway = moduleRef.get(RoomsGateway);
    const fakeServer: any = { opts: {}, engine: { opts: {}, use: () => undefined } };
    const prev = process.env.CORS_ALLOWLIST;
    process.env.CORS_ALLOWLIST = 'https://ok.local';
    try {
      gateway.afterInit(fakeServer as any);
    } finally {
      process.env.CORS_ALLOWLIST = prev;
    }
    expect(fakeServer.opts.cors).toBeDefined();
    expect(typeof fakeServer.opts.cors.origin).toBe('function');
  });
});

import { Test } from '@nestjs/testing';
import { LoggingService } from './logging.service';

describe('LoggingService', () => {
  it('includes correlation_id and latency_ms in event payloads', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [LoggingService],
    }).compile();

    const svc = moduleRef.get(LoggingService);

    const logs: any[] = [];
    svc._setTestSink((o: any) => logs.push(o));

    svc.event('room_create', { room_id: 'R1' }, { correlationId: 'CID-123', latencyMs: 12.34 });

    expect(logs.length).toBe(1);
    const e = logs[0];
    expect(e.event).toBe('room_create');
    expect(e.room_id).toBe('R1');
    expect(e.correlation_id).toBe('CID-123');
    expect(e.latency_ms).toBe(12.34);
  });

  it('redacts secret-like fields', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [LoggingService],
    }).compile();

    const svc = moduleRef.get(LoggingService);
    const logs: any[] = [];
    svc._setTestSink((o: any) => logs.push(o));

    svc.event('test', { token: 'abcd', nested: { password: 'secret' } }, { correlationId: 'c' });

    const e = logs[0];
    expect(e.token).toBe('[REDACTED]');
    expect(e.nested.password).toBe('[REDACTED]');
  });
});

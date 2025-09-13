import { Test } from '@nestjs/testing';
import { PerfService } from './perf.service';
import { LoggingService } from '../logging/logging.service';

describe('PerfService', () => {
  let perf: PerfService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [PerfService, LoggingService],
    }).compile();
    perf = moduleRef.get(PerfService);
  });

  it('records counters and gauges', () => {
    perf.inc('sockets.connected', 1);
    perf.inc('sockets.connected', 2);
    perf.gauge('custom.gauge', 42);
    const snap = perf.snapshot();
    expect(snap.counters['sockets.connected']).toBe(3);
    expect(snap.counters['custom.gauge']).toBe(42);
  });

  it('start/stop captures timings with quantiles present', () => {
    const stop1 = perf.start('op.test');
    stop1();
    const stop2 = perf.start('op.test');
    stop2();
    const snap = perf.snapshot();
    const stats = snap.timings['op.test'];
    expect(stats).toBeDefined();
    expect(stats.count).toBeGreaterThanOrEqual(2);
    expect(stats.avg).toBeGreaterThanOrEqual(0);
    expect(stats.p50).toBeGreaterThanOrEqual(0);
    expect(stats.p95).toBeGreaterThanOrEqual(0);
    expect(stats.min).toBeGreaterThanOrEqual(0);
    expect(stats.max).toBeGreaterThanOrEqual(stats.min);
  });

  it('withTimer wraps sync and async functions and records once per call', async () => {
    const before = perf.snapshot().timings['wrap.sync']?.count ?? 0;
    const res1 = perf.withTimer('wrap.sync', () => 7);
    expect(res1).toBe(7);
    await perf.withTimer('wrap.async', async () => 11);
    const snap = perf.snapshot();
    expect((snap.timings['wrap.sync']?.count ?? 0)).toBe(before + 1);
    expect((snap.timings['wrap.async']?.count ?? 0)).toBeGreaterThanOrEqual(1);
  });
});

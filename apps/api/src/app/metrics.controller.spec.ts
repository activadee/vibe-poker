import { Test } from '@nestjs/testing';
import { MetricsController } from './metrics.controller';
import { PerfService } from './perf/perf.service';
import { LoggingService } from './logging/logging.service';
import { RoomsService } from './rooms/rooms.service';

describe('MetricsController', () => {
  let controller: MetricsController;
  let perf: PerfService;
  let rooms: { allIds: jest.Mock; get: jest.Mock };

  beforeEach(async () => {
    rooms = {
      allIds: jest.fn(),
      get: jest.fn(),
    } as any;

    const moduleRef = await Test.createTestingModule({
      controllers: [MetricsController],
      providers: [PerfService, LoggingService, { provide: RoomsService, useValue: rooms }],
    }).compile();

    controller = moduleRef.get(MetricsController);
    perf = moduleRef.get(PerfService);
  });

  it('returns counters, timing quantiles, and room stats', async () => {
    // Seed some perf data
    perf.inc('sockets.connected', 5);
    const stop = perf.start('ws_handler.vote_reveal');
    stop();

    // Seed rooms
    rooms.allIds.mockReturnValue(['A', 'B']);
    rooms.get.mockImplementation((id: string) => ({ id, createdAt: Date.now(), expiresAt: Date.now() + 1, participants: id === 'A' ? [{ id: '1', name: 'X', role: 'player' }] : [{ id: '2', name: 'Y', role: 'player' }, { id: '3', name: 'Z', role: 'observer' }] }));

    const json = controller.get();
    // Counters
    expect(json.counters['sockets.connected']).toBe(5);
    // Timings present with quantiles
    expect(json.timings['ws_handler.vote_reveal']).toBeDefined();
    expect(json.timings['ws_handler.vote_reveal'].p95).toBeGreaterThanOrEqual(0);
    // Room stats aggregated
    expect(json.rooms.total).toBe(2);
    expect(json.rooms.max_participants).toBe(2);
    expect(json.rooms.total_participants).toBe(3);
  });
});

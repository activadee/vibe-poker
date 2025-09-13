/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test } from '@nestjs/testing';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';
import { PerfService } from '../perf/perf.service';
import { LoggingService } from '../logging/logging.service';

describe('RoomsController logging', () => {
  let controller: RoomsController;
  let logging: { event: jest.Mock };
  let rooms: { create: jest.Mock };

  beforeEach(async () => {
    logging = { event: jest.fn() } as any;
    rooms = { create: jest.fn() } as any;

    const moduleRef = await Test.createTestingModule({
      controllers: [RoomsController],
      providers: [
        PerfService,
        { provide: RoomsService, useValue: rooms },
        { provide: LoggingService, useValue: logging },
      ],
    }).compile();

    controller = moduleRef.get(RoomsController);
  });

  it('logs room_create with correlation and latency', () => {
    rooms.create.mockReturnValue({ id: 'ROOM1', createdAt: Date.now(), expiresAt: Date.now() + 1, participants: [] });
    const req: any = { headers: { 'x-correlation-id': 'CID-HTTP-1' }, session: {} };

    const res = controller.create({ hostName: 'Alice' } as any, req);
    expect(res.id).toBe('ROOM1');
    expect(logging.event).toHaveBeenCalled();
    const call = logging.event.mock.calls.find((c) => c[0] === 'room_create');
    expect(call).toBeDefined();
    expect(call[1]).toEqual(expect.objectContaining({ room_id: 'ROOM1' }));
    expect(call[2]).toEqual(expect.objectContaining({ correlationId: 'CID-HTTP-1' }));
    expect(call[2].latencyMs).toBeGreaterThanOrEqual(0);
  });
});


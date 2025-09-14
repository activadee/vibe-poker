import { Test } from '@nestjs/testing';
import { TtlSweeperService } from './ttl-sweeper.service';
import { RoomsService } from './rooms.service';

describe('TtlSweeperService (FR-015)', () => {
  let sweeper: TtlSweeperService;
  let rooms: { removeExpired: jest.Mock; allIds: jest.Mock };

  beforeEach(async () => {
    jest.useFakeTimers();
    rooms = {
      removeExpired: jest.fn().mockResolvedValue(0),
      allIds: jest.fn().mockResolvedValue([]),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        TtlSweeperService,
        { provide: RoomsService, useValue: rooms },
      ],
    }).compile();
    sweeper = moduleRef.get(TtlSweeperService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('sets up interval on init and calls removeExpired periodically', () => {
    sweeper.onModuleInit();
    // Fast-forward 3 minutes worth of ticks
    jest.advanceTimersByTime(60_000);
    jest.advanceTimersByTime(60_000);
    jest.advanceTimersByTime(60_000);
    expect(rooms.removeExpired).toHaveBeenCalledTimes(3);
  });

  it('clears interval on destroy', () => {
    const clearSpy = jest.spyOn(global, 'clearInterval');
    sweeper.onModuleInit();
    sweeper.onModuleDestroy();
    expect(clearSpy).toHaveBeenCalled();
  });
});

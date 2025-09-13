import { Controller, Get } from '@nestjs/common';
import { PerfService } from './perf/perf.service';
import { RoomsService } from './rooms/rooms.service';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly perf: PerfService, private readonly rooms: RoomsService) {}

  @Get()
  get() {
    const snapshot = this.perf.snapshot();
    // Include lightweight room stats helpful during load tests
    const roomIds = this.rooms.allIds();
    const participantCounts = roomIds.map((id) => this.rooms.get(id)?.participants.length ?? 0);
    const rooms = {
      total: roomIds.length,
      max_participants: participantCounts.length ? Math.max(...participantCounts) : 0,
      total_participants: participantCounts.reduce((a, b) => a + b, 0),
    };
    return { ...snapshot, rooms };
  }
}


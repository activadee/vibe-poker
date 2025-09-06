import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { RoomsService } from './rooms.service';

@Injectable()
export class TtlSweeperService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TtlSweeperService.name);
  private timer?: NodeJS.Timeout;

  constructor(private readonly rooms: RoomsService) {}

  onModuleInit() {
    // Sweep once a minute
    this.timer = setInterval(() => {
      try {
        const removed = this.rooms.removeExpired();
        if (removed > 0) {
          const remaining = this.rooms.allIds().length;
          this.logger.log(
            JSON.stringify({ event: 'ttl_sweep', removed, remaining })
          );
        }
      } catch (e) {
        this.logger.error('TTL sweep error', e instanceof Error ? e.stack : undefined);
      }
    }, 60_000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
}

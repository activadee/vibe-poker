import { Injectable } from '@nestjs/common';
import pino, { Logger as PinoLogger } from 'pino';
import { AsyncLocalStorage } from 'node:async_hooks';
import { redactSecrets } from '../security/redact';

type Fields = Record<string, unknown>;

@Injectable()
export class LoggingService {
  private logger: PinoLogger;
  private als = new AsyncLocalStorage<{ correlationId: string }>();
  private testSink?: (obj: Record<string, unknown>) => void;

  constructor() {
    this.logger = pino({
      level: process.env.LOG_LEVEL ?? 'info',
      base: undefined,
    });
  }

  // For unit tests only
  _setTestSink(sink: (o: Record<string, unknown>) => void) {
    this.testSink = sink;
  }

  runWithCorrelation<T>(correlationId: string, fn: () => T): T {
    return this.als.run({ correlationId }, fn);
  }

  getCorrelationId(): string | undefined {
    return this.als.getStore()?.correlationId;
  }

  event(event: string, fields: Fields = {}, opts?: { correlationId?: string; latencyMs?: number }) {
    const cid = opts?.correlationId ?? this.getCorrelationId();
    const payload: Fields = { ...fields, event };
    if (cid) payload.correlation_id = cid;
    if (typeof opts?.latencyMs === 'number') payload.latency_ms = opts.latencyMs;
    const redacted = redactSecrets(payload);
    if (this.testSink) {
      this.testSink(redacted);
    } else {
      this.logger.info(redacted);
    }
  }
}

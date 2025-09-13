import { Injectable, Logger } from '@nestjs/common';

type TimingMeta = Record<string, unknown> | undefined;

@Injectable()
export class PerfService {
  private readonly logger = new Logger(PerfService.name);
  private readonly counters = new Map<string, number>();
  private readonly timings = new Map<string, number[]>();
  private readonly maxSamples = 1000; // cap memory

  start(name: string) {
    const start = process.hrtime.bigint();
    return (meta?: TimingMeta) => {
      const end = process.hrtime.bigint();
      const ms = Number(end - start) / 1_000_000; // ns -> ms
      this.recordTiming(name, ms);
      this.logger.log(
        JSON.stringify({ event: 'timing', name, ms: Math.round(ms * 1000) / 1000, ...(meta || {}) })
      );
      return ms;
    };
  }

  withTimer<T>(name: string, fn: () => Promise<T> | T, meta?: TimingMeta): Promise<T> | T {
    const stop = this.start(name);
    try {
      const res = fn();
      if (res instanceof Promise) {
        return res.finally(() => stop(meta));
      }
      stop(meta);
      return res;
    } catch (err) {
      stop({ ...(meta || {}), error: String(err) });
      throw err;
    }
  }

  inc(name: string, delta = 1) {
    const v = this.counters.get(name) ?? 0;
    this.counters.set(name, v + delta);
  }

  gauge(name: string, value: number) {
    this.counters.set(name, value);
  }

  private recordTiming(name: string, ms: number) {
    let arr = this.timings.get(name);
    if (!arr) {
      arr = [];
      this.timings.set(name, arr);
    }
    arr.push(ms);
    if (arr.length > this.maxSamples) {
      // drop oldest to cap memory
      arr.splice(0, arr.length - this.maxSamples);
    }
  }

  private static quantile(values: number[], q: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const pos = (sorted.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    if (sorted[base + 1] !== undefined) {
      return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
    } else {
      return sorted[base];
    }
  }

  snapshot() {
    const timings: Record<string, { count: number; avg: number; p50: number; p95: number; min: number; max: number }>
      = {};
    for (const [name, arr] of this.timings.entries()) {
      const count = arr.length;
      if (count === 0) continue;
      const sum = arr.reduce((a, b) => a + b, 0);
      const avg = sum / count;
      const min = Math.min(...arr);
      const max = Math.max(...arr);
      timings[name] = {
        count,
        avg,
        p50: PerfService.quantile(arr, 0.5),
        p95: PerfService.quantile(arr, 0.95),
        min,
        max,
      };
    }
    const counters: Record<string, number> = {};
    for (const [k, v] of this.counters.entries()) counters[k] = v;
    return { counters, timings };
  }
}


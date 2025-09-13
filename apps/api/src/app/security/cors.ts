import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import type { INestApplication } from '@nestjs/common';
import type { Server as SocketIOServer } from 'socket.io';

// Utility to parse comma-separated allowlist from env
export function parseAllowlist(raw: string | undefined | null): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function isOriginAllowed(origin: string | undefined, allowlist: string[]): boolean {
  if (!allowlist.length) return false;
  if (!origin) return false; // same-origin requests do not need CORS
  if (allowlist.includes('*')) return true;
  try {
    const url = new URL(origin);
    const normalized = `${url.protocol}//${url.host}`; // scheme + host[:port]
    const hostname = url.hostname.toLowerCase();
    return allowlist.some((item) => {
      try {
        const iurl = new URL(item);
        const inorm = `${iurl.protocol}//${iurl.host}`;
        return inorm.toLowerCase() === normalized.toLowerCase();
      } catch {
        // Allow bare hosts (e.g., example.com) as shorthand for https://example.com
        const bare = item.toLowerCase();
        return hostname === bare;
      }
    });
  } catch {
    // Invalid origin header; reject
    return false;
  }
}

export function makeCorsOriginFn(allowlist: string[]): NonNullable<CorsOptions['origin']> {
  return (origin, callback) => {
    if (isOriginAllowed(origin as string | undefined, allowlist)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'), false);
    }
  };
}

export function applyCorsToNest(app: INestApplication, env = process.env): void {
  const allowlist = parseAllowlist(env.CORS_ALLOWLIST);
  if (!allowlist.length) {
    // If not configured, disable CORS (explicit opt-in via env)
    return;
  }
  app.enableCors({
    origin: makeCorsOriginFn(allowlist),
    credentials: true,
  });
}

export function applyCorsToSocket(server: SocketIOServer, env = process.env): void {
  const allowlist = parseAllowlist(env.CORS_ALLOWLIST);
  if (!allowlist.length) return;
  // socket.io server has `.opts` with `cors` options
  const s = server as unknown as { opts?: { cors?: { origin?: unknown; credentials?: boolean } } };
  if (!s.opts) return;
  s.opts.cors = s.opts.cors || {};
  s.opts.cors.origin = makeCorsOriginFn(allowlist) as unknown as (origin: string, cb: (err: Error | null, ok: boolean) => void) => void;
  s.opts.cors.credentials = true;
}


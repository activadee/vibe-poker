import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('example.env (root)', () => {
  const file = join(process.cwd(), 'example.env');

  it('exists and documents required variables', () => {
    const raw = readFileSync(file, 'utf8');
    // sanity
    expect(raw.length).toBeGreaterThan(20);
    // must include comments for guidance
    expect(raw).toMatch(/#\s*Rooms backend/i);
    expect(raw).toMatch(/#\s*Redis connection URL/i);
    // must contain the keys with sensible defaults
    expect(raw).toMatch(/^ROOMS_BACKEND=memory/m);
    expect(raw).toMatch(/^REDIS_URL=redis:\/\/localhost:6379/m);
    // optional: example CORS allowlist
    expect(raw).toMatch(/^CORS_ALLOWLIST=/m);
  });
});


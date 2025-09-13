import * as fs from 'node:fs';
import * as path from 'node:path';

describe('en.json locale integrity', () => {
  const localePath = path.resolve(__dirname, '../../../public/i18n/en.json');

  it('exists and parses as valid JSON', () => {
    expect(fs.existsSync(localePath)).toBe(true);
    const raw = fs.readFileSync(localePath, 'utf8');
    expect(() => JSON.parse(raw)).not.toThrow();
  });

  it('contains no placeholder values and no top-level dotted keys', () => {
    const raw = fs.readFileSync(localePath, 'utf8');
    const data: Record<string, unknown> = JSON.parse(raw);

    // No top-level dotted keys like "lobby.title"
    const dottedKeys = Object.keys(data).filter((k) => k.includes('.'));
    expect(dottedKeys).toEqual([]);

    // No values starting with "Missing value for '...'
    const placeholderPattern = /^\s*Missing value for\s+'[^']+'\s*$/;
    const offenders: Array<{ key: string; value: unknown }> = [];

    const walk = (obj: unknown, prefix: string[] = []) => {
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
        for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
          walk(v, [...prefix, k]);
        }
      } else if (typeof obj === 'string') {
        if (placeholderPattern.test(obj)) {
          offenders.push({ key: prefix.join('.'), value: obj });
        }
      }
    };

    walk(data);
    expect(offenders).toEqual([]);
  });

  it('includes required Lobby keys with non-empty strings', () => {
    const raw = fs.readFileSync(localePath, 'utf8');
    const data = JSON.parse(raw) as {
      lobby?: {
        title?: string;
        subtitle?: string;
        create?: { title?: string };
        join?: { title?: string };
      };
    };

    expect(typeof data.lobby?.title).toBe('string');
    expect((data.lobby?.title ?? '').length).toBeGreaterThan(0);

    expect(typeof data.lobby?.subtitle).toBe('string');
    expect((data.lobby?.subtitle ?? '').length).toBeGreaterThan(0);

    expect(typeof data.lobby?.create?.title).toBe('string');
    expect((data.lobby?.create?.title ?? '').length).toBeGreaterThan(0);

    expect(typeof data.lobby?.join?.title).toBe('string');
    expect((data.lobby?.join?.title ?? '').length).toBeGreaterThan(0);
  });
});

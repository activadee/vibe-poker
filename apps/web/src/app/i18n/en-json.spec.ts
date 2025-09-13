import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [k: string]: JsonValue };

function readEnJson(): Record<string, JsonValue> {
  const abs = join(process.cwd(), 'apps/web/public/i18n/en.json');
  const raw = readFileSync(abs, 'utf8');
  return JSON.parse(raw) as Record<string, JsonValue>;
}

function flattenStrings(value: JsonValue): string[] {
  const out: string[] = [];
  const visit = (v: JsonValue): void => {
    if (typeof v === 'string') out.push(v);
    else if (Array.isArray(v)) v.forEach(visit);
    else if (v && typeof v === 'object') Object.values(v).forEach(visit);
  };
  visit(value);
  return out;
}

describe('i18n: en.json hygiene', () => {
  it('has no placeholder values ("Missing value for …")', () => {
    const json = readEnJson();
    const strings = flattenStrings(json);
    const offenders = strings.filter((s) => /^\s*Missing value for\s+'/.test(s));
    expect(offenders).toEqual([]);
  });

  it('has no dotted top-level keys (e.g., "lobby.title")', () => {
    const json = readEnJson();
    const dotted = Object.keys(json).filter((k) => k.includes('.'));
    expect(dotted).toEqual([]);
  });

  it('defines required Lobby keys with non-empty strings', () => {
    const json = readEnJson();
    const lobby = json['lobby'] as Record<string, JsonValue> | undefined;
    expect(lobby).toBeTruthy();
    const title = lobby?.['title'];
    const subtitle = lobby?.['subtitle'];
    const create = lobby?.['create'] as Record<string, JsonValue> | undefined;
    const joinSec = lobby?.['join'] as Record<string, JsonValue> | undefined;
    expect(typeof title).toBe('string');
    expect(String(title)).not.toHaveLength(0);
    expect(typeof subtitle).toBe('string');
    expect(String(subtitle)).not.toHaveLength(0);
    expect(create).toBeTruthy();
    expect(typeof create?.['title']).toBe('string');
    expect(String(create?.['title'] as JsonValue)).not.toHaveLength(0);
    expect(joinSec).toBeTruthy();
    expect(typeof joinSec?.['title']).toBe('string');
    expect(String(joinSec?.['title'] as JsonValue)).not.toHaveLength(0);
  });
});


type JsonLike = Record<string, unknown> | unknown[] | string | number | boolean | null | undefined;

const SECRET_KEYS = new Set([
  'secret',
  'password',
  'passwd',
  'token',
  'authorization',
  'cookie',
  'set-cookie',
  'api_key',
  'apikey',
  'apiKey',
  'session',
]);

export function redactSecrets<T extends JsonLike>(value: T): T {
  const seen = new WeakSet<object>();

  const walk = (v: JsonLike): JsonLike => {
    if (v === null || typeof v !== 'object') return v;
    if (seen.has(v as object)) return '[Circular]';
    seen.add(v as object);

    if (Array.isArray(v)) {
      return (v as unknown[]).map((item) => walk(item as JsonLike));
    }

    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      if (SECRET_KEYS.has(k.toLowerCase())) {
        out[k] = '[REDACTED]';
      } else {
        out[k] = walk(val as JsonLike);
      }
    }
    return out;
  };

  return walk(value) as T;
}

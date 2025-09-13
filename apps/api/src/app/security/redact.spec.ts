import { redactSecrets } from './redact';

describe('redactSecrets', () => {
  it('redacts known secret keys recursively', () => {
    const obj = {
      token: 'abc',
      profile: {
        name: 'Alice',
        password: 'p@ss',
        nested: { authorization: 'Bearer x', details: ['ok', { secret: 's' }] },
      },
      Cookie: 'sid=123',
    } as const;
    const out = redactSecrets(obj);
    expect((out as any).token).toBe('[REDACTED]');
    expect((out as any).profile.password).toBe('[REDACTED]');
    expect((out as any).profile.nested.authorization).toBe('[REDACTED]');
    expect((out as any).profile.nested.details[1].secret).toBe('[REDACTED]');
    expect((out as any).Cookie).toBe('[REDACTED]');
  });

  it('handles arrays and circular references', () => {
    const a: any = { list: [] };
    a.self = a;
    a.list.push({ apiKey: 'x' }, a);
    const out = redactSecrets(a) as any;
    expect(out.list[0].apiKey).toBe('[REDACTED]');
    // circular gets string placeholder
    expect(out.list[1]).toBe('[Circular]');
  });
});


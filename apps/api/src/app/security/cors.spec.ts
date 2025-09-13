import { applyCorsToSocket, isOriginAllowed, makeCorsOriginFn, parseAllowlist } from './cors';

describe('CORS utilities', () => {
  it('parseAllowlist returns entries trimmed', () => {
    expect(parseAllowlist(' http://a.com ,https://b.com ')).toEqual([
      'http://a.com',
      'https://b.com',
    ]);
  });

  it('isOriginAllowed matches exact origin host + scheme', () => {
    const list = parseAllowlist('http://a.com, https://b.com:444');
    expect(isOriginAllowed('http://a.com', list)).toBe(true);
    expect(isOriginAllowed('https://a.com', list)).toBe(false);
    expect(isOriginAllowed('https://b.com:444', list)).toBe(true);
    expect(isOriginAllowed('https://b.com', list)).toBe(false);
  });

  it('isOriginAllowed rejects subdomains or look-alike domains for bare hosts', () => {
    const list = parseAllowlist('example.com');
    expect(isOriginAllowed('https://example.com', list)).toBe(true);
    expect(isOriginAllowed('https://example.com:3000', list)).toBe(true);
    expect(isOriginAllowed('https://sub.example.com', list)).toBe(false);
    expect(isOriginAllowed('https://evil-example.com', list)).toBe(false);
  });

  it('origin function allows allowlisted and rejects others', (done) => {
    const fn = makeCorsOriginFn(['https://x.test']) as (o: string, cb: (e: Error | null, ok: boolean) => void) => void;
    fn('https://x.test', (err, ok) => {
      expect(err).toBeNull();
      expect(ok).toBe(true);
      fn('https://y.test', (err2, ok2) => {
        expect(err2).toBeInstanceOf(Error);
        expect(ok2).toBe(false);
        done();
      });
    });
  });

  it('applyCorsToSocket injects origin validator into socket.io opts', (done) => {
    const fakeServer: any = { opts: {}, engine: { opts: {} } };
    const env = { CORS_ALLOWLIST: 'https://ok.io' } as NodeJS.ProcessEnv;
    applyCorsToSocket(fakeServer, env);
    expect(typeof fakeServer.opts.cors.origin).toBe('function');
    const originFn = fakeServer.opts.cors.origin as (o: string, cb: (e: Error | null, ok: boolean) => void) => void;
    originFn('https://ok.io', (err, ok) => {
      expect(err).toBeNull();
      expect(ok).toBe(true);
      originFn('https://nope.io', (err2, ok2) => {
        expect(err2).toBeInstanceOf(Error);
        expect(ok2).toBe(false);
        done();
      });
    });
  });
});

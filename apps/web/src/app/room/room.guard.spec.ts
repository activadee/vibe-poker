import { ActivatedRouteSnapshot, Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { roomGuard } from './room.guard';

describe('roomGuard', () => {
  let createUrlTree: jest.Mock;
  let router: Router;

  beforeEach(() => {
    createUrlTree = jest.fn((args) => ({ __urlTree: true, args }));
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: { createUrlTree } },
      ],
    });
    router = TestBed.inject(Router);
  });

  function makeRoute(roomId: string | null): ActivatedRouteSnapshot {
    return {
      paramMap: {
        get: (k: string) => (k === 'roomId' ? roomId : null),
      },
    } as any;
  }

  it('allows activation when roomId is present', () => {
    const result = TestBed.runInInjectionContext(() => roomGuard(makeRoute('ROOM1') as any, {} as any));
    expect(result).toBe(true);
  });

  it('redirects to lobby when roomId is blank', () => {
    const result = TestBed.runInInjectionContext(() => roomGuard(makeRoute('   ') as any, {} as any));
    expect(createUrlTree).toHaveBeenCalledWith(['/']);
    expect((result as any).__urlTree).toBe(true);
  });
});

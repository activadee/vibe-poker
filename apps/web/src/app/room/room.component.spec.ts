import { TestBed } from '@angular/core/testing';
import { RoomComponent } from './room.component';
import { ActivatedRoute, Router } from '@angular/router';
import { convertToParamMap, ParamMap } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

describe('RoomComponent', () => {
  let navigateByUrlSpy: jest.Mock;
  let paramMap$: BehaviorSubject<ParamMap>;

  beforeEach(() => {
    navigateByUrlSpy = jest.fn();
    paramMap$ = new BehaviorSubject(convertToParamMap({ roomId: 'ROOM1' }));

    TestBed.configureTestingModule({
      imports: [RoomComponent],
      providers: [
        { provide: Router, useValue: { navigateByUrl: navigateByUrlSpy } },
        // Minimal ActivatedRoute stub
        { provide: ActivatedRoute, useValue: { paramMap: paramMap$.asObservable() } },
      ],
    });
  });

  it('leave disconnects socket, clears state and navigates home', () => {
    const fixture = TestBed.createComponent(RoomComponent);
    const comp = fixture.componentInstance as any;

    // Seed joined state and a fake socket to be disconnected
    comp.joined.set(true);
    comp.participants.set([{ id: 's1', name: 'Alice', role: 'player' }]);
    comp.error.set('some error');
    comp.socket = { removeAllListeners: jest.fn(), disconnect: jest.fn() };

    comp.leave();

    expect(comp.socket).toBeUndefined();
    expect(comp.joined()).toBe(false);
    expect(comp.participants()).toEqual([]);
    expect(comp.error()).toBe('');
    expect(navigateByUrlSpy).toHaveBeenCalledWith('/');
  });

  it('updates progress and voted badges on vote:progress', () => {
    const fixture = TestBed.createComponent(RoomComponent);
    const comp = fixture.componentInstance as any;

    // Seed participants
    comp.participants.set([
      { id: 'p1', name: 'Alice', role: 'player' },
      { id: 'p2', name: 'Bob', role: 'player' },
    ]);

    // Fake socket to register listeners
    const handlers: Record<string, (arg?: unknown) => void> = {};
    const fakeSocket = { on: (evt: string, cb: (arg?: unknown) => void) => { handlers[evt] = cb; } } as any;
    // Access private method in test context
    (comp as any).setupSocketListeners(fakeSocket);

    // Emit progress
    handlers['vote:progress']?.({ count: 1, total: 2, votedIds: ['p1'] });

    expect(comp.voteCount()).toBe(1);
    expect(comp.voteTotal()).toBe(2);
    expect(comp.hasVoted({ id: 'p1', name: 'Alice', role: 'player' })).toBe(true);
    expect(comp.hasVoted({ id: 'p2', name: 'Bob', role: 'player' })).toBe(false);

    // After reveal, badges should hide
    comp.revealed.set(true);
    expect(comp.hasVoted({ id: 'p1', name: 'Alice', role: 'player' })).toBe(false);
  });

  it('sets stats when revealed room:state includes stats', () => {
    const fixture = TestBed.createComponent(RoomComponent);
    const comp = fixture.componentInstance as any;

    const handlers: Record<string, (arg?: unknown) => void> = {};
    const fakeSocket = { on: (evt: string, cb: (arg?: unknown) => void) => { handlers[evt] = cb; } } as any;
    (comp as any).setupSocketListeners(fakeSocket);

    const room = {
      id: 'ROOM1',
      createdAt: Date.now(),
      expiresAt: Date.now() + 1000,
      participants: [],
      revealed: true,
      votes: { a: '3', b: '5' },
      stats: { avg: 4.0, median: 4.0 },
    };
    comp.roomId.set('ROOM1');
    handlers['room:state']?.(room as any);
    expect(comp.stats()).toEqual({ avg: 4.0, median: 4.0 });

    // If not revealed, stats should clear
    handlers['room:state']?.({ ...room, revealed: false, stats: undefined } as any);
    expect(comp.stats()).toBeNull();
  });

  it('disables voting and ignores cast when role is observer (FR-013)', () => {
    const fixture = TestBed.createComponent(RoomComponent);
    const comp = fixture.componentInstance as any;

    // Simulate joined state and current user as observer
    comp.joined.set(true);
    comp.socketId.set('o1');
    comp.participants.set([
      { id: 'o1', name: 'Olivia', role: 'observer' },
      { id: 'p1', name: 'Alice', role: 'player' },
    ]);

    // Provide a fake socket to capture emits
    comp.socket = { emit: jest.fn(), removeAllListeners: jest.fn(), disconnect: jest.fn() } as any;

    fixture.detectChanges();

    // UI: vote cards should be disabled and render hint
    const btn = fixture.nativeElement.querySelector('button.card') as HTMLButtonElement;
    expect(btn?.disabled).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Observers cannot vote');

    // Behavior: castVote should early return and not emit
    comp.castVote('5');
    expect((comp.socket.emit as jest.Mock).mock.calls.some((c: any[]) => c[0] === 'vote:cast')).toBe(false);
  });
});

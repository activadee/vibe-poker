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
        { provide: Router, useValue: { navigateByUrl: navigateByUrlSpy, createUrlTree: jest.fn(() => ({})), serializeUrl: jest.fn(() => '/'), events: { subscribe: () => ({ unsubscribe: () => undefined }) } } },
        // Minimal ActivatedRoute stub
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: paramMap$.asObservable(),
            snapshot: { queryParamMap: convertToParamMap({}) },
          },
        },
      ],
    });
  });

  it('deep-link without saved name shows join prompt', () => {
    // Ensure no saved name
    localStorage.removeItem('displayName');
    paramMap$.next(convertToParamMap({ roomId: 'ROOM1' }));

    const fixture = TestBed.createComponent(RoomComponent);
    fixture.detectChanges();

    const joinSection = fixture.nativeElement.querySelector('.join');
    expect(joinSection).toBeTruthy();
    const btn: HTMLButtonElement = joinSection.querySelector('button');
    expect(btn?.textContent).toContain('Join Room');
  });

  it('deep-link with saved name does not auto-join', () => {
    jest.useFakeTimers();
    localStorage.setItem('displayName', 'Eve');
    paramMap$.next(convertToParamMap({ roomId: 'ROOM2' }));

    const fixture = TestBed.createComponent(RoomComponent);
    const comp = fixture.componentInstance as any;
    const joinSpy = jest.spyOn(comp, 'join').mockImplementation(() => undefined);

    // Flush any scheduled tasks
    jest.runOnlyPendingTimers();
    expect(joinSpy).not.toHaveBeenCalled();
    jest.useRealTimers();
  });

  it('shows invalid room error and CTA when room:error received', () => {
    const fixture = TestBed.createComponent(RoomComponent);
    const comp = fixture.componentInstance as any;

    // Register socket listeners on a fake socket
    const handlers: Record<string, (arg?: any) => void> = {};
    const fakeSocket = { on: (evt: string, cb: (arg?: any) => void) => { handlers[evt] = cb; } } as any;
    (comp as any).setupSocketListeners(fakeSocket);

    // Simulate server reporting invalid room
    handlers['room:error']?.({ code: 'invalid_room', message: 'This room does not exist or has expired.' });
    fixture.detectChanges();

    const errorEl: HTMLElement = fixture.nativeElement.querySelector('.error');
    expect(errorEl?.textContent).toContain('This room does not exist or has expired.');
    const cta: HTMLAnchorElement = errorEl.querySelector('a.btn');
    expect(cta?.textContent).toContain('Create a new room');
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

  it('join emits role=observer when checkbox selected', () => {
    const fixture = TestBed.createComponent(RoomComponent);
    const comp = fixture.componentInstance as any;

    comp.roomId.set('ROOM1');
    comp.name = 'Olivia';
    comp.joinAsObserver = true;

    const fakeSocket = { emit: jest.fn(), removeAllListeners: jest.fn(), disconnect: jest.fn() } as any;
    comp.socket = fakeSocket; // So connect() returns this

    comp.join();

    expect(fakeSocket.emit).toHaveBeenCalledWith('room:join', expect.objectContaining({ roomId: 'ROOM1', name: 'Olivia', role: 'observer' }));

  });

  it('seeds story editor models and emits story:set on save', () => {
    const fixture = TestBed.createComponent(RoomComponent);
    const comp = fixture.componentInstance as any;

    const handlers: Record<string, (arg?: unknown) => void> = {};
    const fakeSocket = {
      on: (evt: string, cb: (arg?: unknown) => void) => { handlers[evt] = cb; },
      emit: jest.fn(),
      removeAllListeners: jest.fn(),
      disconnect: jest.fn(),
    } as any;
    // Attach socket and listeners
    (comp as any).socket = fakeSocket;
    (comp as any).setupSocketListeners(fakeSocket);

    // Seed room state with a story
    const room = {
      id: 'ROOM1',
      createdAt: Date.now(),
      expiresAt: Date.now() + 1000,
      participants: [{ id: 'h1', name: 'Host', role: 'host' }],
      story: { id: 'S-1', title: 'Feature A', notes: 'Some notes' },
    };
    comp.roomId.set('ROOM1');
    // Ensure myRole resolves to host
    comp.socketId.set('h1');

    handlers['room:state']?.(room as any);
    expect(comp.story()).toEqual({ id: 'S-1', title: 'Feature A', notes: 'Some notes' });
    expect(comp.storyTitleModel).toBe('Feature A');
    expect(comp.storyNotesModel).toBe('Some notes');

    // Update models and save; should emit story:set
    comp.storyTitleModel = 'Updated Title';
    comp.storyNotesModel = 'New notes';
    comp.saveStory();
    expect(fakeSocket.emit).toHaveBeenCalledWith(
      'story:set',
      expect.objectContaining({ story: expect.objectContaining({ title: 'Updated Title' }) })
    );
  });
});

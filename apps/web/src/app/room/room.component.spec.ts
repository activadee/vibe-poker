import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject, of } from 'rxjs';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { RoomComponent } from './room.component';
import { By } from '@angular/platform-browser';
import { VoteCardsComponent } from '../vote-cards/vote-cards.component';
import { io } from 'socket.io-client';

// Mock socket.io client (factory-scoped to avoid hoist issues)
jest.mock('socket.io-client', () => {
  const emit = jest.fn();
  const on = jest.fn();
  const disconnect = jest.fn();
  const removeAllListeners = jest.fn();
  const socket = {
    id: 'host-sock',
    emit,
    on,
    disconnect,
    removeAllListeners,
  } as any;
  return { io: jest.fn(() => socket) };
});

// Shared stubs/spies for this suite
const navigateByUrlSpy = jest.fn();
const paramMap$ = new BehaviorSubject(convertToParamMap({ roomId: 'R1' }));

describe('RoomComponent (FR-014 Revote)', () => {
  let fixture: ComponentFixture<RoomComponent>;
  let component: RoomComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoomComponent],
      providers: [
        {
          provide: Router,
          useValue: {
            navigateByUrl: navigateByUrlSpy,
            createUrlTree: jest.fn(() => ({})),
            serializeUrl: jest.fn(() => '/'),
            events: { subscribe: () => ({ unsubscribe: () => undefined }) },
          },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: paramMap$.asObservable(),
            snapshot: { queryParamMap: convertToParamMap({}) },
          },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(RoomComponent);
    component = fixture.componentInstance;
    // Default to host context for shared component instance
    (component as any).socketId.set('host-sock');
    component.participants.set([{ id: 'host-sock', name: 'Host', role: 'host' }]);
  });

  it('deep-link without saved name opens join modal', () => {
    // Ensure no saved name
    localStorage.removeItem('displayName');
    paramMap$.next(convertToParamMap({ roomId: 'ROOM1' }));

    const fixture = TestBed.createComponent(RoomComponent);
    fixture.detectChanges();

    const modal = fixture.nativeElement.querySelector('.modal-backdrop');
    expect(modal).toBeTruthy();
    const btn: HTMLButtonElement | null = modal.querySelector('button.btn.primary');
    expect(btn?.textContent).toContain('Join Room');
  });

  it('deep-link with saved name does not auto-join', () => {
    jest.useFakeTimers();
    localStorage.setItem('displayName', 'Eve');
    paramMap$.next(convertToParamMap({ roomId: 'ROOM2' }));

    const fixture = TestBed.createComponent(RoomComponent);
    const comp = fixture.componentInstance as any;
    const joinSpy = jest
      .spyOn(comp, 'join')
      .mockImplementation(() => undefined);

    // Flush any scheduled tasks
    jest.runOnlyPendingTimers();
    expect(joinSpy).not.toHaveBeenCalled();
    jest.useRealTimers();
  });

  it('auto-joins as host when arriving from Create Room (host=1)', () => {
    jest.useFakeTimers();
    // Arrange: simulate saved host name and host flag in query
    localStorage.setItem('displayName', 'Hosty');
    const ar = TestBed.inject(ActivatedRoute) as any;
    ar.snapshot = { queryParamMap: convertToParamMap({ host: '1' }) };

    // Update params to trigger constructor subscription
    paramMap$.next(convertToParamMap({ roomId: 'ROOMX' }));

    const fixture = TestBed.createComponent(RoomComponent);
    const comp = fixture.componentInstance as any;
    const joinSpy = jest.spyOn(comp, 'join').mockImplementation(() => undefined);

    // Detect changes and allow any scheduled timers (setTimeout) to run
    fixture.detectChanges();
    jest.runOnlyPendingTimers();
    jest.useRealTimers();

    expect(joinSpy).toHaveBeenCalled();
  });

  it('does not open join modal when role=player is present', () => {
    localStorage.removeItem('displayName');
    // Inject role=player into route snapshot
    const ar = TestBed.inject(ActivatedRoute) as any;
    ar.snapshot = { queryParamMap: convertToParamMap({ role: 'player' }) };

    paramMap$.next(convertToParamMap({ roomId: 'ROOM3' }));

    const fixture = TestBed.createComponent(RoomComponent);
    fixture.detectChanges();

    const modal = fixture.nativeElement.querySelector('.modal-backdrop');
    expect(modal).toBeFalsy();
  });

  it('does not open join modal when role=observer is present', () => {
    localStorage.removeItem('displayName');
    // Inject role=observer into route snapshot
    const ar = TestBed.inject(ActivatedRoute) as any;
    ar.snapshot = { queryParamMap: convertToParamMap({ role: 'observer' }) };

    paramMap$.next(convertToParamMap({ roomId: 'ROOM4' }));

    const fixture = TestBed.createComponent(RoomComponent);
    fixture.detectChanges();

    const modal = fixture.nativeElement.querySelector('.modal-backdrop');
    expect(modal).toBeFalsy();
  });

  it('shows invalid room error and CTA when room:error received', () => {
    const fixture = TestBed.createComponent(RoomComponent);
    const comp = fixture.componentInstance as any;

    // Register socket listeners on a fake socket
    const handlers: Record<string, (arg?: any) => void> = {};
    const fakeSocket = {
      on: (evt: string, cb: (arg?: any) => void) => {
        handlers[evt] = cb;
      },
    } as any;
    (comp as any).setupSocketListeners(fakeSocket);

    // Simulate server reporting invalid room
    handlers['room:error']?.({
      code: 'invalid_room',
      message: 'This room does not exist or has expired.',
    });
    fixture.detectChanges();

    const errorEl: HTMLElement = fixture.nativeElement.querySelector('.error');
    expect(errorEl?.textContent).toContain(
      'This room does not exist or has expired.'
    );
    const cta: HTMLAnchorElement = errorEl.querySelector('a.btn');
    expect(cta?.textContent).toContain('Create a new room');
  });

  it('leave disconnects socket, clears state and navigates home', () => {
    const fix = TestBed.createComponent(RoomComponent);
    const comp = fix.componentInstance as any;
    // Seed joined state and a fake socket to be disconnected
    comp.joined.set(true);
    comp.participants.set([{ id: 's1', name: 'Alice', role: 'player' }]);
    comp.error.set('some error');
    const removeAllListeners = jest.fn();
    const disconnect = jest.fn();
    comp.socket = { removeAllListeners, disconnect };

    comp.leave();

    expect(removeAllListeners).toHaveBeenCalled();
    expect(disconnect).toHaveBeenCalled();
    expect(comp.joined()).toBe(false);
    expect(comp.participants()).toEqual([]);
    expect(comp.error()).toBe('');
    expect(navigateByUrlSpy).toHaveBeenCalledWith('/');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('shows Reveal before reveal and Revote after reveal for host', () => {
    // Before reveal
    component.joined.set(true);
    component.showJoinModal.set(false);
    component.revealed.set(false);
    fixture.detectChanges();
    const beforeHtml = fixture.nativeElement as HTMLElement;
    expect(
      beforeHtml.querySelector('button.btn.primary')?.textContent?.trim()
    ).toBe('Reveal');

    // After reveal
    component.revealed.set(true);
    fixture.detectChanges();
    const afterHtml = fixture.nativeElement as HTMLElement;
    // Primary CTA should be Revote
    expect(
      afterHtml.querySelector('button.btn.primary')?.textContent?.trim()
    ).toBe('Revote');
    // And Reveal should not be present
    expect(afterHtml.textContent).not.toContain('Reveal');
  });

  it('clicking Revote emits vote:reset without confirm dialog', () => {
    component.joined.set(true);
    component.showJoinModal.set(false);
    component.revealed.set(true);
    fixture.detectChanges();

    const html = fixture.nativeElement as HTMLElement;
    const btn = html.querySelector('button.btn.primary') as HTMLButtonElement;
    expect(btn.textContent?.trim()).toBe('Revote');
    btn.click();

    expect(io as jest.Mock).toHaveBeenCalled();
    // Inspect the last returned socket from io() and its emit calls
    const lastSocket = (io as jest.Mock).mock.results.at(-1)?.value as any;
    expect(lastSocket.emit).toHaveBeenCalledWith('vote:reset', {});
  });

  it('copyLink writes a formatted invite with observer and user URLs', async () => {
    const fixture = TestBed.createComponent(RoomComponent);
    const comp = fixture.componentInstance as any;
    comp.roomId.set('ROOM9');

    // Stub clipboard API
    (global as any).navigator = (global as any).navigator || {};
    (global as any).navigator.clipboard = {
      writeText: jest.fn().mockResolvedValue(undefined),
    };

    await comp.copyLink();

    const calledWith: string = (navigator as any).clipboard.writeText.mock.calls[0][0];
    expect(calledWith).toContain('Join this room:');
    expect(calledWith).toContain('Join as observer: http://localhost/r/ROOM9?role=observer');
    expect(calledWith).toContain('Join as user: http://localhost/r/ROOM9?role=player');
  });

  it('revote clears local card selection highlight', () => {
    // Arrange: simulate a prior selection in VoteCards
    component.joined.set(true);
    component.showJoinModal.set(false);
    fixture.detectChanges();
    const vcDE = fixture.debugElement.query(By.directive(VoteCardsComponent));
    const vc = vcDE.componentInstance as VoteCardsComponent;
    vc.selected.set('5');
    expect(vc.selected()).toBe('5');

    // Act: reveal then revote
    component.revealed.set(true);
    fixture.detectChanges();
    ((html) =>
      (html.querySelector('button.btn.primary') as HTMLButtonElement).click())(
      fixture.nativeElement as HTMLElement
    );

    // Assert: selection cleared locally
    expect(vc.selected()).toBeNull();
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
    comp.socket = {
      emit: jest.fn(),
      removeAllListeners: jest.fn(),
      disconnect: jest.fn(),
    } as any;

    fixture.detectChanges();

    // UI: vote cards should be disabled and render hint
    const btn = fixture.nativeElement.querySelector(
      'button.card'
    ) as HTMLButtonElement;
    expect(btn?.disabled).toBe(true);
    expect(fixture.nativeElement.textContent).toContain(
      'Observers cannot vote'
    );

    // Behavior: castVote should early return and not emit
    comp.castVote('5');
    expect(
      (comp.socket.emit as jest.Mock).mock.calls.some(
        (c: any[]) => c[0] === 'vote:cast'
      )
    ).toBe(false);
  });

  it('join emits role=observer when checkbox selected', () => {
    const fixture = TestBed.createComponent(RoomComponent);
    const comp = fixture.componentInstance as any;

    comp.roomId.set('ROOM1');
    comp.name = 'Olivia';
    comp.joinAsObserver = true;

    const fakeSocket = {
      emit: jest.fn(),
      removeAllListeners: jest.fn(),
      disconnect: jest.fn(),
    } as any;
    comp.socket = fakeSocket; // So connect() returns this

    comp.join();

    expect(fakeSocket.emit).toHaveBeenCalledWith(
      'room:join',
      expect.objectContaining({
        roomId: 'ROOM1',
        name: 'Olivia',
        role: 'observer',
      })
    );
  });

  it('seeds story editor models and emits story:set on save', () => {
    const fixture = TestBed.createComponent(RoomComponent);
    const comp = fixture.componentInstance as any;

    const handlers: Record<string, (arg?: unknown) => void> = {};
    const fakeSocket = {
      on: (evt: string, cb: (arg?: unknown) => void) => {
        handlers[evt] = cb;
      },
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
    expect(comp.story()).toEqual({
      id: 'S-1',
      title: 'Feature A',
      notes: 'Some notes',
    });
    expect(comp.storyTitleModel).toBe('Feature A');
    expect(comp.storyNotesModel).toBe('Some notes');

    // Update models and save; should emit story:set
    comp.storyTitleModel = 'Updated Title';
    comp.storyNotesModel = 'New notes';
    comp.saveStory();
    expect(fakeSocket.emit).toHaveBeenCalledWith(
      'story:set',
      expect.objectContaining({
        story: expect.objectContaining({ title: 'Updated Title' }),
      })
    );
  });
});

describe('RoomComponent (FR-017 Deck presets)', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoomComponent],
      providers: [
        {
          provide: Router,
          useValue: {
            navigateByUrl: jest.fn(),
            createUrlTree: jest.fn(() => ({})),
            serializeUrl: jest.fn(() => '/'),
            events: { subscribe: () => ({ unsubscribe: () => undefined }) },
          },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ roomId: 'R1' })),
            snapshot: { queryParamMap: convertToParamMap({}) },
          },
        },
      ],
    }).compileComponents();
  });

  it('renders deck dropdown for host and emits deck:set', () => {
    const fixture = TestBed.createComponent(RoomComponent);
    const comp = fixture.componentInstance as any;
    // Host context
    comp.joined.set(true);
    comp.socketId.set('h1');
    comp.participants.set([{ id: 'h1', name: 'Host', role: 'host' }]);
    const fakeSocket = {
      emit: jest.fn(),
      on: jest.fn(),
      removeAllListeners: jest.fn(),
      disconnect: jest.fn(),
    } as any;
    comp.socket = fakeSocket;

    fixture.detectChanges();

    const select: HTMLSelectElement | null = fixture.nativeElement.querySelector(
      '.deck-select select'
    );
    expect(select).toBeTruthy();

    // Call component method (simpler than wiring DOM ngModelChange)
    comp.changeDeck('tshirt');
    expect(fakeSocket.emit).toHaveBeenCalledWith('deck:set', { deckId: 'tshirt' });
  });

  it('updates vote card values when deckId changes from server and clears selection', () => {
    const fixture = TestBed.createComponent(RoomComponent);
    const comp = fixture.componentInstance as any;
    comp.joined.set(true);
    comp.socketId.set('p1');
    comp.participants.set([{ id: 'p1', name: 'Player', role: 'player' }]);

    // Attach fake socket and listeners
    const handlers: Record<string, (arg?: unknown) => void> = {};
    const fakeSocket = {
      on: (evt: string, cb: (arg?: unknown) => void) => {
        handlers[evt] = cb;
      },
      emit: jest.fn(),
      removeAllListeners: jest.fn(),
      disconnect: jest.fn(),
    } as any;
    comp.socket = fakeSocket;
    comp.setupSocketListeners(fakeSocket);

    fixture.detectChanges();

    // Ensure VoteCards is present and has default Fibonacci values
    const vcDE = fixture.debugElement.query(By.directive(VoteCardsComponent));
    const vc = vcDE.componentInstance as VoteCardsComponent;
    expect(vc.values()).toEqual(['1', '2', '3', '5', '8', '13', '21', '?', '☕']);

    // Simulate a selection
    vc.selected.set('5');
    expect(vc.selected()).toBe('5');

    // Server updates deck to T-Shirt sizes
    handlers['room:state']?.({
      id: 'R1',
      createdAt: Date.now(),
      expiresAt: Date.now() + 1000,
      participants: [{ id: 'p1', name: 'Player', role: 'player' }],
      deckId: 'tshirt',
    } as any);

    fixture.detectChanges();

    // Values should switch to T-Shirt preset
    expect(vc.values()).toEqual(['XS', 'S', 'M', 'L', 'XL', '?', '☕']);
    // Local selection should be cleared
    expect(vc.selected()).toBeNull();
  });
});

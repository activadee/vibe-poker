import { TestBed } from '@angular/core/testing';
import { LobbyComponent } from './lobby.component';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';

describe('LobbyComponent', () => {
  let httpMock: HttpTestingController;
  let navigateSpy: jest.Mock;

  beforeEach(() => {
    navigateSpy = jest.fn();
    TestBed.configureTestingModule({
      imports: [LobbyComponent, HttpClientTestingModule],
      providers: [
        { provide: Router, useValue: { navigate: navigateSpy } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('creates a room and navigates to /r/:id', async () => {
    const fixture = TestBed.createComponent(LobbyComponent);
    const comp = fixture.componentInstance;
    comp.name = 'Alice';

    const promise = comp.createRoom();

    const req = httpMock.expectOne('/api/rooms');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ hostName: 'Alice' });
    req.flush({ id: 'ABCD-1234', expiresAt: Date.now() + 86400000 });

    await promise;

    expect(navigateSpy).toHaveBeenCalledWith(['/r', 'ABCD-1234']);
  });

  it('renders headings and buttons with design classes', () => {
    const fixture = TestBed.createComponent(LobbyComponent);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('h1')?.textContent?.trim()).toBe('Planning Poker');
    expect(el.querySelector('#create-title')?.textContent?.trim()).toBe('Create a Room');
    expect(el.querySelector('#join-title')?.textContent?.trim()).toBe('Join a Room');
    // Buttons should have our directive-applied classes
    const buttons = Array.from(el.querySelectorAll('button')) as HTMLButtonElement[];
    expect(buttons.length).toBeGreaterThanOrEqual(2);
    expect(buttons[0].className).toContain('inline-flex');
  });

  it('enables Join when room code present', () => {
    const fixture = TestBed.createComponent(LobbyComponent);
    const comp = fixture.componentInstance;
    fixture.detectChanges();
    const btn: HTMLButtonElement = fixture.nativeElement.querySelector('app-ui-card:nth-of-type(2) button');
    expect(btn.disabled).toBe(true);
    comp.roomCode = 'ABCD-1234';
    fixture.detectChanges();
    expect(btn.disabled).toBe(false);
  });

  it('validates name length for Create (3–30)', () => {
    const fixture = TestBed.createComponent(LobbyComponent);
    const comp = fixture.componentInstance;
    const btn: HTMLButtonElement = fixture.nativeElement.querySelector('app-ui-card:first-of-type button');
    comp.name = 'Al';
    fixture.detectChanges();
    expect(btn.disabled).toBe(true);
    comp.name = 'Alice';
    fixture.detectChanges();
    expect(btn.disabled).toBe(false);
  });

  it('renders the observer checkbox inline with label', () => {
    const fixture = TestBed.createComponent(LobbyComponent);
    fixture.detectChanges();
    const container: HTMLElement | null = fixture.nativeElement.querySelector('app-ui-card:nth-of-type(2) .flex.items-center');
    expect(container).toBeTruthy();
    const checkbox: HTMLInputElement | null = fixture.nativeElement.querySelector('input[type="checkbox"][name="joinAsObserver"]');
    expect(checkbox).toBeTruthy();
    // Ensure checkbox is not full width via class
    expect(checkbox!.className).not.toContain('w-full');
  });

  it('parses link and navigates on join (role=player by default)', () => {
    const fixture = TestBed.createComponent(LobbyComponent);
    const comp = fixture.componentInstance;
    comp.roomCode = 'https://example.com/r/ZZZZ-9999?utm=1';
    comp.joinRoom();
    expect(navigateSpy).toHaveBeenCalledWith(['/r', 'ZZZZ-9999'], { queryParams: { role: 'player' } });
  });

  it('passes role=observer when Join as observer is checked', () => {
    const fixture = TestBed.createComponent(LobbyComponent);
    const comp = fixture.componentInstance as any;
    comp.roomCode = 'ABCD-1234';
    comp.joinAsObserver = true;
    comp.joinRoom();
    expect(navigateSpy).toHaveBeenCalledWith(['/r', 'ABCD-1234'], { queryParams: { role: 'observer' } });
  });

  it('passes role=player when observer is not selected', () => {
    const fixture = TestBed.createComponent(LobbyComponent);
    const comp = fixture.componentInstance as any;
    comp.roomCode = 'ABCD-1234';
    comp.joinAsObserver = false;
    comp.joinRoom();
    expect(navigateSpy).toHaveBeenCalledWith(['/r', 'ABCD-1234'], { queryParams: { role: 'player' } });
  });

  it('shows an error alert when error() is set', () => {
    const fixture = TestBed.createComponent(LobbyComponent);
    const comp = fixture.componentInstance as any;
    comp.error.set('Something went wrong');
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const alert = el.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('Something went wrong');
  });
});

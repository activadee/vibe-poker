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

  it('renders initial state (snapshot)', () => {
    const fixture = TestBed.createComponent(LobbyComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement).toMatchSnapshot();
  });

  it('enables Join when room code present', () => {
    const fixture = TestBed.createComponent(LobbyComponent);
    const comp = fixture.componentInstance;
    fixture.detectChanges();
    const btn: HTMLButtonElement = fixture.nativeElement.querySelector('section:nth-of-type(2) button');
    expect(btn.disabled).toBe(true);
    comp.roomCode = 'ABCD-1234';
    fixture.detectChanges();
    expect(btn.disabled).toBe(false);
  });

  it('validates name length for Create (3–30)', () => {
    const fixture = TestBed.createComponent(LobbyComponent);
    const comp = fixture.componentInstance;
    const btn: HTMLButtonElement = fixture.nativeElement.querySelector('section:first-of-type button');
    comp.name = 'Al';
    fixture.detectChanges();
    expect(btn.disabled).toBe(true);
    comp.name = 'Alice';
    fixture.detectChanges();
    expect(btn.disabled).toBe(false);
  });

  it('parses link and navigates on join', () => {
    const fixture = TestBed.createComponent(LobbyComponent);
    const comp = fixture.componentInstance;
    comp.roomCode = 'https://example.com/r/ZZZZ-9999?utm=1';
    comp.joinRoom();
    expect(navigateSpy).toHaveBeenCalledWith(['/r', 'ZZZZ-9999']);
  });

  it('passes role=observer when Join as observer is checked', () => {
    const fixture = TestBed.createComponent(LobbyComponent);
    const comp = fixture.componentInstance as any;
    comp.roomCode = 'ABCD-1234';
    comp.joinAsObserver = true;
    comp.joinRoom();
    expect(navigateSpy).toHaveBeenCalledWith(['/r', 'ABCD-1234'], { queryParams: { role: 'observer' } });
  });
});

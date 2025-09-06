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
});

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
});

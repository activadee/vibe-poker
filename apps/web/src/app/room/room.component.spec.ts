import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
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
  const socket = { id: 'host-sock', emit, on, disconnect, removeAllListeners } as any;
  return { io: jest.fn(() => socket) };
});

describe('RoomComponent (FR-014 Revote)', () => {
  let fixture: ComponentFixture<RoomComponent>;
  let component: RoomComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoomComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ roomId: 'R1' })) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RoomComponent);
    component = fixture.componentInstance;
    // Make the current user a host by matching socket id and role
    (component as any).socketId.set('host-sock');
    component.participants.set([{ id: 'host-sock', name: 'Host', role: 'host' }]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('shows Reveal before reveal and Revote after reveal for host', () => {
    // Before reveal
    component.joined.set(true);
    component.revealed.set(false);
    fixture.detectChanges();
    const beforeHtml = fixture.nativeElement as HTMLElement;
    expect(beforeHtml.querySelector('button.btn.primary')?.textContent?.trim()).toBe('Reveal');

    // After reveal
    component.revealed.set(true);
    fixture.detectChanges();
    const afterHtml = fixture.nativeElement as HTMLElement;
    // Primary CTA should be Revote
    expect(afterHtml.querySelector('button.btn.primary')?.textContent?.trim()).toBe('Revote');
    // And Reveal should not be present
    expect(afterHtml.textContent).not.toContain('Reveal');
  });

  it('clicking Revote emits vote:reset without confirm dialog', () => {
    component.joined.set(true);
    component.revealed.set(true);
    fixture.detectChanges();

    const html = fixture.nativeElement as HTMLElement;
    const btn = html.querySelector('button.btn.primary') as HTMLButtonElement;
    expect(btn.textContent?.trim()).toBe('Revote');
    btn.click();

    expect((io as jest.Mock)).toHaveBeenCalled();
    // Inspect the last returned socket from io() and its emit calls
    const lastSocket = (io as jest.Mock).mock.results.at(-1)?.value as any;
    expect(lastSocket.emit).toHaveBeenCalledWith('vote:reset', {});
  });

  it('revote clears local card selection highlight', () => {
    // Arrange: simulate a prior selection in VoteCards
    component.joined.set(true);
    fixture.detectChanges();
    const vcDE = fixture.debugElement.query(By.directive(VoteCardsComponent));
    const vc = vcDE.componentInstance as VoteCardsComponent;
    vc.selected.set('5');
    expect(vc.selected()).toBe('5');

    // Act: reveal then revote
    component.revealed.set(true);
    fixture.detectChanges();
    (html => (html.querySelector('button.btn.primary') as HTMLButtonElement).click())(fixture.nativeElement as HTMLElement);
    
    // Assert: selection cleared locally
    expect(vc.selected()).toBeNull();
  });
});

import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UiFocusTrapDirective } from './focus-trap.directive';

@Component({
  standalone: true,
  imports: [UiFocusTrapDirective],
  template: `
    <button id="outside-before">Outside Before</button>
    <div id="modal" appUiFocusTrap>
      <button id="first">First</button>
      <input id="mid" />
      <button id="last">Last</button>
    </div>
    <button id="outside-after">Outside After</button>
  `,
})
class HostComponent {}

describe('UiFocusTrapDirective', () => {
  it('cycles focus within the trapped container on Tab/Shift+Tab', () => {
    const fix = TestBed.configureTestingModule({ imports: [HostComponent] }).createComponent(HostComponent);
    fix.detectChanges();

    const root: HTMLElement = fix.nativeElement;
    const first = root.querySelector('#first') as HTMLButtonElement;
    const last = root.querySelector('#last') as HTMLButtonElement;

    first.focus();
    // Tab from last wraps to first
    last.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
    expect(document.activeElement).toBe(first);

    // Shift+Tab from first wraps to last
    first.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true }));
    expect(document.activeElement).toBe(last);
  });

  it('prevents focus from leaving the trap when tabbing', () => {
    const fix = TestBed.configureTestingModule({ imports: [HostComponent] }).createComponent(HostComponent);
    fix.detectChanges();

    const root: HTMLElement = fix.nativeElement;
    const last = root.querySelector('#last') as HTMLButtonElement;
    const outsideAfter = root.querySelector('#outside-after') as HTMLButtonElement;

    last.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
    expect(document.activeElement).not.toBe(outsideAfter);
  });
});

import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UiInputDirective } from './input.directive';

@Component({
  standalone: true,
  imports: [UiInputDirective],
  template: `
    <label for="name">Name</label>
    <input id="name" appUiInput placeholder="Your name" />
  `,
})
class HostComponent {}

describe('UiInputDirective', () => {
  it('applies base classes and 44px min touch target', () => {
    const fixture = TestBed.configureTestingModule({ imports: [HostComponent] }).createComponent(HostComponent);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(input.className).toContain('rounded-md');
    expect(input.className).toContain('shadow-sm');
    expect((input as HTMLInputElement).style.minHeight).toBe('var(--touch-target, 44px)');
  });
});


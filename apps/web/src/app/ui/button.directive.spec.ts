import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UiButtonDirective } from './button.directive';

@Component({
  standalone: true,
  imports: [UiButtonDirective],
  template: `
    <button appUiButton>Default</button>
    <button appUiButton variant="secondary">SecondaryByVariant</button>
    <button appUiButton="secondary">SecondaryByAttr</button>
    <button appUiButton variant="ghost">Ghost</button>
    <button appUiButton size="sm">Small</button>
    <button appUiButton size="lg">Large</button>
  `,
})
class HostComponent {}

describe('UiButtonDirective', () => {
  it('applies base classes and primary variant by default', () => {
    const fixture = TestBed.configureTestingModule({ imports: [HostComponent] }).createComponent(HostComponent);
    fixture.detectChanges();
    const btns = fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    const def = btns[0];
    expect(def.className).toContain('inline-flex');
    expect(def.className).toContain('bg-primary-900');
    expect(def.className).toContain('text-white');
  });

  it('applies secondary variant when variant input is provided', () => {
    const fixture = TestBed.configureTestingModule({ imports: [HostComponent] }).createComponent(HostComponent);
    fixture.detectChanges();
    const btns = fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    const secondary = btns[1];
    expect(secondary.className).toContain('bg-white');
    expect(secondary.className).toContain('border-slate-200');
  });

  it('applies secondary when provided via appUiButton value (compat)', () => {
    const fixture = TestBed.configureTestingModule({ imports: [HostComponent] }).createComponent(HostComponent);
    fixture.detectChanges();
    const btns = fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    const secondaryCompat = btns[2];
    expect(secondaryCompat.className).toContain('bg-white');
    expect(secondaryCompat.className).toContain('border-slate-200');
  });

  it('applies ghost variant styles', () => {
    const fixture = TestBed.configureTestingModule({ imports: [HostComponent] }).createComponent(HostComponent);
    fixture.detectChanges();
    const btns = fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    const ghost = btns[3];
    expect(ghost.className).toContain('bg-transparent');
    expect(ghost.className).toContain('hover:bg-slate-100');
  });

  it('respects size input sm and lg', () => {
    const fixture = TestBed.configureTestingModule({ imports: [HostComponent] }).createComponent(HostComponent);
    fixture.detectChanges();
    const btns = fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    const sm = btns[4];
    const lg = btns[5];
    expect(sm.className).toContain('h-9');
    expect(sm.className).toContain('px-3');
    expect(lg.className).toContain('h-11');
    expect(lg.className).toContain('px-5');
  });

  it('enforces a minimum 44px touch target via inline style', () => {
    const fixture = TestBed.configureTestingModule({ imports: [HostComponent] }).createComponent(HostComponent);
    fixture.detectChanges();
    const btns = fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    const def = btns[0];
    expect(def.style.minHeight).toBe('var(--touch-target, 44px)');
  });
});

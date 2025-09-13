import { Directive, ElementRef, HostListener, OnDestroy, OnInit, inject } from '@angular/core';

// Lightweight focus trap for modals/dialogs. Traps Tab navigation inside host subtree
// and restores focus to the previously focused element when destroyed.
@Directive({
  selector: '[appUiFocusTrap]',
  standalone: true,
})
export class UiFocusTrapDirective implements OnInit, OnDestroy {
  private previouslyFocused: Element | null = null;

  private readonly host = inject(ElementRef) as ElementRef<HTMLElement>;

  ngOnInit(): void {
    this.previouslyFocused = typeof document !== 'undefined' ? document.activeElement : null;
    // If nothing inside is focused yet, focus the first focusable element.
    const first = this.getFocusable()[0];
    if (first) {
      (first as HTMLElement).focus();
    }
  }

  ngOnDestroy(): void {
    // Restore focus where the user was before opening the trap, if still in DOM
    const el = this.previouslyFocused as HTMLElement | null;
    if (el && typeof el.focus === 'function' && document.contains(el)) {
      el.focus();
    }
  }

  // Capture Tab navigation globally while focus is within the host.
  @HostListener('document:keydown', ['$event'])
  onKeydown(ev: KeyboardEvent) {
    if (ev.key !== 'Tab') return;
    const active = document.activeElement as HTMLElement | null;
    const root = this.host.nativeElement;
    if (!active || !root.contains(active)) return; // Only trap when focus is inside

    const focusables = this.getFocusable();
    if (focusables.length === 0) {
      ev.preventDefault();
      root.focus();
      return;
    }

    const first = focusables[0] as HTMLElement;
    const last = focusables[focusables.length - 1] as HTMLElement;
    const goingBackward = ev.shiftKey;

    if (!goingBackward && active === last) {
      ev.preventDefault();
      first.focus();
    } else if (goingBackward && active === first) {
      ev.preventDefault();
      last.focus();
    }
  }

  private getFocusable(): Element[] {
    const root = this.host.nativeElement;
    const selector = [
      'a[href]','button:not([disabled])','textarea:not([disabled])','input:not([disabled])',
      'select:not([disabled])','[tabindex]:not([tabindex="-1"])'
    ].join(',');
    return Array.from(root.querySelectorAll(selector)).filter((el) => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
  }
}

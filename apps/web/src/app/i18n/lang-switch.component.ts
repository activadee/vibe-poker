import { Component, effect, inject, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';

@Component({
  selector: 'app-lang-switch',
  standalone: true,
  templateUrl: './lang-switch.component.html',
  styleUrl: './lang-switch.component.css',
})
export class LangSwitchComponent {
  private readonly transloco = inject(TranslocoService);
  readonly langs: readonly string[] =
    (this.transloco.getAvailableLangs() as string[]) ?? ['en'];
  readonly active = signal<string>(this.transloco.getActiveLang());

  constructor() {
    effect(() => {
      this.transloco.langChanges$.subscribe((l) => this.active.set(l));
    });
  }

  onChange(ev: Event) {
    const sel = ev.target as HTMLSelectElement;
    const v = sel.value || 'en';
    this.transloco.setActiveLang(v);
  }
}

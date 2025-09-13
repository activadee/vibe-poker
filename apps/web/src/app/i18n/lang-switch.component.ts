import { Component, effect, inject, signal } from '@angular/core';
import { NgFor } from '@angular/common';
import { TranslocoService } from '@jsverse/transloco';

@Component({
  selector: 'app-lang-switch',
  standalone: true,
  imports: [NgFor],
  template: `
    <div class="lang-switch" aria-label="Language switcher">
      <label for="langSelect" class="sr-only">Language</label>
      <select id="langSelect" class="lang-select" [value]="active()" (change)="onChange($event)">
        <option *ngFor="let l of langs" [value]="l">{{ l }}</option>
      </select>
    </div>
  `,
  styles: [
    `.lang-switch{position:fixed;top:.75rem;right:.75rem;z-index:50}`,
    `.lang-select{border:1px solid #e2e8f0;border-radius:.375rem;padding:.25rem .5rem}`,
    `.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}`,
  ],
})
export class LangSwitchComponent {
  private readonly transloco = inject(TranslocoService);
  readonly langs: readonly string[] = (this.transloco.getAvailableLangs() as string[]) ?? ['en'];
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

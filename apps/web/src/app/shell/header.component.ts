import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { LangSwitchComponent } from '../i18n/lang-switch.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterModule, LangSwitchComponent],
  template: `
    <header class="sticky top-0 z-40 bg-[--color-surface] shadow" role="banner">
      <div class="mx-auto max-w-6xl px-4 sm:px-6 py-3 flex items-center justify-between">
        <a routerLink="/" class="text-[--color-primary] font-semibold tracking-tight">Planning Poker</a>
        <div class="flex items-center gap-3">
          <app-lang-switch />
        </div>
      </div>
    </header>
  `,
})
export class HeaderComponent {}


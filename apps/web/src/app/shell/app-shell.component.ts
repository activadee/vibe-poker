import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './header.component';
import { FooterComponent } from './footer.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, FooterComponent],
  template: `
    <div class="min-h-screen flex flex-col bg-[--color-surface-faint]">
      <app-header />
      <main id="content" class="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 py-6">
        <router-outlet />
      </main>
      <app-footer />
    </div>
  `,
})
export class AppShellComponent {}


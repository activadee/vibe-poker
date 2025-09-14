import { Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  standalone: true,
  template: `
    <footer class="mt-auto bg-[--color-surface-faint] text-slate-600 text-sm" role="contentinfo">
      <div class="mx-auto max-w-6xl px-4 sm:px-6 py-4 flex items-center justify-between">
        <span>&copy; {{ year }} Planning Poker</span>
        <nav aria-label="Footer links" class="flex items-center gap-4">
          <a href="https://github.com/activadee/viber-poker#readme" target="_blank" rel="noreferrer" class="hover:underline">README</a>
          <a href="https://github.com/activadee/viber-poker/blob/main/CODE_OF_CONDUCT.md" target="_blank" rel="noreferrer" class="hover:underline">Code of Conduct</a>
        </nav>
      </div>
    </footer>
  `,
})
export class FooterComponent {
  readonly year = new Date().getFullYear();
}


import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-ui-card',
  standalone: true,
  templateUrl: './card.component.html',
})
export class UiCardComponent {
  @Input() padding: 'sm' | 'md' = 'md';

  get classes(): string {
    const pad = this.padding === 'sm' ? 'p-5' : 'p-6';
    return [
      'bg-surface shadow-card rounded-xl border border-slate-200',
      pad,
    ].join(' ');
  }
}

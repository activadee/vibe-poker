import { Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-vote-cards',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './vote-cards.component.html',
  styleUrls: ['./vote-cards.component.scss'],
})
export class VoteCardsComponent {
  // Standard Fibonacci preset per FR-007
  private readonly valuesSig = signal<string[]>(['1', '2', '3', '5', '8', '13', '21', '?', '☕']);
  @Input() set values(v: string[]) {
    this.valuesSig.set(Array.isArray(v) ? v : []);
  }
  get values(): string[] {
    return this.valuesSig();
  }
  @Input() disabled = false;

  @Output() valueSelected = new EventEmitter<string>();

  readonly selected = signal<string | null>(null);

  readonly items = computed(() => this.valuesSig().map((v) => ({
    value: v,
    label: v === '☕' ? 'Coffee break' : v,
  })));

  onCardClick(value: string) {
    if (this.disabled) return;
    this.selected.set(value);
    this.valueSelected.emit(value);
  }

  onKeydown(ev: KeyboardEvent, index: number) {
    if (this.disabled) return;
    const key = ev.key;
    const items = this.items();
    const max = items.length - 1;
    let nextIndex: number | null = null;
    if (key === 'ArrowRight' || key === 'ArrowDown') {
      nextIndex = Math.min(max, index + 1);
    } else if (key === 'ArrowLeft' || key === 'ArrowUp') {
      nextIndex = Math.max(0, index - 1);
    } else if (key === 'Home') {
      nextIndex = 0;
    } else if (key === 'End') {
      nextIndex = max;
    } else if (key === 'Enter' || key === ' ') {
      ev.preventDefault();
      const v = items[index]?.value;
      if (v) this.onCardClick(v);
      return;
    }
    if (nextIndex !== null && nextIndex !== index) {
      ev.preventDefault();
      const next = (ev.currentTarget as HTMLElement)
        ?.parentElement?.querySelectorAll<HTMLButtonElement>('button.card')[nextIndex];
      next?.focus();
    }
  }

  // Clear local selection highlight (used on revote)
  clearSelection() {
    this.selected.set(null);
  }
}

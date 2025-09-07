import { Directive, HostBinding, Input } from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

@Directive({
  selector: 'button[appUiButton], a[appUiButton]'
})
export class UiButtonDirective {
  private _variant: ButtonVariant = 'primary';
  @Input('appUiButton') set variantInput(v: ButtonVariant | '' | undefined) {
    this._variant = (v && v.length ? v : 'primary') as ButtonVariant;
  }
  get variant(): ButtonVariant { return this._variant; }
  @Input() size: ButtonSize = 'md';

  @HostBinding('class')
  get classes(): string {
    const base = [
      'inline-flex items-center justify-center select-none',
      'rounded-md font-medium shadow-sm',
      'transition-colors focus-visible:outline-2 focus-visible:outline-offset-2',
      'disabled:opacity-50 disabled:cursor-not-allowed'
    ];
    const size = this.size === 'sm'
      ? 'h-9 px-3 text-sm'
      : this.size === 'lg'
      ? 'h-11 px-5 text-base'
      : 'h-10 px-4 text-sm';
    const variant = this.variant === 'secondary'
      ? 'bg-white text-slate-900 border border-slate-200 hover:bg-slate-50 focus-visible:outline-primary-600'
      : this.variant === 'ghost'
      ? 'bg-transparent text-slate-700 hover:bg-slate-100 focus-visible:outline-primary-600'
      : 'bg-primary-900 text-white hover:bg-primary-800 focus-visible:outline-primary-700';
    return [...base, size, variant].join(' ');
  }
}

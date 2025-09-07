import { Directive, HostBinding } from '@angular/core';

@Directive({
  selector: 'input[appUiInput], textarea[appUiInput]'
})
export class UiInputDirective {
  @HostBinding('class')
  get classes(): string {
    return [
      'block w-full rounded-md',
      'border-slate-200 bg-white text-slate-900 shadow-sm',
      'placeholder:text-slate-400',
      'focus:border-primary-500 focus:ring-2 focus:ring-primary-500/40',
      'disabled:opacity-50'
    ].join(' ');
  }
}

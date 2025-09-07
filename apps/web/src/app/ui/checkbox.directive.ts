import { Directive, HostBinding } from '@angular/core';

@Directive({
  selector: 'input[type=checkbox][appUiCheckbox]'
})
export class UiCheckboxDirective {
  @HostBinding('class')
  get classes(): string {
    return [
      'h-4 w-4 rounded shrink-0 align-middle inline-block',
      'border-slate-300 text-primary-600',
      'focus:ring-primary-500'
    ].join(' ');
  }
}

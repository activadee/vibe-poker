import { Injectable, computed, inject, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';

export type I18nParams = Readonly<Record<string, unknown>>;

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly transloco = inject(TranslocoService);
  private readonly active = signal<string>(this.transloco.getActiveLang());

  constructor() {
    this.transloco.langChanges$.subscribe((l) => this.active.set(l));
  }

  lang = computed(() => this.active());

  setLang(lang: string): void {
    this.transloco.setActiveLang(lang);
  }

  t(key: string, params?: I18nParams): string {
    return this.transloco.translate(key, params);
  }
}


import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { TranslocoLoader, Translation } from '@jsverse/transloco';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AppTranslocoHttpLoader implements TranslocoLoader {
  private readonly http = inject(HttpClient);

  getTranslation(lang: string): Observable<Translation> {
    return this.http.get<Translation>(`/i18n/${encodeURIComponent(lang)}.json`);
  }
}


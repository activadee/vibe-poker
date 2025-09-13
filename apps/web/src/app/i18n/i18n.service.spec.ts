import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { I18nService } from './i18n.service';

describe('I18nService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: {
            en: {
              hello: 'Hello',
              greet: 'Hello {{name}}',
            },
            es: {
              hello: 'Hola',
              greet: 'Hola {{name}}',
            },
          },
          translocoConfig: {
            availableLangs: ['en', 'es'],
            defaultLang: 'en',
            reRenderOnLangChange: true,
          },
          preloadLangs: true,
        }),
      ],
    });
  });

  it('uses en as the default language', () => {
    const svc = TestBed.inject(I18nService);
    expect(svc.lang()).toBe('en');
  });

  it('translates simple keys and params', () => {
    const svc = TestBed.inject(I18nService);
    expect(svc.t('hello')).toBe('Hello');
    expect(svc.t('greet', { name: 'Alice' })).toBe('Hello Alice');
  });

  it('switches language at runtime', () => {
    const svc = TestBed.inject(I18nService);
    svc.setLang('es');
    expect(svc.lang()).toBe('es');
    expect(svc.t('hello')).toBe('Hola');
    expect(svc.t('greet', { name: 'Bob' })).toBe('Hola Bob');
  });
});


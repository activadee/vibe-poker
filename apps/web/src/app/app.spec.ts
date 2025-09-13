import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { provideRouter } from '@angular/router';
import { appRoutes } from './app.routes';
import { TranslocoTestingModule } from '@jsverse/transloco';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { en: { common: { appName: 'Planning Poker' } } },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' }
        }),
        App,
      ],
      providers: [provideRouter(appRoutes)],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});

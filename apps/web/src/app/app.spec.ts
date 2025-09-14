import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { provideRouter } from '@angular/router';
import { appRoutes } from './app.routes';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { Router } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';

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
      providers: [provideRouter(appRoutes), provideHttpClient(withFetch())],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('renders a persistent header and footer landmarks around routed content', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const header = fixture.nativeElement.querySelector('header');
    const main = fixture.nativeElement.querySelector('main#content');
    const footer = fixture.nativeElement.querySelector('footer');

    expect(header).not.toBeNull();
    expect(main).not.toBeNull();
    expect(footer).not.toBeNull();
  });

  it('keeps header/footer static while navigating between routes', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const router = TestBed.inject(Router);
    await router.navigateByUrl('/');
    fixture.detectChanges();

    const headerBefore = fixture.nativeElement.querySelector('header');
    const footerBefore = fixture.nativeElement.querySelector('footer');

    await router.navigateByUrl('/r/123');
    fixture.detectChanges();

    const headerAfter = fixture.nativeElement.querySelector('header');
    const footerAfter = fixture.nativeElement.querySelector('footer');

    expect(headerBefore).not.toBeNull();
    expect(footerBefore).not.toBeNull();
    // landmarks should remain present after route change
    expect(headerAfter).not.toBeNull();
    expect(footerAfter).not.toBeNull();
  });

  it('places the language switch inside the header', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const header = fixture.nativeElement.querySelector('header');
    const lang = header?.querySelector('app-lang-switch');
    expect(lang).not.toBeNull();
  });
});

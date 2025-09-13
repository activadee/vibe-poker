import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { LobbyComponent } from './lobby.component';

describe('LobbyComponent i18n', () => {
  let fixture: ComponentFixture<LobbyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        TranslocoTestingModule.forRoot({
          langs: {
            en: {
              lobby: {
                title: 'Planning Poker',
                subtitle: 'Collaborative estimation for agile teams',
                create: {
                  title: 'Create a Room',
                  subtitle: 'Enter your display name to start a new estimation session.',
                  nameLabel: 'Display Name',
                  namePlaceholder: 'e.g. Alice',
                  nameHelp: '3–30 characters',
                  submit: 'Create Room',
                },
                join: {
                  title: 'Join a Room',
                  subtitle: 'Paste a room code or full link to join an existing session.',
                  codeLabel: 'Room Code or Link',
                  codePlaceholder: 'abc-123-xy or https://…/r/ABCD-1234',
                  help: 'Join is enabled when code is present.',
                  observer: 'Join as observer (cannot vote)',
                  submit: 'Join Room',
                },
              },
            },
          },
          translocoConfig: {
            availableLangs: ['en'],
            defaultLang: 'en',
          },
          preloadLangs: true,
        }),
        LobbyComponent,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LobbyComponent);
    fixture.detectChanges();
  });

  it('renders translated lobby titles', () => {
    const compiled: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Planning Poker');
    expect(compiled.textContent).toContain('Create a Room');
    expect(compiled.textContent).toContain('Join a Room');
  });
});

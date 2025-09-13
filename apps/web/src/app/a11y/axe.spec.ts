import 'jest-axe/extend-expect';
import { axe } from 'jest-axe';
import { TestBed } from '@angular/core/testing';
import { LobbyComponent } from '../lobby/lobby.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { VoteCardsComponent } from '../vote-cards/vote-cards.component';

describe('A11y (axe) - core screens', () => {
  it('Lobby has no critical violations', async () => {
    const fixture = TestBed.configureTestingModule({ imports: [LobbyComponent, HttpClientTestingModule, RouterTestingModule] }).createComponent(LobbyComponent);
    fixture.detectChanges();
    const results = await axe(fixture.nativeElement, {
      rules: {
        // Allow color-contrast to be handled by our token tests; still catches critical issues elsewhere
        'color-contrast': { enabled: false },
      },
    });
    // jest-axe marks violations by severity; filter to serious/critical for DoD
    const seriousOrWorse = results.violations.filter(v => (v.impact === 'serious' || v.impact === 'critical'));
    expect(seriousOrWorse).toHaveLength(0);
  });

  it('Vote cards component has no critical violations', async () => {
    const fixture = TestBed.configureTestingModule({ imports: [VoteCardsComponent] }).createComponent(VoteCardsComponent);
    fixture.detectChanges();
    const results = await axe(fixture.nativeElement);
    const seriousOrWorse = results.violations.filter(v => (v.impact === 'serious' || v.impact === 'critical'));
    expect(seriousOrWorse).toHaveLength(0);
  });
});

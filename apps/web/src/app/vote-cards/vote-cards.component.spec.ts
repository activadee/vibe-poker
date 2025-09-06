import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VoteCardsComponent } from './vote-cards.component';

describe('VoteCardsComponent', () => {
  let fixture: ComponentFixture<VoteCardsComponent>;
  let component: VoteCardsComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VoteCardsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(VoteCardsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders all standard Fibonacci cards', () => {
    const btns = Array.from(
      fixture.nativeElement.querySelectorAll<HTMLButtonElement>('button.card')
    ).map((b) => b.textContent?.trim());
    expect(btns).toEqual(['1', '2', '3', '5', '8', '13', '21', '?', '☕']);
  });

  it('emits selection and marks the clicked card selected', () => {
    const spy = jest.fn();
    component.valueSelected.subscribe(spy);
    fixture.detectChanges();

    const five = fixture.nativeElement.querySelectorAll('button.card')[3]; // '5'
    (five as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(spy).toHaveBeenCalledWith('5');
    expect(five.classList.contains('selected')).toBe(true);
    expect((five as HTMLButtonElement).getAttribute('aria-pressed')).toBe('true');
  });

  it('supports keyboard selection (Enter) and arrow navigation', () => {
    const spy = jest.fn();
    component.valueSelected.subscribe(spy);
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('button.card');
    const first = buttons[0] as HTMLButtonElement;
    first.focus();
    // Move right then select with Enter
    first.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    fixture.detectChanges();
    // Focus should be on second card now
    const second = buttons[1] as HTMLButtonElement;
    expect(document.activeElement === second).toBe(true);

    second.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();
    expect(spy).toHaveBeenCalledWith('2');
  });

  it('does not emit when disabled', () => {
    const spy = jest.fn();
    component.valueSelected.subscribe(spy);
    component.disabled = true;
    fixture.detectChanges();

    const any = fixture.nativeElement.querySelector('button.card') as HTMLButtonElement;
    any.click();
    fixture.detectChanges();
    expect(spy).not.toHaveBeenCalled();
  });

  it('shows tooltip and hint when disabled', () => {
    component.disabled = true;
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector('button.card') as HTMLButtonElement;
    expect(btn).toBeTruthy();
    expect(btn.disabled).toBe(true);
    expect(btn.getAttribute('title')).toBe('Observers cannot vote');

    const hint = fixture.nativeElement.querySelector('.hint');
    expect(hint?.textContent?.trim()).toBe('Observers cannot vote');
  });
});

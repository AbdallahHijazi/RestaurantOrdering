import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IconButton } from '../icon-button/icon-button';
import { AppTooltip } from './tooltip';

@Component({
  imports: [AppTooltip, IconButton],
  template: `
    <span
      class="wrapper"
      tabindex="0"
      [appTooltip]="text()"
      data-testid="wrapper"
    >
      <button type="button" disabled data-testid="disabled-inner">Reorder</button>
    </span>
    <button
      appIconButton
      icon="pencil"
      label="Edit meal"
      [tooltip]="true"
      data-testid="icon-button"
    ></button>
    <button appIconButton icon="trash" label="Native label" data-testid="native-button"></button>
  `,
})
class HostComponent {
  readonly text = signal('Select a category first');
}

describe('AppTooltip', () => {
  let fixture: ComponentFixture<HostComponent>;
  const wrapper = () => fixture.nativeElement.querySelector('[data-testid="wrapper"]') as HTMLElement;
  const bubble = () => document.body.querySelector('.app-tooltip') as HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    document.querySelectorAll('app-tooltip-host').forEach((node) => node.remove());
  });

  it('shows on keyboard focus with role=tooltip, wiring aria-describedby while visible', () => {
    wrapper().dispatchEvent(new Event('focusin'));

    expect(bubble().getAttribute('role')).toBe('tooltip');
    expect(bubble().textContent?.trim()).toBe('Select a category first');
    expect(bubble().classList.contains('is-visible')).toBe(true);
    expect(wrapper().getAttribute('aria-describedby')).toBe(bubble().id);

    wrapper().dispatchEvent(new Event('focusout'));
    expect(bubble().classList.contains('is-visible')).toBe(false);
    expect(wrapper().hasAttribute('aria-describedby')).toBe(false);
  });

  it('renders on <body>, so no ancestor can clip it', () => {
    wrapper().dispatchEvent(new Event('focusin'));
    expect(bubble().closest('app-tooltip-host')?.parentElement).toBe(document.body);
  });

  it('hides on Escape and when the text becomes empty while visible', () => {
    wrapper().dispatchEvent(new Event('focusin'));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(bubble().classList.contains('is-visible')).toBe(false);

    wrapper().dispatchEvent(new Event('focusin'));
    fixture.componentInstance.text.set('');
    fixture.detectChanges();
    expect(bubble().classList.contains('is-visible')).toBe(false);
  });

  it('updates the visible text when the explanation changes', () => {
    wrapper().dispatchEvent(new Event('focusin'));
    fixture.componentInstance.text.set('Clear the search first');
    fixture.detectChanges();
    expect(bubble().textContent?.trim()).toBe('Clear the search first');
  });

  it('does not open for an empty text or from a disabled control', () => {
    fixture.componentInstance.text.set('');
    fixture.detectChanges();
    wrapper().dispatchEvent(new Event('focusin'));
    expect(document.body.querySelector('.app-tooltip')?.classList.contains('is-visible') ?? false).toBe(false);

    fixture.componentInstance.text.set('Reason');
    fixture.detectChanges();
    vi.useFakeTimers();
    try {
      const inner = fixture.nativeElement.querySelector('[data-testid="disabled-inner"]') as HTMLButtonElement;
      const event = new Event('pointerenter');
      Object.defineProperty(event, 'pointerType', { value: 'mouse' });
      // The disabled <button> is not itself a tooltip host; the wrapper is.
      wrapper().dispatchEvent(event);
      vi.advanceTimersByTime(300);
      expect(bubble().textContent?.trim()).toBe('Reason');
      expect(inner.disabled).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('explains on touch only for non-actionable anchors, not for enabled buttons', () => {
    const touch = (target: HTMLElement) => {
      const event = new Event('pointerdown', { bubbles: true });
      Object.defineProperty(event, 'pointerType', { value: 'touch' });
      target.dispatchEvent(event);
    };

    const button = fixture.nativeElement.querySelector('[data-testid="icon-button"]') as HTMLElement;
    touch(button);
    expect(document.body.querySelector('.app-tooltip')?.classList.contains('is-visible') ?? false).toBe(false);

    touch(wrapper());
    expect(bubble().classList.contains('is-visible')).toBe(true);
  });

  it('appIconButton: tooltip input swaps the native title for the styled tooltip', () => {
    const styled = fixture.nativeElement.querySelector('[data-testid="icon-button"]') as HTMLElement;
    const native = fixture.nativeElement.querySelector('[data-testid="native-button"]') as HTMLElement;
    expect(styled.hasAttribute('title')).toBe(false);
    expect(native.getAttribute('title')).toBe('Native label');
    expect(styled.getAttribute('aria-label')).toBe('Edit meal');

    styled.dispatchEvent(new Event('focusin'));
    expect(bubble().textContent?.trim()).toBe('Edit meal');
    expect(bubble().classList.contains('is-visible')).toBe(true);
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { LocaleService } from '../../../core/localization/locale';
import { ErrorState } from './error-state';

describe('ErrorState (unified load-failure pattern)', () => {
  let fixture: ComponentFixture<ErrorState>;
  const root = () => fixture.nativeElement as HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ErrorState] });
    TestBed.inject(LocaleService).setLocale('en');
    fixture = TestBed.createComponent(ErrorState);
  });

  afterEach(() => TestBed.inject(LocaleService).setLocale('ar'));

  it('renders icon, title, helper text and a labelled retry button with sensible defaults', () => {
    fixture.detectChanges();

    expect(root().querySelector('[role="alert"]')).toBeTruthy();
    expect(root().querySelector('.app-error-state__icon svg')).toBeTruthy();
    expect(root().querySelector('.app-error-state__title')?.textContent).toContain('Unable to load data');
    expect(root().querySelector('.app-error-state__message')?.textContent).toBeTruthy();
    expect(root().querySelector('.app-error-state__retry')?.textContent).toContain('Try again');
  });

  it('shows page-specific text and emits retry, exposing the retry test id', () => {
    fixture.componentRef.setInput('title', 'Unable to load orders');
    fixture.componentRef.setInput('message', 'Network down');
    fixture.componentRef.setInput('retryLabel', 'Reload');
    fixture.componentRef.setInput('retryTestId', 'page-retry');
    fixture.detectChanges();
    const retry = vi.fn();
    fixture.componentInstance.retry.subscribe(retry);

    expect(root().querySelector('.app-error-state__title')?.textContent).toContain('Unable to load orders');
    expect(root().querySelector('.app-error-state__message')?.textContent).toContain('Network down');
    const button = root().querySelector('[data-testid="page-retry"]') as HTMLButtonElement;
    expect(button.textContent).toContain('Reload');
    button.click();
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('compact mode keeps the same structure, drops the default helper text, and the retry can be hidden/busy', () => {
    fixture.componentRef.setInput('compact', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.classList.contains('app-error-state--compact')).toBe(true);
    expect(root().querySelector('.app-error-state__message')).toBeNull();

    fixture.componentRef.setInput('retrying', true);
    fixture.detectChanges();
    expect((root().querySelector('.app-error-state__retry') as HTMLButtonElement).disabled).toBe(true);

    fixture.componentRef.setInput('showRetry', false);
    fixture.detectChanges();
    expect(root().querySelector('.app-error-state__retry')).toBeNull();
  });
});

import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LocaleService } from '../../../core/localization/locale';
import { OrderModalShell } from './order-modal-shell';

@Component({
  imports: [OrderModalShell],
  template: `
    <button type="button" #trigger data-testid="trigger">Open</button>
    <app-order-modal-shell
      [open]="open()"
      title="Test modal"
      closeLabel="Close"
      testId="test-order-modal"
      (closed)="open.set(false)"
    >
      <p data-testid="modal-body">Body</p>
    </app-order-modal-shell>
  `,
})
class HostComponent {
  readonly open = signal(false);
}

@Component({
  imports: [OrderModalShell],
  template: `
    @if (mounted()) {
      <app-order-modal-shell
        [open]="open()"
        title="Mounted modal"
        closeLabel="Close"
        testId="mounted-order-modal"
        (closed)="open.set(false)"
      >
        <p>Body</p>
      </app-order-modal-shell>
    }
  `,
})
class ConditionalHostComponent {
  readonly mounted = signal(true);
  readonly open = signal(true);
}

describe('OrderModalShell teardown', () => {
  afterEach(() => {
    document.body.classList.remove('order-modal-scroll-lock');
    document.querySelectorAll('app-modal-shell, app-order-modal-shell').forEach((node) => node.remove());
  });

  it('leaves no ghost overlay when its view is destroyed while open', async () => {
    const fixture = TestBed.createComponent(ConditionalHostComponent);
    fixture.detectChanges();
    expect(document.body.querySelector('[data-testid="mounted-order-modal"]')).toBeTruthy();

    // Same tick: close and tear the @if view down (what the order confirmation used to do).
    fixture.componentInstance.open.set(false);
    fixture.componentInstance.mounted.set(false);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(document.querySelector('app-order-modal-shell')).toBeNull();
    expect(document.querySelector('[data-testid="order-modal-backdrop"]')).toBeNull();
    expect(document.body.classList.contains('order-modal-scroll-lock')).toBe(false);
  });

  it('leaves no ghost overlay when destroyed while still open', async () => {
    const fixture = TestBed.createComponent(ConditionalHostComponent);
    fixture.detectChanges();

    fixture.componentInstance.mounted.set(false);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(document.querySelector('app-order-modal-shell')).toBeNull();
  });
});

describe('OrderModalShell', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    document.body.classList.remove('order-modal-scroll-lock');
    document.querySelectorAll('app-modal-shell, app-order-modal-shell').forEach((node) => node.remove());
    TestBed.inject(LocaleService).setLocale('ar');
  });

  it('portals the host to document.body when open', () => {
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();

    const shell = document.body.querySelector('app-order-modal-shell') as HTMLElement | null;
    expect(shell).toBeTruthy();
    expect(shell?.parentElement).toBe(document.body);
    expect(fixture.nativeElement.querySelector('app-order-modal-shell')).toBeNull();
  });

  it('closes on escape and restores scroll lock', () => {
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    expect(document.body.classList.contains('order-modal-scroll-lock')).toBe(true);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(fixture.componentInstance.open()).toBe(false);
    expect(document.body.classList.contains('order-modal-scroll-lock')).toBe(false);
  });

  it('closes on backdrop click', () => {
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();

    const backdrop = document.body.querySelector(
      '[data-testid="order-modal-backdrop"]',
    ) as HTMLElement;
    backdrop.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.open()).toBe(false);
  });

  it('renders unified modal-close-button on the header', () => {
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();

    const close = document.body.querySelector('[data-testid="order-modal-close"]');
    expect(close?.classList.contains('modal-close-button')).toBe(true);
  });

  it('centers dialog with grid overlay styles', () => {
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();

    const backdrop = document.body.querySelector(
      '[data-testid="order-modal-backdrop"]',
    ) as HTMLElement;
    const dialog = document.body.querySelector('[data-testid="test-order-modal"]') as HTMLElement;

    expect(getComputedStyle(backdrop).display).toBe('grid');
    expect(getComputedStyle(backdrop).position).toBe('fixed');
    expect(getComputedStyle(dialog).flexDirection).toBe('column');
  });
});

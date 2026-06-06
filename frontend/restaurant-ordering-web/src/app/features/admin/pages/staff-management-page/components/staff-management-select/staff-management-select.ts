import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  effect,
  ElementRef,
  forwardRef,
  HostListener,
  inject,
  input,
  output,
  PLATFORM_ID,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
} from '@angular/forms';

export interface StaffSelectOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-staff-management-select',
  templateUrl: './staff-management-select.html',
  styleUrl: './staff-management-select.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => StaffManagementSelect),
      multi: true,
    },
  ],
})
export class StaffManagementSelect implements ControlValueAccessor {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly hostRef = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly options = input.required<StaffSelectOption[]>();
  readonly label = input('');
  readonly testId = input<string | null>(null);
  readonly disabled = input(false);
  readonly valueChange = output<string>();

  readonly value = input<string | undefined>(undefined);

  private readonly syncExternalValue = effect(() => {
    const incoming = this.value();
    if (incoming === undefined) {
      return;
    }

    untracked(() => {
      if (incoming !== this.currentValue()) {
        this.currentValue.set(incoming);
        this.syncActiveIndex();
      }
    });
  });

  protected readonly triggerRef = viewChild<ElementRef<HTMLButtonElement>>('triggerButton');
  protected readonly panelRef = viewChild<ElementRef<HTMLDivElement>>('optionsPanel');

  protected readonly open = signal(false);
  protected readonly activeIndex = signal(0);
  protected readonly currentValue = signal('');
  protected readonly panelStyle = signal<{
    top: string | null;
    bottom: string | null;
    left: string;
    width: string;
    maxHeight: string;
  }>({
    top: '0px',
    bottom: null,
    left: '0px',
    width: '0px',
    maxHeight: '220px',
  });

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;
  private formDisabled = false;

  protected selectedLabel(): string {
    const match = this.options().find((option) => option.value === this.currentValue());
    return match?.label ?? '';
  }

  protected listboxId(): string {
    return `${this.testId() ?? 'staff-select'}-listbox`;
  }

  protected isDisabled(): boolean {
    return this.disabled() || this.formDisabled;
  }

  writeValue(value: string | null): void {
    this.currentValue.set(value ?? '');
    this.syncActiveIndex();
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.formDisabled = isDisabled;
  }

  protected toggleOpen(): void {
    if (this.isDisabled()) {
      return;
    }

    if (this.open()) {
      this.closePanel(false);
      return;
    }

    this.openPanel();
  }

  protected selectOption(option: StaffSelectOption, index: number): void {
    this.activeIndex.set(index);
    this.commitValue(option.value);
    this.closePanel(true);
  }

  protected onTriggerKeydown(event: KeyboardEvent): void {
    if (this.isDisabled()) {
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!this.open()) {
          this.openPanel();
          return;
        }
        this.moveActive(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (!this.open()) {
          this.openPanel();
          return;
        }
        this.moveActive(-1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (!this.open()) {
          this.openPanel();
          return;
        }
        this.selectActiveOption();
        break;
      case 'Home':
        event.preventDefault();
        if (!this.open()) {
          this.openPanel();
          return;
        }
        this.activeIndex.set(0);
        this.scrollActiveIntoView();
        break;
      case 'End':
        event.preventDefault();
        if (!this.open()) {
          this.openPanel();
          return;
        }
        this.activeIndex.set(Math.max(this.options().length - 1, 0));
        this.scrollActiveIntoView();
        break;
      case 'Escape':
        if (this.open()) {
          event.preventDefault();
          this.closePanel(false);
        }
        break;
      default:
        break;
    }
  }

  protected onOptionKeydown(event: KeyboardEvent, option: StaffSelectOption, index: number): void {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.moveActive(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.moveActive(-1);
        break;
      case 'Home':
        event.preventDefault();
        this.activeIndex.set(0);
        this.focusActiveOption();
        break;
      case 'End':
        event.preventDefault();
        this.activeIndex.set(Math.max(this.options().length - 1, 0));
        this.focusActiveOption();
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.selectOption(option, index);
        break;
      case 'Escape':
        event.preventDefault();
        this.closePanel(false);
        break;
      default:
        break;
    }
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.open()) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Node)) {
      return;
    }

    if (!this.hostRef.nativeElement.contains(target)) {
      this.closePanel(false);
    }
  }

  @HostListener('document:keydown.escape')
  protected onDocumentEscape(): void {
    if (this.open()) {
      this.closePanel(false);
    }
  }

  @HostListener('window:resize')
  @HostListener('window:scroll')
  protected repositionPanel(): void {
    if (this.open()) {
      this.updatePanelPosition();
    }
  }

  private openPanel(): void {
    this.syncActiveIndex();
    this.open.set(true);
    queueMicrotask(() => {
      this.updatePanelPosition();
      this.focusActiveOption();
    });
  }

  private closePanel(restoreFocus: boolean): void {
    this.open.set(false);
    this.onTouched();
    if (restoreFocus) {
      queueMicrotask(() => this.triggerRef()?.nativeElement.focus());
    }
  }

  private commitValue(value: string): void {
    this.currentValue.set(value);
    this.onChange(value);
    this.valueChange.emit(value);
  }

  private syncActiveIndex(): void {
    const index = this.options().findIndex((option) => option.value === this.currentValue());
    this.activeIndex.set(index >= 0 ? index : 0);
  }

  private moveActive(delta: number): void {
    const count = this.options().length;
    if (count === 0) {
      return;
    }

    const next = (this.activeIndex() + delta + count) % count;
    this.activeIndex.set(next);
    this.focusActiveOption();
  }

  private selectActiveOption(): void {
    const option = this.options()[this.activeIndex()];
    if (!option) {
      return;
    }

    this.selectOption(option, this.activeIndex());
  }

  private focusActiveOption(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const panel = this.panelRef()?.nativeElement;
    if (!panel) {
      return;
    }

    const option = panel.querySelector<HTMLButtonElement>(
      `[data-option-index="${this.activeIndex()}"]`,
    );
    option?.focus();
    this.scrollActiveIntoView();
  }

  private scrollActiveIntoView(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const panel = this.panelRef()?.nativeElement;
    const option = panel?.querySelector<HTMLButtonElement>(
      `[data-option-index="${this.activeIndex()}"]`,
    );
    option?.scrollIntoView?.({ block: 'nearest' });
  }

  private updatePanelPosition(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const trigger = this.triggerRef()?.nativeElement;
    if (!trigger) {
      return;
    }

    const rect = trigger.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const gap = 6;
    const maxPanelHeight = 220;
    const spaceBelow = viewportHeight - rect.bottom - gap;
    const spaceAbove = rect.top - gap;
    const minPreferredSpace = 120;
    const openUpward = spaceBelow < minPreferredSpace && spaceAbove > spaceBelow;

    if (openUpward) {
      this.panelStyle.set({
        top: null,
        bottom: `${viewportHeight - rect.top + gap}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`,
        maxHeight: `${Math.min(maxPanelHeight, Math.max(spaceAbove, 80))}px`,
      });
      return;
    }

    this.panelStyle.set({
      top: `${rect.bottom + gap}px`,
      bottom: null,
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      maxHeight: `${Math.min(maxPanelHeight, Math.max(spaceBelow, 80))}px`,
    });
  }
}

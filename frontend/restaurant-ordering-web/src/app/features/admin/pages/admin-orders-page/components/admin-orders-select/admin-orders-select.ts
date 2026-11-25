import { isPlatformBrowser } from '@angular/common';

import {

  Component,

  ElementRef,

  HostListener,

  inject,

  input,

  output,

  PLATFORM_ID,

  signal,

  viewChild,

} from '@angular/core';



export interface AdminOrdersSelectOption {

  value: string;

  label: string;

}



@Component({

  selector: 'app-admin-orders-select',

  templateUrl: './admin-orders-select.html',

  styleUrl: './admin-orders-select.scss',

})

export class AdminOrdersSelect {

  private readonly platformId = inject(PLATFORM_ID);

  private readonly hostRef = inject<ElementRef<HTMLElement>>(ElementRef);



  readonly options = input.required<AdminOrdersSelectOption[]>();

  readonly label = input('');

  readonly testId = input<string | null>(null);

  readonly disabled = input(false);

  readonly value = input.required<string>();

  readonly valueChange = output<string>();



  protected readonly open = signal(false);

  protected readonly openUpward = signal(false);

  protected readonly activeIndex = signal(0);

  protected readonly panelMaxHeight = signal('220px');



  protected readonly triggerRef = viewChild<ElementRef<HTMLButtonElement>>('triggerButton');

  protected readonly panelRef = viewChild<ElementRef<HTMLDivElement>>('optionsPanel');



  protected selectedLabel(): string {

    const match = this.options().find((option) => option.value === this.value());

    return match?.label ?? '';

  }



  protected listboxId(): string {

    return `${this.testId() ?? 'admin-orders-select'}-listbox`;

  }



  protected toggleOpen(): void {

    if (this.disabled()) {

      return;

    }



    if (this.open()) {

      this.closePanel(false);

      return;

    }



    this.openPanel();

  }



  protected selectOption(option: AdminOrdersSelectOption, index: number): void {

    this.activeIndex.set(index);

    this.valueChange.emit(option.value);

    this.closePanel(true);

  }



  protected onTriggerKeydown(event: KeyboardEvent): void {

    if (this.disabled()) {

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



  protected onOptionKeydown(

    event: KeyboardEvent,

    option: AdminOrdersSelectOption,

    index: number,

  ): void {

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

      this.updatePanelPlacement();

    }

  }



  private openPanel(): void {

    this.syncActiveIndex();

    this.open.set(true);

    this.updatePanelPlacement();

    queueMicrotask(() => {

      this.updatePanelPlacement();

      this.focusActiveOption();

    });

  }



  private closePanel(restoreFocus: boolean): void {

    this.open.set(false);

    this.openUpward.set(false);

    if (restoreFocus) {

      queueMicrotask(() => this.triggerRef()?.nativeElement.focus());

    }

  }



  private syncActiveIndex(): void {

    const index = this.options().findIndex((option) => option.value === this.value());

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



  private updatePanelPlacement(): void {

    if (!isPlatformBrowser(this.platformId)) {

      return;

    }



    const trigger =
      this.triggerRef()?.nativeElement ??
      this.hostRef.nativeElement.querySelector<HTMLButtonElement>('.admin-orders-select__trigger');

    if (!trigger) {

      return;

    }



    const rect = trigger.getBoundingClientRect();

    const viewportHeight = window.innerHeight;

    const gap = 8;

    const maxPanelHeight = 220;

    const spaceBelow = viewportHeight - rect.bottom - gap;

    const spaceAbove = rect.top - gap;

    const minPreferredSpace = 120;

    const shouldOpenUpward = spaceBelow < minPreferredSpace && spaceAbove > spaceBelow;



    this.openUpward.set(shouldOpenUpward);

    const availableSpace = shouldOpenUpward ? spaceAbove : spaceBelow;

    this.panelMaxHeight.set(`${Math.min(maxPanelHeight, Math.max(availableSpace, 80))}px`);

  }

}



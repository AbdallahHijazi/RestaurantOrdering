import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  effect,
  ElementRef,
  HostListener,
  inject,
  input,
  OnDestroy,
  output,
  PLATFORM_ID,
} from '@angular/core';
import { attachElementToBody } from '../../utils/overlay-body-portal';
import { IconButton } from '../../ui/icon-button/icon-button';

@Component({
  imports: [IconButton],
  selector: 'app-modal-shell, app-order-modal-shell',
  templateUrl: './order-modal-shell.html',
  styleUrl: './order-modal-shell.scss',
  host: {
    '[class.modal-shell-host--open]': 'open()',
  },
})
export class ModalShell implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private triggerElement: HTMLElement | null = null;
  private detachFromBody: ((destroy?: boolean) => void) | null = null;

  readonly open = input(false);
  readonly title = input.required<string>();
  readonly closeLabel = input.required<string>();
  readonly titleId = input('order-modal-title');
  readonly testId = input<string | null>(null);
  readonly wide = input(false);
  readonly blockCloseWhileBusy = input(false);

  readonly closed = output<void>();

  constructor() {
    effect((onCleanup) => {
      if (!isPlatformBrowser(this.platformId)) {
        return;
      }

      const isOpen = this.open();
      const host = this.elementRef.nativeElement;

      if (isOpen) {
        this.triggerElement = document.activeElement as HTMLElement | null;
        if (host.parentElement !== document.body) {
          this.detachFromBody?.();
          this.detachFromBody = attachElementToBody(host);
        }
        document.body.classList.add('order-modal-scroll-lock');
      } else {
        document.body.classList.remove('order-modal-scroll-lock');
        this.detachFromBody?.();
        this.detachFromBody = null;
        queueMicrotask(() => this.triggerElement?.focus?.());
      }

      // Only drop the scroll lock here. Restoring/removing the host is handled by the branches above
      // (open -> closed) and by ngOnDestroy; doing it in a cleanup would run after Angular has
      // already removed the node on teardown and re-insert a dead ghost overlay.
      onCleanup(() => document.body.classList.remove('order-modal-scroll-lock'));
    });
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.open() && !this.blockCloseWhileBusy()) {
      this.closed.emit();
    }
  }

  protected requestClose(): void {
    if (!this.blockCloseWhileBusy()) {
      this.closed.emit();
    }
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget && !this.blockCloseWhileBusy()) {
      this.closed.emit();
    }
  }

  ngOnDestroy(): void {
    document.body.classList.remove('order-modal-scroll-lock');
    this.detachFromBody?.(true);
    this.detachFromBody = null;
    if (this.elementRef.nativeElement.parentNode === document.body) {
      this.elementRef.nativeElement.remove();
    }
  }
}

/** @deprecated Import ModalShell instead. */
export { ModalShell as OrderModalShell };

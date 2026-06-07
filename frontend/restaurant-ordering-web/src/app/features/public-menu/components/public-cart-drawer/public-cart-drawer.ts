import {
  Component,
  ElementRef,
  HostListener,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { LocaleService } from '../../../../core/localization/locale';
import { PublicCartService } from '../../data-access/public-cart.service';
import type { PublicRestaurantOrderSettings } from '../../models/public-menu.models';
import { displayUnitPrice, estimateOrderTotals } from '../../utils/order-estimate.util';
import { ORDER_TYPE_PICKUP } from '../../models/public-menu.models';
import { MOCK_IMAGE_FALLBACK } from '../../data-access/public-menu-mock.data';

@Component({
  selector: 'app-public-cart-drawer',
  templateUrl: './public-cart-drawer.html',
  styleUrl: './public-cart-drawer.scss',
})
export class PublicCartDrawer {
  readonly open = input(false);
  readonly orderSettings = input.required<PublicRestaurantOrderSettings>();
  readonly countryCode = input('SA');
  readonly imageFallback = input(MOCK_IMAGE_FALLBACK);

  readonly closed = output<void>();
  readonly continueCheckout = output<void>();

  private readonly panelRef = viewChild<ElementRef<HTMLElement>>('panel');
  protected readonly cart = inject(PublicCartService);
  protected readonly localeService = inject(LocaleService);
  protected readonly ui = this.localeService.ui;
  private readonly brokenImages = signal<Record<string, true>>({});

  protected readonly estimate = computed(() =>
    estimateOrderTotals(this.cart.cartItems(), this.orderSettings(), ORDER_TYPE_PICKUP),
  );

  protected readonly subtitle = computed(() =>
    this.ui().publicCartSubtitle.replace('{count}', String(this.cart.itemCount())),
  );

  constructor() {
    effect(() => {
      if (this.open()) {
        queueMicrotask(() => this.panelRef()?.nativeElement.focus());
      }
    });
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.open()) {
      this.closed.emit();
    }
  }

  protected lineName(line: { nameAr: string; nameEn?: string | null }): string {
    return this.localeService.pickText({ ar: line.nameAr, en: line.nameEn }, line.nameAr);
  }

  protected formatMoney(amount: number): string {
    return this.localeService.formatCurrency(
      amount,
      this.orderSettings().currencyCode,
      this.countryCode(),
    );
  }

  protected unitPrice(line: Parameters<typeof displayUnitPrice>[0]): number {
    return displayUnitPrice(line);
  }

  protected imageSrc(line: { menuItemId: string; imageUrl?: string | null }): string {
    if (this.brokenImages()[line.menuItemId]) {
      return this.imageFallback();
    }

    return line.imageUrl?.trim() || this.imageFallback();
  }

  protected onImageError(lineId: string): void {
    this.brokenImages.update((current) => ({ ...current, [lineId]: true }));
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closed.emit();
    }
  }

  protected increment(lineId: string): void {
    const line = this.cart.cartItems().find((item) => item.menuItemId === lineId);
    if (!line) {
      return;
    }

    this.cart.setQuantity(
      {
        id: line.menuItemId,
        categoryId: '',
        nameAr: line.nameAr,
        nameEn: line.nameEn,
        price: line.price,
        discountPrice: line.discountPrice,
        imageUrl: line.imageUrl,
        isAvailable: true,
      },
      line.quantity + 1,
    );
  }

  protected decrement(lineId: string): void {
    const line = this.cart.cartItems().find((item) => item.menuItemId === lineId);
    if (!line) {
      return;
    }

    this.cart.setQuantity(
      {
        id: line.menuItemId,
        categoryId: '',
        nameAr: line.nameAr,
        nameEn: line.nameEn,
        price: line.price,
        discountPrice: line.discountPrice,
        imageUrl: line.imageUrl,
        isAvailable: true,
      },
      line.quantity - 1,
    );
  }

  protected remove(lineId: string): void {
    this.cart.removeItem(lineId);
  }

  protected clearCart(): void {
    if (!window.confirm(this.ui().publicCartClearConfirm)) {
      return;
    }

    this.cart.clearCart();
  }

  protected exploreMenu(): void {
    this.closed.emit();
  }
}

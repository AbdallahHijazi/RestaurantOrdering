import {
  Component,
  HostListener,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LocaleService } from '../../../../core/localization/locale';
import { isDemoMenuSlug } from '../../data-access/public-menu-api';
import { PublicCartService } from '../../data-access/public-cart.service';
import type { CreatePublicOrderApiRequest } from '../../data-access/public-order.dto';
import {
  PublicOrdersApiService,
  type PublicOrderSubmitFailure,
} from '../../data-access/public-orders-api.service';
import type { PublicOrderConfirmationApiDto } from '../../data-access/public-order.dto';
import {
  ORDER_TYPE_DELIVERY,
  ORDER_TYPE_PICKUP,
  type PublicOrderType,
  type PublicRestaurantOrderSettings,
} from '../../models/public-menu.models';
import { estimateOrderTotals } from '../../utils/order-estimate.util';

@Component({
  selector: 'app-public-checkout-panel',
  imports: [FormsModule],
  templateUrl: './public-checkout-panel.html',
  styleUrl: './public-checkout-panel.scss',
})
export class PublicCheckoutPanel {
  readonly open = input(false);
  readonly slug = input.required<string>();
  readonly orderSettings = input.required<PublicRestaurantOrderSettings>();
  readonly countryCode = input('SA');

  readonly closed = output<void>();
  readonly orderPlaced = output<PublicOrderConfirmationApiDto>();
  readonly menuRefreshRequested = output<void>();

  private readonly ordersApi = inject(PublicOrdersApiService);
  protected readonly cart = inject(PublicCartService);
  protected readonly localeService = inject(LocaleService);
  protected readonly ui = this.localeService.ui;

  protected readonly guestName = signal('');
  protected readonly guestPhone = signal('');
  protected readonly deliveryAddress = signal('');
  protected readonly orderNotes = signal('');
  protected readonly orderType = signal<PublicOrderType>(ORDER_TYPE_PICKUP);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly isPreviewMode = computed(() => isDemoMenuSlug(this.slug()));

  protected readonly servicesAvailable = computed(() => {
    const settings = this.orderSettings();
    return settings.isPickupEnabled || settings.isDeliveryEnabled;
  });

  protected readonly estimate = computed(() =>
    estimateOrderTotals(this.cart.cartItems(), this.orderSettings(), this.orderType()),
  );

  protected readonly belowMinimum = computed(
    () => this.estimate().subtotal < this.orderSettings().minimumOrderAmount,
  );

  constructor() {
    effect(() => {
      if (this.open()) {
        this.syncDefaultOrderType();
        this.errorMessage.set(null);
      }
    });
  }

  protected syncDefaultOrderType(): void {
    const settings = this.orderSettings();
    if (settings.isPickupEnabled && !settings.isDeliveryEnabled) {
      this.orderType.set(ORDER_TYPE_PICKUP);
    } else if (!settings.isPickupEnabled && settings.isDeliveryEnabled) {
      this.orderType.set(ORDER_TYPE_DELIVERY);
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.open() && !this.submitting()) {
      this.closed.emit();
    }
  }

  protected formatMoney(amount: number): string {
    return this.localeService.formatCurrency(
      amount,
      this.orderSettings().currencyCode,
      this.countryCode(),
    );
  }

  protected selectPickup(): void {
    if (this.orderSettings().isPickupEnabled) {
      this.orderType.set(ORDER_TYPE_PICKUP);
    }
  }

  protected selectDelivery(): void {
    if (this.orderSettings().isDeliveryEnabled) {
      this.orderType.set(ORDER_TYPE_DELIVERY);
    }
  }

  protected canSubmit(): boolean {
    if (this.submitting() || this.cart.isEmpty() || !this.servicesAvailable()) {
      return false;
    }

    if (this.isPreviewMode()) {
      return false;
    }

    if (this.belowMinimum()) {
      return false;
    }

    if (!this.guestName().trim() || !this.guestPhone().trim()) {
      return false;
    }

    const type = this.orderType();
    if (type === ORDER_TYPE_PICKUP && !this.orderSettings().isPickupEnabled) {
      return false;
    }

    if (type === ORDER_TYPE_DELIVERY) {
      if (!this.orderSettings().isDeliveryEnabled) {
        return false;
      }

      if (!this.deliveryAddress().trim()) {
        return false;
      }
    }

    return true;
  }

  protected submit(): void {
    this.errorMessage.set(null);
    this.syncDefaultOrderType();

    if (!this.validateClient()) {
      return;
    }

    if (this.isPreviewMode()) {
      this.errorMessage.set(this.ui().publicCheckoutPreviewMode);
      return;
    }

    const request = this.buildRequest();
    this.submitting.set(true);

    this.ordersApi.createOrder(this.slug(), request).subscribe({
      next: (confirmation) => {
        this.submitting.set(false);
        this.cart.clearCart();
        this.orderPlaced.emit(confirmation);
      },
      error: (failure: PublicOrderSubmitFailure) => {
        this.submitting.set(false);
        this.errorMessage.set(this.resolveErrorMessage(failure));

        if (failure.type === 'not-found') {
          this.menuRefreshRequested.emit();
        }
      },
    });
  }

  protected buildRequest(): CreatePublicOrderApiRequest {
    const type = this.orderType();
    return {
      guestName: this.guestName().trim(),
      guestPhone: this.guestPhone().trim(),
      orderType: type,
      deliveryAddress: type === ORDER_TYPE_DELIVERY ? this.deliveryAddress().trim() : null,
      deliveryLatitude: null,
      deliveryLongitude: null,
      notes: this.orderNotes().trim() || null,
      items: this.cart.cartItems().map((line) => ({
        menuItemId: line.menuItemId,
        quantity: line.quantity,
        notes: line.notes?.trim() || null,
      })),
    };
  }

  private validateClient(): boolean {
    if (this.cart.isEmpty()) {
      this.errorMessage.set(this.ui().publicCartEmpty);
      return false;
    }

    if (!this.servicesAvailable()) {
      this.errorMessage.set(this.ui().publicCheckoutAllServicesDisabled);
      return false;
    }

    if (!this.guestName().trim()) {
      this.errorMessage.set(this.ui().publicCheckoutGuestName);
      return false;
    }

    if (!this.guestPhone().trim()) {
      this.errorMessage.set(this.ui().publicCheckoutGuestPhone);
      return false;
    }

    if (this.belowMinimum()) {
      this.errorMessage.set(this.ui().publicCheckoutMinimumOrder);
      return false;
    }

    const type = this.orderType();
    if (type === ORDER_TYPE_DELIVERY && !this.deliveryAddress().trim()) {
      this.errorMessage.set(this.ui().publicCheckoutDeliveryAddress);
      return false;
    }

    if (type === ORDER_TYPE_PICKUP && !this.orderSettings().isPickupEnabled) {
      this.errorMessage.set(this.ui().publicCheckoutServiceDisabled);
      return false;
    }

    if (type === ORDER_TYPE_DELIVERY && !this.orderSettings().isDeliveryEnabled) {
      this.errorMessage.set(this.ui().publicCheckoutServiceDisabled);
      return false;
    }

    return true;
  }

  private resolveErrorMessage(failure: PublicOrderSubmitFailure): string {
    if (failure.message) {
      return failure.message;
    }

    switch (failure.type) {
      case 'validation':
        return this.ui().publicOrderErrorValidation;
      case 'not-found':
        return this.ui().publicOrderErrorNotFound;
      case 'conflict':
        return this.ui().publicOrderErrorConflict;
      case 'too-many-requests':
        return this.ui().publicOrderErrorTooManyRequests;
      case 'preview':
        return this.ui().publicCheckoutPreviewMode;
      default:
        return this.ui().publicOrderErrorGeneric;
    }
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget && !this.submitting()) {
      this.closed.emit();
    }
  }
}

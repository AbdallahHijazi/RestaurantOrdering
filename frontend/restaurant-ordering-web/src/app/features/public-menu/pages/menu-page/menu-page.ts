import {
  Component,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';
import { LocaleService } from '../../../../core/localization/locale';
import { RestaurantThemeService } from '../../../../core/theme/restaurant-theme';
import { LanguageSwitcher } from '../../../../shared/ui/language-switcher/language-switcher';
import { LoadingState } from '../../../../shared/ui/loading-state/loading-state';
import { ErrorState } from '../../../../shared/ui/error-state/error-state';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { CategoryNavigation } from '../../components/category-navigation/category-navigation';
import { MenuItemCard } from '../../components/menu-item-card/menu-item-card';
import { RestaurantCoverHero } from '../../components/restaurant-cover-hero/restaurant-cover-hero';
import { PublicCartDrawer } from '../../components/public-cart-drawer/public-cart-drawer';
import { PublicCheckoutPanel } from '../../components/public-checkout-panel/public-checkout-panel';
import { PublicOrderConfirmation } from '../../components/public-order-confirmation/public-order-confirmation';
import { PublicCartService } from '../../data-access/public-cart.service';
import {
  PublicMenuApiService,
  type PublicMenuLoadError,
} from '../../data-access/public-menu-api';
import type { PublicOrderConfirmationApiDto } from '../../data-access/public-order.dto';
import { MOCK_IMAGE_FALLBACK } from '../../data-access/public-menu-mock.data';
import type { PublicMenuItem, PublicMenuPageData } from '../../models/public-menu.models';
import { readRouteParam } from './route-param.util';

type PageState = 'loading' | 'success' | 'not-found' | 'error';

@Component({
  selector: 'app-menu-page',
  imports: [
    LanguageSwitcher,
    LoadingState,
    ErrorState,
    EmptyState,
    CategoryNavigation,
    MenuItemCard,
    RestaurantCoverHero,
    PublicCartDrawer,
    PublicCheckoutPanel,
    PublicOrderConfirmation,
  ],
  templateUrl: './menu-page.html',
  styleUrl: './menu-page.scss',
})
export class MenuPage {
  private readonly route = inject(ActivatedRoute);
  private readonly menuApi = inject(PublicMenuApiService);
  protected readonly cart = inject(PublicCartService);
  protected readonly localeService = inject(LocaleService);
  private readonly themeService = inject(RestaurantThemeService);

  private readonly menuSection = viewChild<ElementRef<HTMLElement>>('menuSection');

  protected readonly pageState = signal<PageState>('loading');
  protected readonly menuData = signal<PublicMenuPageData | null>(null);
  protected readonly activeCategoryId = signal<string | null>(null);
  protected readonly logoFailed = signal(false);
  protected readonly restaurantSlug = signal('');

  protected readonly cartOpen = signal(false);
  protected readonly checkoutOpen = signal(false);
  protected readonly confirmationOpen = signal(false);
  protected readonly orderConfirmation = signal<PublicOrderConfirmationApiDto | null>(null);

  protected readonly imageFallback = MOCK_IMAGE_FALLBACK;

  protected readonly restaurantName = computed(() => {
    const restaurant = this.menuData()?.restaurant;
    if (!restaurant) {
      return '—';
    }

    this.localeService.locale();
    return this.localeService.pickText(
      { ar: restaurant.nameAr, en: restaurant.nameEn },
      restaurant.nameAr,
    );
  });

  protected readonly restaurantAddress = computed(() => {
    const restaurant = this.menuData()?.restaurant;
    if (!restaurant) {
      return '—';
    }

    this.localeService.locale();
    return this.localeService.pickText(
      { ar: restaurant.addressAr, en: restaurant.addressEn },
      '—',
    );
  });

  protected readonly ui = this.localeService.ui;

  protected readonly cartCount = this.cart.itemCount;

  protected readonly overlayOpen = computed(
    () => this.cartOpen() || this.checkoutOpen() || this.confirmationOpen(),
  );

  protected readonly filteredItems = computed(() => {
    const data = this.menuData();
    const categoryId = this.activeCategoryId();
    if (!data || !categoryId) {
      return [];
    }

    return data.items.filter((item) => item.categoryId === categoryId);
  });

  constructor() {
    const slug = readRouteParam(this.route, 'slug');

    if (!slug.trim()) {
      this.pageState.set('not-found');
      return;
    }

    this.loadMenu(slug);
  }

  protected reload(): void {
    const slug = readRouteParam(this.route, 'slug');
    if (slug.trim()) {
      this.loadMenu(slug);
    }
  }

  protected selectCategory(categoryId: string): void {
    this.activeCategoryId.set(categoryId);
  }

  protected scrollToMenu(): void {
    this.menuSection()?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  protected quantityFor(itemId: string): number {
    return this.cart.quantityFor(itemId);
  }

  protected onQuantityChange(item: PublicMenuItem, quantity: number): void {
    this.cart.setQuantity(item, quantity);
  }

  protected openCart(): void {
    this.cartOpen.set(true);
    this.setBodyScrollLocked(true);
  }

  protected closeCart(): void {
    this.cartOpen.set(false);
    this.syncBodyScrollLock();
  }

  protected openCheckout(): void {
    this.cartOpen.set(false);
    this.checkoutOpen.set(true);
    this.setBodyScrollLocked(true);
  }

  protected closeCheckout(): void {
    this.checkoutOpen.set(false);
    this.syncBodyScrollLock();
  }

  protected onOrderPlaced(confirmation: PublicOrderConfirmationApiDto): void {
    this.orderConfirmation.set(confirmation);
    this.checkoutOpen.set(false);
    this.confirmationOpen.set(true);
    this.setBodyScrollLocked(true);
  }

  protected closeConfirmation(): void {
    this.confirmationOpen.set(false);
    this.orderConfirmation.set(null);
    this.syncBodyScrollLock();
  }

  protected returnToMenuFromConfirmation(): void {
    this.closeConfirmation();
    this.scrollToMenu();
  }

  protected onLogoError(): void {
    this.logoFailed.set(true);
  }

  private loadMenu(slug: string): void {
    this.pageState.set('loading');
    const normalized = slug.trim().toLowerCase();
    this.restaurantSlug.set(normalized);
    this.cart.initForRestaurant(normalized);

    this.menuApi
      .getMenuBySlug(normalized)
      .pipe(finalize(() => undefined))
      .subscribe({
        next: (data) => {
          this.menuData.set(data);
          this.themeService.applyAccent(data.restaurant.primaryAccentColor);
          this.activeCategoryId.set(data.categories[0]?.id ?? null);
          this.pageState.set('success');
        },
        error: (error: { type?: PublicMenuLoadError }) => {
          if (error?.type === 'not-found') {
            this.pageState.set('not-found');
            return;
          }

          if (typeof ngDevMode !== 'undefined' && ngDevMode) {
            console.error('[MenuPage] Failed to load menu', error);
          }

          this.pageState.set('error');
        },
      });
  }

  private setBodyScrollLocked(locked: boolean): void {
    document.body.style.overflow = locked ? 'hidden' : '';
  }

  private syncBodyScrollLock(): void {
    this.setBodyScrollLocked(this.overlayOpen());
  }
}

declare const ngDevMode: boolean | undefined;

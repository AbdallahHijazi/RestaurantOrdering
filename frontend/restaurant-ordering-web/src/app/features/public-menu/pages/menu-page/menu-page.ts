import {
  Component,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { LocaleService } from '../../../../core/localization/locale';
import { RestaurantThemeService } from '../../../../core/theme/restaurant-theme';
import { LanguageSwitcher } from '../../../../shared/ui/language-switcher/language-switcher';
import { ErrorState } from '../../../../shared/ui/error-state/error-state';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { CategoryNavigation } from '../../components/category-navigation/category-navigation';
import { MenuItemCard } from '../../components/menu-item-card/menu-item-card';
import { RestaurantCoverHero } from '../../components/restaurant-cover-hero/restaurant-cover-hero';
import { PublicCartDrawer } from '../../components/public-cart-drawer/public-cart-drawer';
import { PublicCheckoutPanel } from '../../components/public-checkout-panel/public-checkout-panel';
import { PublicOrderConfirmation } from '../../components/public-order-confirmation/public-order-confirmation';
import { PublicMenuFloatingCart } from '../../components/public-menu-floating-cart/public-menu-floating-cart';
import { PublicMenuToast } from '../../components/public-menu-toast/public-menu-toast';
import { PublicCartService } from '../../data-access/public-cart.service';
import {
  PublicMenuApiService,
  type PublicMenuLoadError,
} from '../../data-access/public-menu-api';
import type { PublicOrderConfirmationApiDto } from '../../data-access/public-order.dto';
import { PublicTablesApiService } from '../../data-access/public-tables-api.service';
import { MOCK_IMAGE_FALLBACK } from '../../data-access/public-menu-mock.data';
import type {
  PublicMenuCategory,
  PublicMenuItem,
  PublicMenuPageData,
} from '../../models/public-menu.models';
import { PUBLIC_MENU_ALL_CATEGORIES_ID } from '../../public-menu.constants';
import { readRouteParam } from './route-param.util';

type PageState = 'loading' | 'success' | 'not-found' | 'error';

@Component({
  selector: 'app-menu-page',
  imports: [
    RouterLink,
    LanguageSwitcher,
    ErrorState,
    EmptyState,
    CategoryNavigation,
    MenuItemCard,
    RestaurantCoverHero,
    PublicCartDrawer,
    PublicCheckoutPanel,
    PublicOrderConfirmation,
    PublicMenuFloatingCart,
    PublicMenuToast,
  ],
  templateUrl: './menu-page.html',
  styleUrl: './menu-page.scss',
})
export class MenuPage implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly menuApi = inject(PublicMenuApiService);
  private readonly tablesApi = inject(PublicTablesApiService);
  protected readonly cart = inject(PublicCartService);
  protected readonly localeService = inject(LocaleService);
  private readonly themeService = inject(RestaurantThemeService);

  private readonly menuSection = viewChild<ElementRef<HTMLElement>>('menuSection');
  private lastFocusedElement: HTMLElement | null = null;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private floatingCartTimer: ReturnType<typeof setTimeout> | null = null;
  protected readonly floatingCartVisible = signal(false);

  protected readonly pageState = signal<PageState>('loading');
  protected readonly menuData = signal<PublicMenuPageData | null>(null);
  protected readonly activeCategoryId = signal<string>(PUBLIC_MENU_ALL_CATEGORIES_ID);
  protected readonly searchQuery = signal('');
  protected readonly logoFailed = signal(false);
  protected readonly restaurantSlug = signal('');

  protected readonly cartOpen = signal(false);
  protected readonly checkoutOpen = signal(false);
  protected readonly confirmationOpen = signal(false);
  protected readonly orderConfirmation = signal<PublicOrderConfirmationApiDto | null>(null);
  protected readonly toastMessage = signal('');
  protected readonly toastVisible = signal(false);
  protected readonly tableResolveState = signal<'idle' | 'loading' | 'ready' | 'error'>('idle');
  protected readonly tableResolveError = signal<string | null>(null);

  protected readonly resolvedTable = this.cart.resolvedTable;

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

  protected readonly menuAccentColor = computed(() =>
    this.themeService.sanitizeAccentColor(this.menuData()?.restaurant.primaryAccentColor),
  );

  protected readonly menuAccentStrongColor = computed(
    () => `color-mix(in srgb, ${this.menuAccentColor()} 82%, black)`,
  );

  protected readonly menuAccentSoftColor = computed(
    () => `color-mix(in srgb, ${this.menuAccentColor()} 18%, white)`,
  );

  protected readonly filteredItems = computed(() => {
    const data = this.menuData();
    const categoryId = this.activeCategoryId();
    const query = this.searchQuery().trim().toLowerCase();
    if (!data) {
      return [];
    }

    let items = data.items;
    if (categoryId !== PUBLIC_MENU_ALL_CATEGORIES_ID) {
      items = items.filter((item) => item.categoryId === categoryId);
    }

    if (!query) {
      return items;
    }

    return items.filter((item) => this.matchesSearch(item, query, data.categories));
  });

  protected readonly resultCountLabel = computed(() =>
    this.ui()
      .publicMenuResultCount.replace('{count}', String(this.filteredItems().length)),
  );

  constructor() {
    effect(() => {
      if (this.cart.itemCount() === 0) {
        this.hideFloatingCart();
      }
    });

    const slug = readRouteParam(this.route, 'slug');

    if (!slug.trim()) {
      this.pageState.set('not-found');
      return;
    }

    this.loadMenu(slug);
    this.resolveTableFromQuery(slug);
  }

  ngOnDestroy(): void {
    if (this.floatingCartTimer) {
      clearTimeout(this.floatingCartTimer);
      this.floatingCartTimer = null;
    }

    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
      this.toastTimer = null;
    }
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

  protected setSearchQuery(value: string): void {
    this.searchQuery.set(value);
  }

  protected scrollToMenu(): void {
    this.menuSection()?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  protected onItemAdded(item: PublicMenuItem): void {
    if (!this.cart.addMenuItem(item)) {
      return;
    }

    const name = this.localeService.pickText(
      { ar: item.nameAr, en: item.nameEn },
      item.nameAr,
    );
    this.showToast(`${name} — ${this.ui().publicMenuToastAdded}`);
    this.showFloatingCartTemporarily();
  }

  protected openCart(): void {
    this.hideFloatingCart();
    this.lastFocusedElement = document.activeElement as HTMLElement | null;
    this.cartOpen.set(true);
    this.setBodyScrollLocked(true);
  }

  protected closeCart(): void {
    this.cartOpen.set(false);
    this.syncBodyScrollLock();
    this.restoreFocus();
  }

  protected openCheckout(): void {
    this.cartOpen.set(false);
    this.checkoutOpen.set(true);
    this.setBodyScrollLocked(true);
  }

  protected closeCheckout(): void {
    this.checkoutOpen.set(false);
    this.syncBodyScrollLock();
    this.restoreFocus();
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
    this.restoreFocus();
  }

  protected returnToMenuFromConfirmation(): void {
    this.closeConfirmation();
    this.scrollToMenu();
  }

  protected onLogoError(): void {
    this.logoFailed.set(true);
  }

  protected tableBadgeLabel(): string {
    const table = this.resolvedTable();
    if (!table) {
      return '';
    }

    const zone = table.zone?.trim();
    return zone ? `${table.tableName} · ${zone}` : table.tableName;
  }

  private resolveTableFromQuery(slug: string): void {
    const token = this.route.snapshot.queryParamMap?.get('table')?.trim();
    if (!token) {
      this.cart.clearTableSession();
      this.tableResolveState.set('idle');
      this.tableResolveError.set(null);
      return;
    }

    this.tableResolveState.set('loading');
    this.tableResolveError.set(null);

    this.tablesApi.resolveTable(slug, token).subscribe({
      next: (resolved) => {
        this.cart.setTableSession(resolved, token);
        this.tableResolveState.set('ready');
      },
      error: () => {
        this.cart.clearTableSession();
        this.tableResolveState.set('error');
        this.tableResolveError.set(this.ui().publicMenuTableInvalid);
      },
    });
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
          this.activeCategoryId.set(PUBLIC_MENU_ALL_CATEGORIES_ID);
          this.searchQuery.set('');
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

  private matchesSearch(
    item: PublicMenuItem,
    query: string,
    categories: PublicMenuCategory[],
  ): boolean {
    const category = categories.find((entry) => entry.id === item.categoryId);
    const haystack = [
      item.nameAr,
      item.nameEn,
      item.descriptionAr,
      item.descriptionEn,
      category?.nameAr,
      category?.nameEn,
    ]
      .filter((value): value is string => Boolean(value?.trim()))
      .join(' ')
      .toLowerCase();

    return haystack.includes(query);
  }

  private showFloatingCartTemporarily(): void {
    this.floatingCartVisible.set(true);

    if (this.floatingCartTimer) {
      clearTimeout(this.floatingCartTimer);
    }

    this.floatingCartTimer = setTimeout(() => {
      this.floatingCartVisible.set(false);
      this.floatingCartTimer = null;
    }, 3000);
  }

  private hideFloatingCart(): void {
    if (this.floatingCartTimer) {
      clearTimeout(this.floatingCartTimer);
      this.floatingCartTimer = null;
    }

    this.floatingCartVisible.set(false);
  }

  private showToast(message: string): void {
    this.toastMessage.set(message);
    this.toastVisible.set(true);

    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }

    this.toastTimer = setTimeout(() => {
      this.toastVisible.set(false);
      this.toastTimer = null;
    }, 1600);
  }

  private setBodyScrollLocked(locked: boolean): void {
    document.body.style.overflow = locked ? 'hidden' : '';
  }

  private syncBodyScrollLock(): void {
    this.setBodyScrollLocked(this.overlayOpen());
  }

  private restoreFocus(): void {
    this.lastFocusedElement?.focus();
    this.lastFocusedElement = null;
  }
}

declare const ngDevMode: boolean | undefined;

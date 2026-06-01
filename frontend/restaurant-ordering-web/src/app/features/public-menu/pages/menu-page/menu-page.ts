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
import {
  PublicMenuApiService,
  type PublicMenuLoadError,
} from '../../data-access/public-menu-api';
import { MOCK_IMAGE_FALLBACK } from '../../data-access/public-menu-mock.data';
import type { PublicMenuPageData } from '../../models/public-menu.models';

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
  ],
  templateUrl: './menu-page.html',
  styleUrl: './menu-page.scss',
})
export class MenuPage {
  private readonly route = inject(ActivatedRoute);
  private readonly menuApi = inject(PublicMenuApiService);
  protected readonly localeService = inject(LocaleService);
  private readonly themeService = inject(RestaurantThemeService);

  private readonly menuSection = viewChild<ElementRef<HTMLElement>>('menuSection');

  protected readonly pageState = signal<PageState>('loading');
  protected readonly menuData = signal<PublicMenuPageData | null>(null);
  protected readonly activeCategoryId = signal<string | null>(null);
  protected readonly cartQuantities = signal<Record<string, number>>({});
  protected readonly logoFailed = signal(false);

  protected readonly imageFallback = MOCK_IMAGE_FALLBACK;

  protected readonly restaurantName = computed(() => {
    const restaurant = this.menuData()?.restaurant;
    if (!restaurant) {
      return '—';
    }

    return this.localeService.pickText(
      { ar: restaurant.nameAr, en: restaurant.nameEn },
      restaurant.nameAr,
    );
  });

  protected readonly cartCount = computed(() =>
    Object.values(this.cartQuantities()).reduce((total, qty) => total + qty, 0),
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
    const slug = this.route.snapshot.paramMap.get('slug') ?? '';

    if (!slug.trim()) {
      this.pageState.set('not-found');
      return;
    }

    this.loadMenu(slug);
  }

  protected reload(): void {
    const slug = this.route.snapshot.paramMap.get('slug') ?? '';
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

  protected updateQuantity(itemId: string, quantity: number): void {
    this.cartQuantities.update((current) => ({
      ...current,
      [itemId]: quantity,
    }));
  }

  protected quantityFor(itemId: string): number {
    return this.cartQuantities()[itemId] ?? 0;
  }

  protected onLogoError(): void {
    this.logoFailed.set(true);
  }

  private loadMenu(slug: string): void {
    this.pageState.set('loading');

    this.menuApi
      .getMenuBySlug(slug)
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
}

declare const ngDevMode: boolean | undefined;

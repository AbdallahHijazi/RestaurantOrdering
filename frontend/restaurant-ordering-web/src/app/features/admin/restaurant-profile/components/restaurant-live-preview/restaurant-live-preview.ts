import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { LocaleService, type SupportedLocale } from '../../../../../core/localization/locale';
import { RestaurantThemeService } from '../../../../../core/theme/restaurant-theme';
import { EmptyState } from '../../../../../shared/ui/empty-state/empty-state';
import { CategoryNavigation } from '../../../../public-menu/components/category-navigation/category-navigation';
import { MenuItemCard } from '../../../../public-menu/components/menu-item-card/menu-item-card';
import { RestaurantCoverHero } from '../../../../public-menu/components/restaurant-cover-hero/restaurant-cover-hero';
import {
  MOCK_IMAGE_FALLBACK,
  MOCK_PUBLIC_MENU,
} from '../../../../public-menu/data-access/public-menu-mock.data';
import type {
  PublicMenuCategory,
  RestaurantPublicProfile,
} from '../../../../public-menu/models/public-menu.models';
import type { RestaurantProfilePreviewData } from '../../models/restaurant-profile.models';

type PreviewViewport = 'desktop' | 'tablet' | 'mobile';

@Component({
  selector: 'app-restaurant-live-preview',
  imports: [NgTemplateOutlet, RestaurantCoverHero, CategoryNavigation, MenuItemCard, EmptyState],
  templateUrl: './restaurant-live-preview.html',
  styleUrl: './restaurant-live-preview.scss',
})
export class RestaurantLivePreview {
  readonly preview = input.required<RestaurantProfilePreviewData>();

  protected readonly localeService = inject(LocaleService);
  private readonly themeService = inject(RestaurantThemeService);

  protected readonly viewport = signal<PreviewViewport>('desktop');
  protected readonly previewLocale = signal<SupportedLocale>('ar');
  protected readonly fullPreviewOpen = signal(false);
  protected readonly activeCategoryId = signal(MOCK_PUBLIC_MENU.categories[0]?.id ?? '');
  protected readonly previewQuantities = signal<Record<string, number>>({});

  protected readonly previewCategories = MOCK_PUBLIC_MENU.categories;
  protected readonly imageFallback = MOCK_IMAGE_FALLBACK;

  protected readonly filteredPreviewItems = computed(() =>
    MOCK_PUBLIC_MENU.items.filter((item) => item.categoryId === this.activeCategoryId()),
  );

  protected readonly restaurantProfile = computed<RestaurantPublicProfile>(() => {
    const data = this.preview();
    return {
      slug: data.slug,
      nameAr: data.nameAr,
      nameEn: data.nameEn,
      descriptionAr: data.descriptionAr,
      descriptionEn: data.descriptionEn,
      logoUrl: data.logoUrl,
      coverImageUrl: data.coverImageUrl,
      primaryAccentColor: data.primaryAccentColor,
      countryCode: data.countryCode,
      currencyCode: data.currencyCode,
      timeZone: data.timeZone,
      phoneNumber: data.phoneNumber,
      whatsAppNumber: data.whatsAppNumber,
      addressAr: data.addressAr,
      addressEn: data.addressEn,
      isOpen: true,
    };
  });

  constructor() {
    effect(() => {
      this.themeService.applyAccent(this.preview().primaryAccentColor);
    });
  }

  protected setViewport(mode: PreviewViewport): void {
    this.viewport.set(mode);
  }

  protected setPreviewLocale(locale: SupportedLocale): void {
    this.previewLocale.set(locale);
    this.localeService.setLocale(locale);
  }

  protected openFullPreview(): void {
    this.fullPreviewOpen.set(true);
  }

  protected closeFullPreview(): void {
    this.fullPreviewOpen.set(false);
  }

  protected selectCategory(categoryId: string): void {
    this.activeCategoryId.set(categoryId);
  }

  protected updatePreviewQuantity(itemId: string, quantity: number): void {
    this.previewQuantities.update((current) => ({ ...current, [itemId]: quantity }));
  }

  protected quantityFor(itemId: string): number {
    return this.previewQuantities()[itemId] ?? 0;
  }

  protected labelForCategory(category: PublicMenuCategory): string {
    return this.localeService.pickText(
      { ar: category.nameAr, en: category.nameEn },
      category.nameAr,
    );
  }
}

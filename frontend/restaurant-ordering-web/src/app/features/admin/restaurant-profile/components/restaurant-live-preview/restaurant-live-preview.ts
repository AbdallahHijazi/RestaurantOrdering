import { isPlatformBrowser, NgTemplateOutlet } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  computed,
  effect,
  inject,
  input,
  PLATFORM_ID,
  signal,
  viewChild,
} from '@angular/core';
import { attachElementToBody } from '../../../../../shared/utils/overlay-body-portal';
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
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly previewOverlay = viewChild<ElementRef<HTMLElement>>('previewOverlay');
  private detachPreviewPortal: (() => void) | null = null;

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

    effect(() => {
      if (!isPlatformBrowser(this.platformId)) {
        return;
      }

      const open = this.fullPreviewOpen();
      const overlay = this.previewOverlay();

      if (!open) {
        this.teardownPreviewPortal();
        return;
      }

      if (!overlay) {
        return;
      }

      const host = overlay.nativeElement;
      if (host.parentElement !== document.body) {
        this.detachPreviewPortal?.();
        this.detachPreviewPortal = attachElementToBody(host);
        document.body.classList.add('order-modal-scroll-lock');
      }
    });

    this.destroyRef.onDestroy(() => {
      this.teardownPreviewPortal();
    });
  }

  private teardownPreviewPortal(): void {
    this.detachPreviewPortal?.();
    this.detachPreviewPortal = null;
    document.body.classList.remove('order-modal-scroll-lock');
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.fullPreviewOpen()) {
      this.closeFullPreview();
    }
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
    this.teardownPreviewPortal();
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

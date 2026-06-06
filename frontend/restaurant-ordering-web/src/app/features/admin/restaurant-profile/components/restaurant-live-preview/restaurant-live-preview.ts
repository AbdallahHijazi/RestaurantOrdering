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
  output,
  PLATFORM_ID,
  signal,
  viewChild,
} from '@angular/core';
import { attachElementToBody } from '../../../../../shared/utils/overlay-body-portal';
import { LocaleService, type SupportedLocale } from '../../../../../core/localization/locale';
import { RestaurantThemeService } from '../../../../../core/theme/restaurant-theme';
import { EmptyState } from '../../../../../shared/ui/empty-state/empty-state';
import { ErrorState } from '../../../../../shared/ui/error-state/error-state';
import { LoadingState } from '../../../../../shared/ui/loading-state/loading-state';
import { CategoryNavigation } from '../../../../public-menu/components/category-navigation/category-navigation';
import { MenuItemCard } from '../../../../public-menu/components/menu-item-card/menu-item-card';
import { RestaurantCoverHero } from '../../../../public-menu/components/restaurant-cover-hero/restaurant-cover-hero';
import { MOCK_IMAGE_FALLBACK } from '../../../../public-menu/data-access/public-menu-mock.data';
import type {
  PublicMenuCategory,
  PublicMenuItem,
  RestaurantPublicProfile,
} from '../../../../public-menu/models/public-menu.models';
import type {
  ProfilePreviewMenuState,
  RestaurantProfilePreviewData,
} from '../../models/restaurant-profile.models';

type PreviewViewport = 'desktop' | 'tablet' | 'mobile';

@Component({
  selector: 'app-restaurant-live-preview',
  imports: [
    NgTemplateOutlet,
    RestaurantCoverHero,
    CategoryNavigation,
    MenuItemCard,
    EmptyState,
    ErrorState,
    LoadingState,
  ],
  templateUrl: './restaurant-live-preview.html',
  styleUrl: './restaurant-live-preview.scss',
  host: {
    '[class.live-preview-host--studio]': 'variant() === "studio"',
  },
})
export class RestaurantLivePreview {
  readonly preview = input.required<RestaurantProfilePreviewData>();
  readonly menuState = input<ProfilePreviewMenuState>('idle');
  readonly categories = input<PublicMenuCategory[]>([]);
  readonly items = input<PublicMenuItem[]>([]);
  readonly variant = input<'default' | 'studio'>('default');
  readonly previewSyncStatus = input<'synced' | 'unsaved'>('synced');

  readonly refreshPreview = output<void>();

  protected readonly localeService = inject(LocaleService);
  private readonly themeService = inject(RestaurantThemeService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly previewOverlay = viewChild<ElementRef<HTMLElement>>('previewOverlay');
  private detachPreviewPortal: (() => void) | null = null;

  protected readonly viewport = signal<PreviewViewport>('desktop');
  protected readonly previewLocale = signal<SupportedLocale>('ar');
  protected readonly fullPreviewOpen = signal(false);
  protected readonly activeCategoryId = signal('');
  protected readonly previewQuantities = signal<Record<string, number>>({});

  protected readonly imageFallback = MOCK_IMAGE_FALLBACK;

  protected readonly previewCategories = computed(() => this.categories());

  protected readonly filteredPreviewItems = computed(() =>
    this.items().filter((item) => item.categoryId === this.activeCategoryId()),
  );

  protected readonly showMenuCatalog = computed(
    () => this.menuState() === 'loaded' || this.menuState() === 'demo',
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
      const categories = this.previewCategories();
      const current = this.activeCategoryId();
      if (!categories.length) {
        this.activeCategoryId.set('');
        return;
      }

      if (!categories.some((category) => category.id === current)) {
        this.activeCategoryId.set(categories[0]?.id ?? '');
      }
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
  }

  protected pickPreviewText(
    text: { ar?: string | null; en?: string | null } | null | undefined,
    fallback = '—',
  ): string {
    return this.localeService.pickTextForLocale(this.previewLocale(), text, fallback);
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
    return this.pickPreviewText(
      { ar: category.nameAr, en: category.nameEn },
      category.nameAr,
    );
  }

  protected requestRefresh(): void {
    this.refreshPreview.emit();
  }
}

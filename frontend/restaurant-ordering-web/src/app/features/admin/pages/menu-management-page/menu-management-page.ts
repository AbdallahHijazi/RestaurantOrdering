import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ModalShell } from '../../../../shared/components/order-modal-shell/order-modal-shell';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { finalize, forkJoin, of, switchMap, type Observable } from 'rxjs';
import { resolveApiAssetUrl } from '../../../../core/config/resolve-api-asset-url';
import { DirectionService } from '../../../../core/localization/direction.service';
import { LocaleApiService } from '../../../../core/localization/locale-api.service';
import { LocaleService } from '../../../../core/localization/locale';
import {
  createImagePreviewUrl,
  revokeImagePreviewUrl,
  validateImageFile,
} from '../../restaurant-profile/data-access/image-preview.util';
import { AdminMenuService } from '../../data-access/admin-menu.service';
import { MenuManagementMealCard } from './components/menu-management-meal-card/menu-management-meal-card';
import { FloatingNotificationPill } from '../../../../shared/ui/floating-notification-pill/floating-notification-pill';
import {
  formatPrimaryLanguageLabel,
  primarySortName,
  resolveCatalogSaveContent,
  resolveEditPrimaryContent,
  resolvePrimaryLocaleContent,
} from './menu-catalog.util';
import {
  ALL_MENU_ITEMS_FILTER,
  type AdminCategory,
  type AdminMenuItem,
  type SaveCatalogCategoryRequest,
  type SaveCatalogMenuItemRequest,
  type UploadedMediaFile,
} from '../../data-access/admin-menu.models';

type PageState = 'loading' | 'ready' | 'error' | 'missing-context';
type ModalKind = 'category' | 'item' | 'deleteCategory' | 'deleteItem' | null;
type AvailabilityFilter = 'all' | 'available' | 'unavailable';
type DropPosition = 'before' | 'after';

@Component({
  selector: 'app-menu-management-page',
  imports: [ReactiveFormsModule, ModalShell, MenuManagementMealCard, FloatingNotificationPill],
  templateUrl: './menu-management-page.html',
  styleUrls: [
    './menu-management-page.scss',
    './menu-management-page.reorder.scss',
    './menu-management-page.modal.scss',
  ],
})
export class MenuManagementPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly menuService = inject(AdminMenuService);
  private readonly localeApi = inject(LocaleApiService);
  private readonly directionService = inject(DirectionService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly locale = inject(LocaleService);
  protected readonly allItemsFilter = ALL_MENU_ITEMS_FILTER;

  protected readonly pageState = signal<PageState>('loading');
  protected readonly itemsState = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly categories = signal<AdminCategory[]>([]);
  protected readonly menuItems = signal<AdminMenuItem[]>([]);
  protected readonly selectedCategoryId = signal<string>(ALL_MENU_ITEMS_FILTER);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly listErrorMessage = signal<string | null>(null);
  protected readonly itemsErrorMessage = signal<string | null>(null);
  protected readonly modalKind = signal<ModalKind>(null);
  protected readonly modalSubmitting = signal(false);
  protected readonly modalErrorMessage = signal<string | null>(null);
  protected readonly editingCategory = signal<AdminCategory | null>(null);
  protected readonly editingItem = signal<AdminMenuItem | null>(null);
  protected readonly deletingCategory = signal<AdminCategory | null>(null);
  protected readonly deletingItem = signal<AdminMenuItem | null>(null);
  protected readonly availabilityBusyId = signal<string | null>(null);
  protected readonly categoryReorderMode = signal(false);
  protected readonly itemReorderMode = signal(false);
  protected readonly categoryOrderBusy = signal(false);
  protected readonly itemOrderBusy = signal(false);
  protected readonly draggingCategoryId = signal<string | null>(null);
  protected readonly draggingItemId = signal<string | null>(null);
  protected readonly categoryDropTargetId = signal<string | null>(null);
  protected readonly categoryDropPosition = signal<DropPosition | null>(null);
  protected readonly itemDropTargetId = signal<string | null>(null);
  protected readonly itemDropPosition = signal<DropPosition | null>(null);
  protected readonly reorderErrorMessage = signal<string | null>(null);
  protected readonly imagePreviewUrl = signal<string | null>(null);
  protected readonly imageValidationError = signal<string | null>(null);
  protected readonly pendingImageFile = signal<File | null>(null);
  protected readonly uploadedMedia = signal<UploadedMediaFile | null>(null);
  protected readonly failedImageIds = signal<ReadonlySet<string>>(new Set());
  protected readonly defaultLocale = signal('ar');
  protected readonly primaryLanguageLabel = signal('Arabic');
  protected readonly catalogEditWarning = signal(false);

  protected readonly categoryForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    description: ['', [Validators.maxLength(1000)]],
    displayOrder: [0, [Validators.required, Validators.min(0)]],
    isActive: [true],
  });

  protected readonly itemForm = this.fb.group(
    {
      categoryId: ['', [Validators.required]],
      name: ['', [Validators.required, Validators.maxLength(200)]],
      description: ['', [Validators.maxLength(1000)]],
      price: [0, [Validators.required, Validators.min(0)]],
      discountPrice: [null as number | null],
      displayOrder: [0, [Validators.required, Validators.min(0)]],
      isAvailable: [true],
      isActive: [true],
    },
    { validators: [discountNotGreaterThanPriceValidator] },
  );

  protected readonly searchQuery = signal('');
  protected readonly availabilityFilter = signal<AvailabilityFilter>('all');
  private categoryOrderSnapshot: AdminCategory[] | null = null;
  private itemOrderSnapshot: AdminMenuItem[] | null = null;
  private reorderAnimationFrame: number | null = null;
  protected readonly filteredMenuItems = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const availability = this.availabilityFilter();
    const items = this.menuItems();

    return items.filter((item) => {
      if (availability === 'available' && !item.isAvailable) {
        return false;
      }
      if (availability === 'unavailable' && item.isAvailable) {
        return false;
      }
      if (!query) {
        return true;
      }
      const name = this.displayItemName(item).toLowerCase();
      const category = this.categoryNameById(item.categoryId).toLowerCase();
      return name.includes(query) || category.includes(query);
    });
  });

  protected readonly allItemsCount = computed(() =>
    this.categories().reduce((total, category) => total + category.itemCount, 0),
  );

  protected readonly isFilteredEmpty = computed(
    () =>
      this.itemsState() === 'ready' &&
      this.menuItems().length > 0 &&
      this.filteredMenuItems().length === 0,
  );

  protected readonly canReorderItems = computed(
    () =>
      this.itemsState() === 'ready' &&
      this.selectedCategoryId() !== ALL_MENU_ITEMS_FILTER &&
      this.menuItems().length > 1 &&
      !this.searchQuery().trim() &&
      this.availabilityFilter() === 'all',
  );

  protected readonly selectedCategoryLabel = computed(() => {
    const selected = this.selectedCategoryId();
    if (selected === ALL_MENU_ITEMS_FILTER) {
      return this.locale.uiText('adminMenuAllItems');
    }

    const category = this.categories().find((entry) => entry.id === selected);
    return category
      ? this.displayCategoryName(category)
      : this.locale.uiText('adminMenuSelectCategory');
  });

  constructor() {
    this.loadLocaleSettings();
    this.loadCategories();
  }

  protected catalogPrimaryNotice(): string {
    return this.locale.uiText('adminMenuCatalogPrimaryNotice');
  }

  protected catalogPrimaryLanguageLine(): string {
    return this.locale
      .uiText('adminMenuCatalogPrimaryLanguage')
      .replace('{language}', this.primaryLanguageLabel());
  }

  private loadLocaleSettings(): void {
    const restaurantId = this.menuService.getRestaurantId();
    if (!restaurantId) {
      return;
    }

    this.localeApi
      .getRestaurantLocaleSettings(restaurantId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (settings) => {
          this.defaultLocale.set(settings.defaultLocale.trim().toLowerCase() || 'ar');
          this.primaryLanguageLabel.set(formatPrimaryLanguageLabel(settings));
          this.directionService.registerLocales(settings.availableLocales);
        },
      });
  }

  protected loadCategories(): void {
    this.successMessage.set(null);

    if (!this.menuService.getRestaurantId()) {
      this.pageState.set('missing-context');
      this.categories.set([]);
      this.menuItems.set([]);
      return;
    }

    this.pageState.set('loading');
    this.listErrorMessage.set(null);

    this.menuService
      .listCategories()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (categories) => {
          this.categories.set(this.sortCategories(categories));
          this.pageState.set('ready');
          this.ensureSelectedCategoryStillValid();
          this.loadMenuItems();
        },
        error: (error) => {
          this.categories.set([]);
          this.listErrorMessage.set(this.mapListError(error));
          this.pageState.set('error');
        },
      });
  }

  protected loadMenuItems(): void {
    if (!this.menuService.getRestaurantId()) {
      this.menuItems.set([]);
      this.itemsState.set('ready');
      return;
    }

    this.itemsState.set('loading');
    this.itemsErrorMessage.set(null);

    const categoryId =
      this.selectedCategoryId() === ALL_MENU_ITEMS_FILTER
        ? null
        : this.selectedCategoryId();

    this.menuService
      .listMenuItems(categoryId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => {
          this.menuItems.set(this.sortItems(items));
          this.itemsState.set('ready');
        },
        error: (error) => {
          this.menuItems.set([]);
          this.itemsErrorMessage.set(this.mapListError(error));
          this.itemsState.set('error');
        },
      });
  }

  protected selectCategory(categoryId: string): void {
    if (this.categoryReorderMode() || this.itemReorderMode()) {
      return;
    }
    this.selectedCategoryId.set(categoryId);
    this.searchQuery.set('');
    this.loadMenuItems();
  }

  protected onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
  }

  protected onAvailabilityFilterChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (value === 'all' || value === 'available' || value === 'unavailable') {
      this.availabilityFilter.set(value);
    }
  }

  protected toggleCategoryReorder(): void {
    if (this.categoryOrderBusy()) {
      return;
    }

    this.cancelItemDrag();
    this.itemReorderMode.set(false);
    this.reorderErrorMessage.set(null);
    this.categoryReorderMode.update((active) => !active);
    if (!this.categoryReorderMode()) {
      this.cancelCategoryDrag();
    }
  }

  protected toggleItemReorder(): void {
    if (this.itemOrderBusy() || (!this.itemReorderMode() && !this.canReorderItems())) {
      return;
    }

    this.cancelCategoryDrag();
    this.categoryReorderMode.set(false);
    this.reorderErrorMessage.set(null);
    this.itemReorderMode.update((active) => !active);
    if (!this.itemReorderMode()) {
      this.cancelItemDrag();
    }
  }

  protected onCategoryPointerDown(event: PointerEvent, categoryId: string): void {
    if ((event.pointerType === 'mouse' && event.button !== 0) || !this.beginCategoryDrag(categoryId)) {
      return;
    }
    if (event.pointerType === 'mouse') {
      event.preventDefault();
    }
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  }

  protected onCategoryPointerMove(event: PointerEvent): void {
    if (!this.draggingCategoryId()) {
      return;
    }
    this.autoScrollCategoryStrip(event);
    const target = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>('[data-category-reorder-id]');
    const categoryId = target?.dataset['categoryReorderId'];
    if (categoryId) {
      this.previewCategoryMove(categoryId);
    }
  }

  protected onCategoryPointerUp(): void {
    if (this.draggingCategoryId()) {
      this.finishCategoryDrag();
    }
  }

  protected onCategoryPointerCancel(): void {
    this.cancelCategoryDrag();
  }

  protected onItemPointerDown(event: PointerEvent, itemId: string): void {
    if ((event.pointerType === 'mouse' && event.button !== 0) || !this.beginItemDrag(itemId)) {
      return;
    }
    event.preventDefault();
  }

  protected onItemPointerMove(event: PointerEvent): void {
    if (!this.draggingItemId()) {
      return;
    }
    const target = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>('[data-item-reorder-id]');
    const itemId = target?.dataset['itemReorderId'];
    if (itemId) {
      this.previewItemMove(itemId);
    }
  }

  protected onItemPointerUp(): void {
    if (this.draggingItemId()) {
      this.finishItemDrag();
    }
  }

  protected onItemPointerCancel(): void {
    this.cancelItemDrag();
  }


  private captureReorderPositions(
  selector: string,
  dataKey: 'categoryReorderId' | 'itemReorderId',
  ): Map<string, DOMRect> {
    if (this.reorderAnimationFrame !== null) {
      cancelAnimationFrame(this.reorderAnimationFrame);
      this.reorderAnimationFrame = null;
    }

    const positions = new Map<string, DOMRect>();

    document.querySelectorAll<HTMLElement>(selector).forEach((element) => {
      element
        .getAnimations()
        .filter((animation) => animation.id === 'menu-reorder-flip')
        .forEach((animation) => animation.cancel());

      const id = element.dataset[dataKey];

      if (id) {
        positions.set(id, element.getBoundingClientRect());
      }
    });

    return positions;
  }

private animateReorder(
    selector: string,
    dataKey: 'categoryReorderId' | 'itemReorderId',
    previousPositions: Map<string, DOMRect>,
  ): void {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    this.reorderAnimationFrame = requestAnimationFrame(() => {
      this.reorderAnimationFrame = null;

      document.querySelectorAll<HTMLElement>(selector).forEach((element) => {
        const id = element.dataset[dataKey];

        if (!id) {
          return;
        }

        const previous = previousPositions.get(id);

        if (!previous) {
          return;
        }

        const current = element.getBoundingClientRect();

        const deltaX = previous.left - current.left;
        const deltaY = previous.top - current.top;

        if (Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5) {
          return;
        }

        element.animate(
          [
            {
              transform: `translate3d(${deltaX}px, ${deltaY}px, 0)`,
            },
            {
              transform: 'translate3d(0, 0, 0)',
            },
          ],
          {
            id: 'menu-reorder-flip',
            duration: 320,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            fill: 'both',
          },
        );
      });
    });
  }

  private beginCategoryDrag(categoryId: string): boolean {
    if (!this.categoryReorderMode() || this.categoryOrderBusy()) {
      return false;
    }
    if (!this.categoryOrderSnapshot) {
      this.categoryOrderSnapshot = [...this.categories()];
    }
    this.draggingCategoryId.set(categoryId);
    return true;
  }

  private previewCategoryMove(targetId: string): void {
    const sourceId = this.draggingCategoryId();

    if (!sourceId || sourceId === targetId) {
      return;
    }

    const entries = this.categories();

    const sourceIndex = entries.findIndex((entry) => entry.id === sourceId);
    const targetIndex = entries.findIndex((entry) => entry.id === targetId);

    if (sourceIndex < 0 || targetIndex < 0) {
      return;
    }

    const previousPositions = this.captureReorderPositions(
      '[data-category-reorder-id]',
      'categoryReorderId',
    );

    this.categoryDropTargetId.set(targetId);

    this.categoryDropPosition.set(
      sourceIndex < targetIndex ? 'after' : 'before',
    );

    this.categories.set(
      this.moveEntry(entries, sourceId, targetId),
    );

    this.animateReorder(
      '[data-category-reorder-id]',
      'categoryReorderId',
      previousPositions,
    );
  }

  protected finishCategoryDrag(): void {
    const previous = this.categoryOrderSnapshot;
    this.categoryOrderSnapshot = null;
    this.draggingCategoryId.set(null);
    this.categoryDropTargetId.set(null);
    this.categoryDropPosition.set(null);
    if (!previous || this.sameOrder(previous, this.categories())) {
      return;
    }

    const reordered = this.categories().map((category, index) => ({
      ...category,
      displayOrder: index + 1,
    }));
    this.categories.set(reordered);
    this.persistCategoryOrder(previous, reordered);
  }

  private cancelCategoryDrag(): void {
    if (this.categoryOrderSnapshot) {
      this.categories.set(this.categoryOrderSnapshot);
    }
    this.categoryOrderSnapshot = null;
    this.draggingCategoryId.set(null);
    this.categoryDropTargetId.set(null);
    this.categoryDropPosition.set(null);
  }

  private beginItemDrag(itemId: string): boolean {
    if (!this.itemReorderMode() || this.itemOrderBusy()) {
      return false;
    }
    if (!this.itemOrderSnapshot) {
      this.itemOrderSnapshot = [...this.menuItems()];
    }
    this.draggingItemId.set(itemId);
    return true;
  }

  private previewItemMove(targetId: string): void {
    const sourceId = this.draggingItemId();

    if (!sourceId || sourceId === targetId) {
      return;
    }

    const entries = this.menuItems();

    const sourceIndex = entries.findIndex((entry) => entry.id === sourceId);
    const targetIndex = entries.findIndex((entry) => entry.id === targetId);

    if (sourceIndex < 0 || targetIndex < 0) {
      return;
    }

    const previousPositions = this.captureReorderPositions(
      '[data-item-reorder-id]',
      'itemReorderId',
    );

    this.itemDropTargetId.set(targetId);

    this.itemDropPosition.set(
      sourceIndex < targetIndex ? 'after' : 'before',
    );

    this.menuItems.set(
      this.moveEntry(entries, sourceId, targetId),
    );

    this.animateReorder(
      '[data-item-reorder-id]',
      'itemReorderId',
      previousPositions,
    );
  }

  protected finishItemDrag(): void {
    const previous = this.itemOrderSnapshot;
    this.itemOrderSnapshot = null;
    this.draggingItemId.set(null);
    this.itemDropTargetId.set(null);
    this.itemDropPosition.set(null);
    if (!previous || this.sameOrder(previous, this.menuItems())) {
      return;
    }

    const reordered = this.menuItems().map((item, index) => ({
      ...item,
      displayOrder: index + 1,
    }));
    this.menuItems.set(reordered);
    this.persistItemOrder(previous, reordered);
  }

  private cancelItemDrag(): void {
    if (this.itemOrderSnapshot) {
      this.menuItems.set(this.itemOrderSnapshot);
    }
    this.itemOrderSnapshot = null;
    this.draggingItemId.set(null);
    this.itemDropTargetId.set(null);
    this.itemDropPosition.set(null);
  }

  protected dismissPageNotification(): void {
    this.successMessage.set(null);
    this.reorderErrorMessage.set(null);
  }

  protected showingMealsCountLabel(): string {
    const shown = this.filteredMenuItems().length;
    const total = this.menuItems().length;
    return this.locale
      .uiText('adminMenuShowingCount')
      .replace('{shown}', String(shown))
      .replace('{total}', String(total));
  }

  protected hasMeaningfulDiscount(item: AdminMenuItem): boolean {
    const discount = item.discountPrice;
    return discount != null && discount > 0 && discount < item.price;
  }

  protected availabilityLabel(item: AdminMenuItem): string {
    if (item.isAvailable) {
      return this.locale.uiText('adminMenuAvailableNow');
    }

    return this.locale.uiText('adminMenuUnavailable');
  }

  protected openCreateCategory(): void {
    this.resetModalState();
    this.editingCategory.set(null);
    this.catalogEditWarning.set(false);
    this.categoryForm.reset({
      name: '',
      description: '',
      displayOrder: this.categories().length + 1,
      isActive: true,
    });
    this.modalErrorMessage.set(null);
    this.modalKind.set('category');
  }

  protected openEditCategory(category: AdminCategory): void {
    this.resetModalState();
    this.editingCategory.set(category);
    const resolved = resolveEditPrimaryContent(this.defaultLocale(), category);
    this.catalogEditWarning.set(resolved.missingPrimaryLocale);
    this.categoryForm.reset({
      name: resolved.content.name,
      description: resolved.content.description,
      displayOrder: category.displayOrder,
      isActive: category.isActive,
    });
    this.modalErrorMessage.set(null);
    this.modalKind.set('category');
  }

  protected openDeleteCategory(category: AdminCategory): void {
    this.resetModalState();
    this.deletingCategory.set(category);
    this.modalErrorMessage.set(null);
    this.modalKind.set('deleteCategory');
  }

  protected openCreateItem(): void {
    this.resetModalState();
    const selected = this.selectedCategoryId();
    this.editingItem.set(null);
    this.catalogEditWarning.set(false);
    this.resetItemFormState();
    this.itemForm.reset({
      categoryId:
        selected === ALL_MENU_ITEMS_FILTER
          ? (this.categories()[0]?.id ?? '')
          : selected,
      name: '',
      description: '',
      price: 0,
      discountPrice: null,
      displayOrder: this.menuItems().length + 1,
      isAvailable: true,
      isActive: true,
    });
    this.modalErrorMessage.set(null);
    this.modalKind.set('item');
  }

  protected openEditItem(item: AdminMenuItem): void {
    this.resetModalState();
    this.editingItem.set(item);
    this.resetItemFormState();
    this.uploadedMedia.set(
      item.imageFileId
        ? {
            id: item.imageFileId,
            restaurantId: item.restaurantId,
            fileName: '',
            fileUrl: item.imageUrl ?? '',
            contentType: '',
            fileSizeBytes: 0,
            createdAt: item.createdAt,
          }
        : null,
    );
    if (item.imageUrl) {
      this.imagePreviewUrl.set(resolveApiAssetUrl(item.imageUrl));
    }

    const resolved = resolveEditPrimaryContent(this.defaultLocale(), item);
    this.catalogEditWarning.set(resolved.missingPrimaryLocale);
    this.itemForm.reset({
      categoryId: item.categoryId,
      name: resolved.content.name,
      description: resolved.content.description,
      price: item.price,
      discountPrice: item.discountPrice ?? null,
      displayOrder: item.displayOrder,
      isAvailable: item.isAvailable,
      isActive: item.isActive,
    });
    this.modalErrorMessage.set(null);
    this.modalKind.set('item');
  }

  protected openDeleteItem(item: AdminMenuItem): void {
    this.resetModalState();
    this.deletingItem.set(item);
    this.modalErrorMessage.set(null);
    this.modalKind.set('deleteItem');
  }

  protected closeModal(): void {
    this.resetItemFormState();
    this.catalogEditWarning.set(false);
    this.modalKind.set(null);
    this.modalSubmitting.set(false);
    this.modalErrorMessage.set(null);
    this.editingCategory.set(null);
    this.editingItem.set(null);
    this.deletingCategory.set(null);
    this.deletingItem.set(null);
  }

  protected dismissModal(): void {
    this.closeModal();
  }

  protected submitCategory(): void {
    if (this.modalSubmitting()) {
      return;
    }

    this.categoryForm.markAllAsTouched();
    if (this.categoryForm.invalid) {
      return;
    }

    const request = this.toCategoryRequest(this.categoryForm.getRawValue());
    const editing = this.editingCategory();
    this.modalSubmitting.set(true);
    this.modalErrorMessage.set(null);

    const save$ = editing
      ? this.menuService.updateCatalogCategory(editing.id, request)
      : this.menuService.createCatalogCategory(request);

    save$
      .pipe(
        finalize(() => this.modalSubmitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (saved) => {
          this.categories.update((entries) =>
            this.sortCategories(
              editing
                ? entries.map((entry) => (entry.id === saved.id ? saved : entry))
                : [...entries, saved],
            ),
          );
          this.closeModal();
          this.showSuccessFeedback(
            this.locale.uiText(
              editing ? 'adminMenuCategoryUpdateSuccess' : 'adminMenuCategoryCreateSuccess',
            ),
          );
          this.loadMenuItems();
        },
        error: (error) => {
          this.modalErrorMessage.set(this.mapMutationError(error));
        },
      });
  }

  protected submitDeleteCategory(): void {
    const category = this.deletingCategory();
    if (!category || this.modalSubmitting()) {
      return;
    }

    this.modalSubmitting.set(true);
    this.modalErrorMessage.set(null);

    this.menuService
      .deleteCategory(category.id)
      .pipe(
        finalize(() => this.modalSubmitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.categories.update((entries) => entries.filter((entry) => entry.id !== category.id));
          if (this.selectedCategoryId() === category.id) {
            this.selectedCategoryId.set(ALL_MENU_ITEMS_FILTER);
          }
          this.closeModal();
          this.showSuccessFeedback(this.locale.uiText('adminMenuCategoryDeleteSuccess'));
          this.loadMenuItems();
        },
        error: (error) => {
          this.modalErrorMessage.set(this.mapMutationError(error));
          if (error instanceof HttpErrorResponse && error.status === 404) {
            this.loadCategories();
          }
        },
      });
  }

  protected submitItem(): void {
    if (this.modalSubmitting()) {
      return;
    }

    this.itemForm.markAllAsTouched();
    if (this.itemForm.invalid || this.imageValidationError()) {
      return;
    }

    const editing = this.editingItem();
    this.modalSubmitting.set(true);
    this.modalErrorMessage.set(null);

    this.ensureUploadedMedia$()
      .pipe(
        switchMap((media) => {
          const request = this.toItemRequest(
            this.itemForm.getRawValue(),
            media?.id ?? editing?.imageFileId ?? null,
          );
          return editing
            ? this.menuService.updateCatalogMenuItem(editing.id, request)
            : this.menuService.createCatalogMenuItem(request);
        }),
        finalize(() => this.modalSubmitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (saved) => {
          this.menuItems.update((entries) =>
            this.sortItems(
              editing
                ? entries.map((entry) => (entry.id === saved.id ? saved : entry))
                : [...entries, saved],
            ),
          );
          this.refreshCategoryCounts();
          this.closeModal();
          this.showSuccessFeedback(
            this.locale.uiText(
              editing ? 'adminMenuItemUpdateSuccess' : 'adminMenuItemCreateSuccess',
            ),
          );
        },
        error: (error) => {
          this.modalErrorMessage.set(this.mapMutationError(error));
        },
      });
  }

  protected submitDeleteItem(): void {
    const item = this.deletingItem();
    if (!item || this.modalSubmitting()) {
      return;
    }

    this.modalSubmitting.set(true);
    this.modalErrorMessage.set(null);

    this.menuService
      .deleteMenuItem(item.id)
      .pipe(
        finalize(() => this.modalSubmitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.menuItems.update((entries) => entries.filter((entry) => entry.id !== item.id));
          this.refreshCategoryCounts();
          this.closeModal();
          this.showSuccessFeedback(this.locale.uiText('adminMenuItemDeleteSuccess'));
        },
        error: (error) => {
          this.modalErrorMessage.set(this.mapMutationError(error));
          if (error instanceof HttpErrorResponse && error.status === 404) {
            this.loadMenuItems();
          }
        },
      });
  }

  protected onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';

    revokeImagePreviewUrl(this.imagePreviewUrl());
    this.pendingImageFile.set(null);
    this.uploadedMedia.set(null);
    this.imagePreviewUrl.set(null);
    this.imageValidationError.set(null);

    if (!file) {
      return;
    }

    const validation = validateImageFile(file);
    if (!validation.valid) {
      this.imageValidationError.set(this.mapImageValidationError(validation.reason));
      return;
    }

    const previewUrl = createImagePreviewUrl(file);
    this.pendingImageFile.set(file);
    this.imagePreviewUrl.set(previewUrl);
  }

  protected toggleAvailability(item: AdminMenuItem): void {
    if (this.availabilityBusyId() === item.id) {
      return;
    }

    this.availabilityBusyId.set(item.id);
    const request = this.toCatalogItemRequestFromExisting(item, { isAvailable: !item.isAvailable });

    this.menuService
      .updateCatalogMenuItem(item.id, request)
      .pipe(
        finalize(() => this.availabilityBusyId.set(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (updated) => {
          this.menuItems.update((entries) =>
            entries.map((entry) => (entry.id === updated.id ? updated : entry)),
          );
          this.showSuccessFeedback(this.locale.uiText('adminMenuItemUpdateSuccess'));
        },
        error: (error) => {
          this.dismissPageNotification();
          this.itemsErrorMessage.set(this.mapMutationError(error));
        },
      });
  }

  protected itemImageSrc(item: AdminMenuItem): string | null {
    if (this.failedImageIds().has(item.id)) {
      return null;
    }

    return resolveApiAssetUrl(item.imageUrl);
  }

  protected onItemImageError(itemId: string): void {
    this.failedImageIds.update((current) => new Set([...current, itemId]));
  }

  protected displayCategoryName(category: AdminCategory): string {
    return this.locale.pickResolvedTextForLocale(
      this.locale.contentLocale(),
      category.primaryName,
      { ar: category.nameAr, en: category.nameEn ?? category.nameAr },
      category.nameAr,
    );
  }

  protected displayItemName(item: AdminMenuItem): string {
    return this.locale.pickResolvedTextForLocale(
      this.locale.contentLocale(),
      item.primaryName,
      { ar: item.nameAr, en: item.nameEn ?? item.nameAr },
      item.nameAr,
    );
  }

  protected categoryNameById(categoryId: string): string {
    const category = this.categories().find((entry) => entry.id === categoryId);
    return category ? this.displayCategoryName(category) : '—';
  }

  protected modalTitle(): string {
    switch (this.modalKind()) {
      case 'category':
        return this.locale.uiText(
          this.editingCategory() ? 'adminMenuEditCategoryTitle' : 'adminMenuCreateCategoryTitle',
        );
      case 'item':
        return this.locale.uiText(
          this.editingItem() ? 'adminMenuEditItemTitle' : 'adminMenuCreateItemTitle',
        );
      case 'deleteCategory':
        return this.locale.uiText('adminMenuDeleteCategoryTitle');
      case 'deleteItem':
        return this.locale.uiText('adminMenuDeleteItemTitle');
      default:
        return '';
    }
  }

  private ensureUploadedMedia$(): Observable<UploadedMediaFile | null> {
    const existing = this.uploadedMedia();
    if (existing) {
      return of(existing);
    }

    const pending = this.pendingImageFile();
    if (!pending) {
      return of(null);
    }

    return this.menuService.uploadMedia(pending).pipe(
      switchMap((uploaded) => {
        this.uploadedMedia.set(uploaded);
        this.pendingImageFile.set(null);
        revokeImagePreviewUrl(this.imagePreviewUrl());
        this.imagePreviewUrl.set(resolveApiAssetUrl(uploaded.fileUrl));
        return of(uploaded);
      }),
    );
  }

  private resetModalState(): void {
    this.modalSubmitting.set(false);
    this.modalErrorMessage.set(null);
  }

  private resetItemFormState(): void {
    revokeImagePreviewUrl(this.imagePreviewUrl());
    this.imagePreviewUrl.set(null);
    this.pendingImageFile.set(null);
    this.uploadedMedia.set(null);
    this.imageValidationError.set(null);
  }

  private persistCategoryOrder(
    previous: AdminCategory[],
    reordered: AdminCategory[],
  ): void {
    const changed = reordered.filter(
      (category) =>
        previous.find((entry) => entry.id === category.id)?.displayOrder !== category.displayOrder,
    );
    if (changed.length === 0) {
      return;
    }

    this.categoryOrderBusy.set(true);
    this.successMessage.set(null);
    this.reorderErrorMessage.set(null);
    forkJoin(
      changed.map((category) =>
        this.menuService.updateCatalogCategory(
          category.id,
          this.toCatalogCategoryRequestFromExisting(category),
        ),
      ),
    )
      .pipe(
        finalize(() => this.categoryOrderBusy.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (saved) => {
          const savedById = new Map(saved.map((category) => [category.id, category]));
          this.categories.update((entries) =>
            entries.map((entry) => savedById.get(entry.id) ?? entry),
          );
          this.showSuccessFeedback(this.locale.uiText('adminMenuCategoryUpdateSuccess'));
        },
        error: (error) => {
          this.categories.set(previous);
          this.successMessage.set(null);
          this.reorderErrorMessage.set(this.mapMutationError(error));
        },
      });
  }

  private persistItemOrder(previous: AdminMenuItem[], reordered: AdminMenuItem[]): void {
    const changed = reordered.filter(
      (item) => previous.find((entry) => entry.id === item.id)?.displayOrder !== item.displayOrder,
    );
    if (changed.length === 0) {
      return;
    }

    this.itemOrderBusy.set(true);
    this.successMessage.set(null);
    this.reorderErrorMessage.set(null);
    forkJoin(
      changed.map((item) =>
        this.menuService.updateCatalogMenuItem(
          item.id,
          this.toCatalogItemRequestFromExisting(item, { displayOrder: item.displayOrder }),
        ),
      ),
    )
      .pipe(
        finalize(() => this.itemOrderBusy.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (saved) => {
          const savedById = new Map(saved.map((item) => [item.id, item]));
          this.menuItems.update((entries) =>
            entries.map((entry) => savedById.get(entry.id) ?? entry),
          );
          this.showSuccessFeedback(this.locale.uiText('adminMenuItemUpdateSuccess'));
        },
        error: (error) => {
          this.menuItems.set(previous);
          this.successMessage.set(null);
          this.reorderErrorMessage.set(this.mapMutationError(error));
        },
      });
  }

  private refreshCategoryCounts(): void {
    this.menuService
      .listCategories()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (categories) => {
          this.categories.set(this.sortCategories(categories));
        },
      });
  }

  private ensureSelectedCategoryStillValid(): void {
    const selected = this.selectedCategoryId();
    if (
      selected !== ALL_MENU_ITEMS_FILTER &&
      !this.categories().some((category) => category.id === selected)
    ) {
      this.selectedCategoryId.set(ALL_MENU_ITEMS_FILTER);
    }
  }

  private sortCategories(categories: AdminCategory[]): AdminCategory[] {
    const defaultLocale = this.defaultLocale();
    return [...categories].sort(
      (a, b) =>
        a.displayOrder - b.displayOrder ||
        primarySortName(defaultLocale, a).localeCompare(primarySortName(defaultLocale, b)),
    );
  }

  private sortItems(items: AdminMenuItem[]): AdminMenuItem[] {
    const defaultLocale = this.defaultLocale();
    return [...items].sort(
      (a, b) =>
        a.displayOrder - b.displayOrder ||
        primarySortName(defaultLocale, a).localeCompare(primarySortName(defaultLocale, b)),
    );
  }

  private toCategoryRequest(
    raw: ReturnType<typeof this.categoryForm.getRawValue>,
  ): SaveCatalogCategoryRequest {
    return {
      name: raw.name.trim(),
      description: raw.description.trim() || null,
      displayOrder: raw.displayOrder,
      isActive: raw.isActive,
    };
  }

  private toCatalogCategoryRequestFromExisting(
    category: AdminCategory,
  ): SaveCatalogCategoryRequest {
    const primary = resolveCatalogSaveContent(this.defaultLocale(), category);
    return {
      name: primary.name,
      description: primary.description || null,
      displayOrder: category.displayOrder,
      isActive: category.isActive,
    };
  }

  private toItemRequest(
    raw: ReturnType<typeof this.itemForm.getRawValue>,
    imageFileId: string | null,
  ): SaveCatalogMenuItemRequest {
    return {
      categoryId: raw.categoryId,
      imageFileId,
      name: raw.name.trim(),
      description: raw.description.trim() || null,
      price: raw.price,
      discountPrice: raw.discountPrice,
      displayOrder: raw.displayOrder,
      isAvailable: raw.isAvailable,
      isActive: raw.isActive,
    };
  }

  private toCatalogItemRequestFromExisting(
    item: AdminMenuItem,
    overrides: Partial<SaveCatalogMenuItemRequest>,
  ): SaveCatalogMenuItemRequest {
    const primary = resolveCatalogSaveContent(this.defaultLocale(), item);
    return {
      categoryId: item.categoryId,
      imageFileId: item.imageFileId ?? null,
      name: primary.name,
      description: primary.description || null,
      price: item.price,
      discountPrice: item.discountPrice ?? null,
      displayOrder: item.displayOrder,
      isAvailable: item.isAvailable,
      isActive: item.isActive,
      ...overrides,
    };
  }

  private moveEntry<T extends { id: string }>(entries: T[], sourceId: string, targetId: string): T[] {
    const sourceIndex = entries.findIndex((entry) => entry.id === sourceId);
    const targetIndex = entries.findIndex((entry) => entry.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
      return entries;
    }

    const moved = [...entries];
    const [entry] = moved.splice(sourceIndex, 1);
    moved.splice(targetIndex, 0, entry);
    return moved;
  }

  private sameOrder<T extends { id: string }>(left: T[], right: T[]): boolean {
    return left.length === right.length && left.every((entry, index) => entry.id === right[index]?.id);
  }

  private autoScrollCategoryStrip(event: PointerEvent): void {
    const currentTarget = event.currentTarget;
    if (!(currentTarget instanceof HTMLElement)) {
      return;
    }

    const strip = currentTarget.closest<HTMLElement>('.menu-management-categories');
    if (!strip || strip.scrollWidth <= strip.clientWidth) {
      return;
    }

    const bounds = strip.getBoundingClientRect();
    const edge = Math.min(48, bounds.width * 0.15);
    if (event.clientX < bounds.left + edge) {
      strip.scrollBy({ left: -18 });
    } else if (event.clientX > bounds.right - edge) {
      strip.scrollBy({ left: 18 });
    }
  }

  private showSuccessFeedback(message: string): void {
    this.reorderErrorMessage.set(null);
    this.successMessage.set(message);
  }

  private mapImageValidationError(reason: 'type' | 'size' | 'empty'): string {
    if (reason === 'type') {
      return this.locale.uiText('adminMenuImageInvalidType');
    }
    if (reason === 'size') {
      return this.locale.uiText('adminMenuImageInvalidSize');
    }
    return this.locale.uiText('adminMenuImageInvalidEmpty');
  }

  private mapListError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 403) {
        return this.locale.uiText('adminMenuErrorForbidden');
      }
      if (error.status === 404) {
        return this.locale.uiText('adminMenuErrorNotFound');
      }
      if (error.status === 429) {
        return this.locale.uiText('adminMenuErrorTooManyRequests');
      }
    }

    return this.locale.uiText('adminMenuListError');
  }

  private mapMutationError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 400) {
        return this.locale.uiText('adminMenuErrorValidation');
      }
      if (error.status === 403) {
        return this.locale.uiText('adminMenuErrorForbidden');
      }
      if (error.status === 404) {
        return this.locale.uiText('adminMenuErrorNotFound');
      }
      if (error.status === 409) {
        return this.locale.uiText('adminMenuErrorConflict');
      }
      if (error.status === 429) {
        return this.locale.uiText('adminMenuErrorTooManyRequests');
      }
    }

    return this.locale.uiText('adminMenuErrorGeneric');
  }
}

function discountNotGreaterThanPriceValidator(
  control: AbstractControl,
): ValidationErrors | null {
  const price = control.get('price')?.value;
  const discount = control.get('discountPrice')?.value;

  if (discount === null || discount === undefined || discount === '') {
    return null;
  }

  if (typeof discount === 'number' && discount < 0) {
    return { discountInvalid: true };
  }

  if (typeof price === 'number' && typeof discount === 'number' && discount > price) {
    return { discountGreaterThanPrice: true };
  }

  return null;
}

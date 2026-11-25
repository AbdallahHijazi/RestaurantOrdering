import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
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
import { IconButton } from '../../../../shared/ui/icon-button/icon-button';
import { AppTooltip } from '../../../../shared/ui/tooltip/tooltip';
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
  ReorderDragSession,
  captureRects,
  findScrollParent,
  motionTokenMs,
  motionTokenString,
  playFlip,
} from './menu-reorder.util';
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


import type { MenuItemSize } from '../../../../shared/models/menu-item-size';
import { ErrorState } from '../../../../shared/ui/error-state/error-state';

@Component({
  selector: 'app-menu-management-page',
  imports: [ErrorState, 
    ReactiveFormsModule,
    ModalShell,
    MenuManagementMealCard,
    FloatingNotificationPill,
    IconButton,
    AppTooltip,
  ],
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
  private readonly cdr = inject(ChangeDetectorRef);

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
  /** Category ids in previewed order during a drag; null when no drag is active. */
  protected readonly categoryPreviewOrder = signal<string[] | null>(null);
  private readonly categoryStrip = viewChild<ElementRef<HTMLElement>>('categoryStrip');
  private categoryDrag: ReorderDragSession | null = null;
  /** Item ids in the order they are *previewed* during a drag; null when no drag is active. */
  protected readonly itemPreviewOrder = signal<string[] | null>(null);
  protected readonly dragGhost = signal<{ label: string; position: number } | null>(null);
  /** Briefly set after a successful drop so the card can play its settled feedback. */
  protected readonly settledItemId = signal<string | null>(null);
  /** Last selected real category: kept while All is selected so the action row can animate closed. */
  private readonly lastManagedCategoryId = signal<string | null>(null);
  private readonly itemGrid = viewChild<ElementRef<HTMLElement>>('itemGrid');
  private readonly dragGhostEl = viewChild<ElementRef<HTMLElement>>('dragGhostEl');
  private itemDrag: ReorderDragSession | null = null;
  private readonly releaseDragOnDestroy = this.destroyRef.onDestroy(() => {
    this.itemDrag?.dispose();
    this.categoryDrag?.dispose();
    if (this.settleTimer) {
      clearTimeout(this.settleTimer);
    }
  });
  private settleTimer: ReturnType<typeof setTimeout> | null = null;
  protected readonly reorderErrorMessage = signal<string | null>(null);
  protected readonly imagePreviewUrl = signal<string | null>(null);
  protected readonly imageValidationError = signal<string | null>(null);
  /** UX-006: the user chose to remove the meal's current image (applied on save). */
  protected readonly imageRemoved = signal(false);
  private readonly categoryNameDraft = signal('');
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

  /** UX-006: non-blocking warning when another category already has the typed name. */
  protected readonly duplicateCategoryName = computed(() => {
    const typed = this.normalizeName(this.categoryNameDraft());
    if (!typed) {
      return false;
    }

    const editingId = this.editingCategory()?.id;
    return this.categories().some(
      (category) =>
        category.id !== editingId &&
        [this.displayCategoryName(category), category.nameAr, category.nameEn ?? ''].some(
          (name) => this.normalizeName(name) === typed,
        ),
    );
  });

  protected readonly itemSizes = this.fb.array<ReturnType<MenuManagementPage['sizeRow']>>([]);
  protected readonly sizeValidationVisible = signal(false);

  protected readonly itemForm = this.fb.group(
    {
      categoryId: ['', [Validators.required]],
      name: ['', [Validators.required, Validators.maxLength(200)]],
      description: ['', [Validators.maxLength(1000)]],
      usesSizes: [false],
      confirmSinglePrice: [false],
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

  /** The contextual Edit/Delete row is open only while a real category is selected. */
  protected readonly categoryManageOpen = computed(
    () => this.selectedCategoryId() !== ALL_MENU_ITEMS_FILTER && !this.categoryReorderMode(),
  );

  /** Category the action row describes; retained while closing so its content does not vanish mid-animation. */
  protected readonly contextCategory = computed(() => {
    const selected = this.selectedCategoryId();
    const id = selected !== ALL_MENU_ITEMS_FILTER ? selected : this.lastManagedCategoryId();
    return this.categories().find((category) => category.id === id) ?? null;
  });

  /** Why the dish-reorder control is disabled (empty when it is usable or the page is not ready). */
  protected readonly itemReorderDisabledReason = computed(() => {
    if (this.itemReorderMode() || this.itemOrderBusy() || this.itemsState() !== 'ready') {
      return '';
    }
    if (this.selectedCategoryId() === ALL_MENU_ITEMS_FILTER) {
      return this.locale.uiText('adminMenuReorderNeedCategory');
    }
    if (this.searchQuery().trim() || this.availabilityFilter() !== 'all') {
      return this.locale.uiText('adminMenuReorderClearFilters');
    }
    if (this.menuItems().length < 2) {
      return this.locale.uiText('adminMenuReorderNeedTwoItems');
    }
    return '';
  });

  protected readonly dragGhostPositionLabel = computed(() => {
    const ghost = this.dragGhost();
    return ghost
      ? this.locale.uiText('adminMenuDragPreviewPosition').replace('{position}', String(ghost.position))
      : '';
  });

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
    this.categoryForm.controls.name.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.categoryNameDraft.set(value));
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
    if (categoryId !== ALL_MENU_ITEMS_FILTER) {
      this.lastManagedCategoryId.set(categoryId);
    }
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
    if ((event.pointerType === 'mouse' && event.button !== 0) || !this.beginCategoryDrag(categoryId, event)) {
      return;
    }
    if (event.pointerType === 'mouse') {
      event.preventDefault();
    }
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  }

  protected onItemPointerDown(event: PointerEvent, itemId: string): void {
    if ((event.pointerType === 'mouse' && event.button !== 0) || !this.beginItemDrag(itemId, event)) {
      return;
    }
    event.preventDefault();
  }


  /**
   * Category drag: same stable mechanism as the meal drag (see menu-reorder.util): CSS `order` preview,
   * geometry-snapshot hit-testing, one commit on drop.
   */
  private beginCategoryDrag(categoryId: string, event: PointerEvent): boolean {
    const strip = this.categoryStrip()?.nativeElement;
    if (!this.categoryReorderMode() || this.categoryOrderBusy() || this.categoryDrag || !strip) {
      return false;
    }

    const startIds = this.categories().map((category) => category.id);
    const drag = ReorderDragSession.begin({
      sourceId: categoryId,
      pointerId: event.pointerId,
      container: strip,
      elements: Array.from(strip.querySelectorAll<HTMLElement>('[data-category-reorder-id]')),
      dataKey: 'categoryReorderId',
      startIds,
      onMove: (move) => this.moveDragGhost(move),
      onPreview: (order) => this.applyCategoryPreview(order),
      onDrop: (order, changed) => this.commitCategoryDrag(order, changed),
      onCancel: () => this.cancelCategoryDrag(),
    });
    if (!drag) {
      return false;
    }

    this.categoryDrag = drag;
    this.draggingCategoryId.set(categoryId);
    this.categoryPreviewOrder.set(startIds);
    const source = this.categories().find((category) => category.id === categoryId)!;
    this.dragGhost.set({
      label: this.displayCategoryName(source),
      position: startIds.indexOf(categoryId) + 1,
    });
    this.cdr.detectChanges();
    this.moveDragGhost(event);
    return true;
  }

  private applyCategoryPreview(order: string[] | null): void {
    this.flipAround(this.categoryStrip(), '[data-category-reorder-id]', 'categoryReorderId', () =>
      this.categoryPreviewOrder.set(order),
    );
  }

  private commitCategoryDrag(order: string[], changed: boolean): void {
    this.categoryDrag = null;
    this.draggingCategoryId.set(null);
    this.dragGhost.set(null);
    if (!changed) {
      this.categoryPreviewOrder.set(null);
      this.cdr.detectChanges();
      return;
    }

    const previous = [...this.categories()];
    const byId = new Map(previous.map((category) => [category.id, category]));
    const reordered = order.map((id, index) => ({ ...byId.get(id)!, displayOrder: index + 1 }));
    this.categories.set(reordered);
    this.categoryPreviewOrder.set(null);
    this.cdr.detectChanges();
    this.persistCategoryOrder(previous, reordered);
  }

  private cancelCategoryDrag(): void {
    const drag = this.categoryDrag;
    this.categoryDrag = null;
    drag?.dispose();
    this.draggingCategoryId.set(null);
    this.dragGhost.set(null);
    if (drag && this.categoryPreviewOrder()) {
      this.applyCategoryPreview(null);
    } else {
      this.categoryPreviewOrder.set(null);
    }
  }

  /** CSS `order` of a category chip while a drag preview is active. */
  protected categoryVisualOrder(categoryId: string): number | null {
    const preview = this.categoryPreviewOrder();
    return preview ? preview.indexOf(categoryId) + 1 : null;
  }

  /** Runs `mutate`, re-renders, then slides the matching elements from where they were (FLIP). */
  private flipAround(
    container: ElementRef<HTMLElement> | undefined,
    selector: string,
    dataKey: string,
    mutate: () => void,
  ): void {
    const elements = () =>
      Array.from(container?.nativeElement.querySelectorAll<HTMLElement>(selector) ?? []);
    const before = captureRects(elements(), dataKey);
    mutate();
    this.cdr.detectChanges();
    playFlip(elements(), dataKey, before, this.flipOptions());
  }

  /** UX-005: keyboard/button alternative to drag & drop for categories (-1 = up, +1 = down). */
  protected moveCategoryBy(categoryId: string, delta: -1 | 1): void {
    if (!this.categoryReorderMode() || this.categoryOrderBusy()) {
      return;
    }

    const previous = [...this.categories()];
    const next = this.swapEntries(previous, categoryId, delta);
    if (!next) {
      return;
    }

    const reordered = next.map((category, index) => ({ ...category, displayOrder: index + 1 }));
    this.setCategoriesAnimated(reordered);
    this.persistCategoryOrder(previous, reordered);
  }

  /** UX-005: keyboard/button alternative to drag & drop for meals. */
  protected moveItemBy(itemId: string, delta: -1 | 1): void {
    if (!this.itemReorderMode() || this.itemOrderBusy()) {
      return;
    }

    const previous = [...this.menuItems()];
    const next = this.swapEntries(previous, itemId, delta);
    if (!next) {
      return;
    }

    const reordered = next.map((item, index) => ({ ...item, displayOrder: index + 1 }));
    this.setItemsAnimated(reordered);
    this.markSettled(itemId);
    this.persistItemOrder(previous, reordered);
  }

  private setCategoriesAnimated(categories: AdminCategory[]): void {
    this.flipAround(this.categoryStrip(), '[data-category-reorder-id]', 'categoryReorderId', () =>
      this.categories.set(categories),
    );
  }

  /** Replaces the item list and slides cards to their new positions (FLIP, transform only). */
  private setItemsAnimated(items: AdminMenuItem[]): void {
    this.flipAround(this.itemGrid(), '[data-item-reorder-id]', 'itemReorderId', () =>
      this.menuItems.set(items),
    );
  }

  protected canMoveCategory(categoryId: string, delta: -1 | 1): boolean {
    return this.canMoveWithin(this.categories(), categoryId, delta);
  }

  protected canMoveItem(itemId: string, delta: -1 | 1): boolean {
    return this.canMoveWithin(this.menuItems(), itemId, delta) && !this.itemOrderBusy();
  }

  private canMoveWithin(entries: readonly { id: string }[], id: string, delta: -1 | 1): boolean {
    const index = entries.findIndex((entry) => entry.id === id);
    const target = index + delta;
    return index >= 0 && target >= 0 && target < entries.length;
  }

  private swapEntries<T extends { id: string }>(entries: T[], id: string, delta: -1 | 1): T[] | null {
    if (!this.canMoveWithin(entries, id, delta)) {
      return null;
    }

    const index = entries.findIndex((entry) => entry.id === id);
    const next = [...entries];
    [next[index], next[index + delta]] = [next[index + delta]!, next[index]!];
    return next;
  }

  private normalizeName(value: string | null | undefined): string {
    return (value ?? '').trim().replace(/\s+/g, ' ').toLocaleLowerCase();
  }

  /**
   * Starts a meal drag. The list itself is NOT touched while dragging: the card order is previewed with
   * CSS `order` (no DOM moves, so pointer capture survives) and hit-testing uses a geometry snapshot, so
   * displacing cards can never feed back into the hit test. The order is committed once, on drop.
   */
  private beginItemDrag(itemId: string, event: PointerEvent): boolean {
    const grid = this.itemGrid()?.nativeElement;
    if (!this.itemReorderMode() || this.itemOrderBusy() || this.itemDrag || !grid) {
      return false;
    }

    const startIds = this.menuItems().map((item) => item.id);
    const drag = ReorderDragSession.begin({
      sourceId: itemId,
      pointerId: event.pointerId,
      container: grid,
      elements: Array.from(grid.querySelectorAll<HTMLElement>('[data-item-reorder-id]')),
      dataKey: 'itemReorderId',
      startIds,
      onMove: (move) => {
        this.moveDragGhost(move);
        this.autoScrollNearEdge(grid, move);
      },
      onPreview: (order) => this.applyItemPreview(order),
      onDrop: (order, changed) => this.commitItemDrag(order, changed, itemId),
      onCancel: () => this.cancelItemDrag(),
    });
    if (!drag) {
      return false;
    }

    this.itemDrag = drag;
    this.draggingItemId.set(itemId);
    this.itemPreviewOrder.set(startIds);
    const source = this.menuItems().find((item) => item.id === itemId)!;
    this.dragGhost.set({ label: this.displayItemName(source), position: startIds.indexOf(itemId) + 1 });
    this.cdr.detectChanges();
    this.moveDragGhost(event);
    return true;
  }

  private applyItemPreview(order: string[] | null): void {
    this.flipAround(this.itemGrid(), '[data-item-reorder-id]', 'itemReorderId', () =>
      this.itemPreviewOrder.set(order),
    );
  }

  private flipOptions(): { duration: number; easing: string } {
    return {
      duration: motionTokenMs('--restaurant-motion-normal', 240),
      easing: motionTokenString('--restaurant-ease-standard', 'cubic-bezier(0.22, 1, 0.36, 1)'),
    };
  }

  private moveDragGhost(event: PointerEvent): void {
    const ghost = this.dragGhostEl()?.nativeElement;
    if (ghost) {
      ghost.style.transform = `translate3d(${event.clientX + 14}px, ${event.clientY + 14}px, 0)`;
    }
  }

  /** Scrolls while dragging near the viewport edge (driven by pointer moves, no animation loop). */
  private autoScrollNearEdge(grid: HTMLElement, event: PointerEvent): void {
    const edge = 72;
    const step = 18;
    const scroller = findScrollParent(grid);
    if (typeof scroller.scrollBy !== 'function') {
      return;
    }
    if (event.clientY < edge) {
      scroller.scrollBy({ top: -step });
    } else if (event.clientY > window.innerHeight - edge) {
      scroller.scrollBy({ top: step });
    }
  }

  /** Commits the previewed order exactly once. */
  private commitItemDrag(order: string[], changed: boolean, itemId: string): void {
    this.itemDrag = null;
    this.draggingItemId.set(null);
    this.dragGhost.set(null);
    if (!changed) {
      this.itemPreviewOrder.set(null);
      this.cdr.detectChanges();
      return;
    }

    const previous = [...this.menuItems()];
    const byId = new Map(previous.map((item) => [item.id, item]));
    const reordered = order.map((id, index) => ({ ...byId.get(id)!, displayOrder: index + 1 }));
    this.menuItems.set(reordered);
    this.itemPreviewOrder.set(null);
    this.cdr.detectChanges();
    this.markSettled(itemId);
    this.persistItemOrder(previous, reordered);
  }

  private cancelItemDrag(): void {
    const drag = this.itemDrag;
    this.itemDrag = null;
    drag?.dispose();
    this.draggingItemId.set(null);
    this.dragGhost.set(null);
    if (drag && this.itemPreviewOrder()) {
      this.applyItemPreview(null);
    } else {
      this.itemPreviewOrder.set(null);
    }
  }

  private markSettled(itemId: string): void {
    if (this.settleTimer) {
      clearTimeout(this.settleTimer);
    }
    this.settledItemId.set(itemId);
    this.settleTimer = setTimeout(() => {
      this.settledItemId.set(null);
      this.settleTimer = null;
    }, 900);
  }

  /** Display position used as the CSS `order` of a card while a drag preview is active. */
  protected itemVisualOrder(itemId: string): number | null {
    const preview = this.itemPreviewOrder();
    return preview ? preview.indexOf(itemId) + 1 : null;
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
    this.categoryNameDraft.set('');
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

  private sizeRow(displayOrder: number, size?: MenuItemSize) {
    return this.fb.group({
      id: [size?.id ?? null as string | null],
      name: [size?.name ?? ''],
      price: [size?.price ?? null as number | null],
      isAvailable: [size?.isAvailable ?? true],
      displayOrder: [displayOrder],
    });
  }

  protected addSize(name = ''): void {
    const nextOrder = Math.max(0, ...this.itemSizes.getRawValue().map((size) => size.displayOrder)) + 1;
    const row = this.sizeRow(nextOrder);
    row.controls.name.setValue(name);
    this.itemSizes.push(row);
    this.itemForm.markAsDirty();
  }

  protected removeSize(index: number): void {
    this.itemSizes.removeAt(index);
    this.itemForm.markAsDirty();
  }

  protected applySizePreset(key: 'standard' | 'family'): void {
    if (this.itemSizes.length) return;
    this.locale.uiText(key === 'standard' ? 'sizePresetStandard' : 'sizePresetFamily')
      .split(' / ').forEach((name) => this.addSize(name));
  }

  protected sizeValidationError(): string | null {
    const raw = this.itemForm.getRawValue();
    if (!raw.usesSizes) {
      return this.editingItem()?.usesSizes && !raw.confirmSinglePrice
        ? this.locale.uiText('sizeConfirmConversion') : null;
    }

    const sizes = this.itemSizes.getRawValue();
    if (sizes.length < 2) return this.locale.uiText('sizeMinimum');
    const names = new Set<string>();
    for (const size of sizes) {
      const name = size.name.trim().normalize('NFKC').toUpperCase();
      if (!name || size.name.trim().length > 150 || names.has(name) ||
          size.price === null || !Number.isFinite(size.price) || size.price < 0 ||
          size.price > 99_999_999.99 || Number(size.price.toFixed(2)) !== size.price ||
          !Number.isInteger(size.displayOrder) || size.displayOrder < 0 || size.displayOrder > 2147483647) {
        return this.locale.uiText('sizeInvalid');
      }
      names.add(name);
    }
    return raw.isAvailable && raw.isActive && !sizes.some((size) => size.isAvailable)
      ? this.locale.uiText('sizeAvailabilityRequired') : null;
  }

  protected openCreateItem(): void {
    this.itemSizes.clear();
    this.sizeValidationVisible.set(false);
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
    this.itemSizes.clear();
    this.sizeValidationVisible.set(false);
    for (const size of item.sizes ?? []) this.itemSizes.push(this.sizeRow(size.displayOrder, size));
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
      usesSizes: item.usesSizes ?? false,
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
    this.sizeValidationVisible.set(true);
    if ((!this.itemForm.controls.usesSizes.value && this.itemForm.invalid) ||
        this.itemForm.controls.name.invalid || this.itemForm.controls.categoryId.invalid ||
        this.itemForm.controls.description.invalid || this.itemForm.controls.displayOrder.invalid ||
        this.sizeValidationError() || this.imageValidationError()) {
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
            media?.id ?? (this.imageRemoved() ? null : (editing?.imageFileId ?? null)),
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

  /** UX-006: remove the current/pending image; the item is saved without an image. */
  protected removeImage(): void {
    revokeImagePreviewUrl(this.imagePreviewUrl());
    this.imagePreviewUrl.set(null);
    this.pendingImageFile.set(null);
    this.uploadedMedia.set(null);
    this.imageValidationError.set(null);
    this.imageRemoved.set(true);
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
    this.imageRemoved.set(false);

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
    this.imageRemoved.set(false);
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
          this.setItemsAnimated(previous);
          this.settledItemId.set(null);
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
      ...(raw.usesSizes || this.editingItem()?.usesSizes ? { usesSizes: raw.usesSizes } : {}),
      sizes: raw.usesSizes
        ? this.itemSizes.getRawValue().map((size) => ({ ...size, price: size.price! }))
        : undefined,
      price: raw.usesSizes ? (this.editingItem()?.price ?? 0) : raw.price,
      discountPrice: raw.usesSizes ? (this.editingItem()?.discountPrice ?? null) : raw.discountPrice,
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

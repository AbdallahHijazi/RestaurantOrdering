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
import { DecimalPipe } from '@angular/common';
import { switchMap, of, type Observable } from 'rxjs';
import { resolveApiAssetUrl } from '../../../../core/config/resolve-api-asset-url';
import { LocaleService } from '../../../../core/localization/locale';
import {
  createImagePreviewUrl,
  revokeImagePreviewUrl,
  validateImageFile,
} from '../../restaurant-profile/data-access/image-preview.util';
import { AdminMenuService } from '../../data-access/admin-menu.service';
import {
  ALL_MENU_ITEMS_FILTER,
  type AdminCategory,
  type AdminMenuItem,
  type SaveCategoryRequest,
  type SaveMenuItemRequest,
  type UploadedMediaFile,
} from '../../data-access/admin-menu.models';

type PageState = 'loading' | 'ready' | 'error' | 'missing-context';
type ModalKind = 'category' | 'item' | 'deleteCategory' | 'deleteItem' | null;

@Component({
  selector: 'app-menu-management-page',
  imports: [ReactiveFormsModule, DecimalPipe, ModalShell],
  templateUrl: './menu-management-page.html',
  styleUrl: './menu-management-page.scss',
})
export class MenuManagementPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly menuService = inject(AdminMenuService);
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
  protected readonly imagePreviewUrl = signal<string | null>(null);
  protected readonly imageValidationError = signal<string | null>(null);
  protected readonly pendingImageFile = signal<File | null>(null);
  protected readonly uploadedMedia = signal<UploadedMediaFile | null>(null);
  protected readonly failedImageIds = signal<ReadonlySet<string>>(new Set());

  protected readonly categoryForm = this.fb.group({
    nameAr: ['', [Validators.required, Validators.maxLength(200)]],
    nameEn: ['', [Validators.maxLength(200)]],
    descriptionAr: ['', [Validators.maxLength(1000)]],
    descriptionEn: ['', [Validators.maxLength(1000)]],
    displayOrder: [0, [Validators.required, Validators.min(0)]],
    isActive: [true],
  });

  protected readonly itemForm = this.fb.group(
    {
      categoryId: ['', [Validators.required]],
      nameAr: ['', [Validators.required, Validators.maxLength(200)]],
      nameEn: ['', [Validators.maxLength(200)]],
      descriptionAr: ['', [Validators.maxLength(1000)]],
      descriptionEn: ['', [Validators.maxLength(1000)]],
      price: [0, [Validators.required, Validators.min(0)]],
      discountPrice: [null as number | null],
      displayOrder: [0, [Validators.required, Validators.min(0)]],
      isAvailable: [true],
      isActive: [true],
    },
    { validators: [discountNotGreaterThanPriceValidator] },
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
    this.loadCategories();
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
    this.selectedCategoryId.set(categoryId);
    this.loadMenuItems();
  }

  protected openCreateCategory(): void {
    this.editingCategory.set(null);
    this.categoryForm.reset({
      nameAr: '',
      nameEn: '',
      descriptionAr: '',
      descriptionEn: '',
      displayOrder: this.categories().length + 1,
      isActive: true,
    });
    this.modalErrorMessage.set(null);
    this.modalKind.set('category');
  }

  protected openEditCategory(category: AdminCategory): void {
    this.editingCategory.set(category);
    this.categoryForm.reset({
      nameAr: category.nameAr,
      nameEn: category.nameEn ?? '',
      descriptionAr: category.descriptionAr ?? '',
      descriptionEn: category.descriptionEn ?? '',
      displayOrder: category.displayOrder,
      isActive: category.isActive,
    });
    this.modalErrorMessage.set(null);
    this.modalKind.set('category');
  }

  protected openDeleteCategory(category: AdminCategory): void {
    this.deletingCategory.set(category);
    this.modalErrorMessage.set(null);
    this.modalKind.set('deleteCategory');
  }

  protected openCreateItem(): void {
    const selected = this.selectedCategoryId();
    this.editingItem.set(null);
    this.resetItemFormState();
    this.itemForm.reset({
      categoryId:
        selected === ALL_MENU_ITEMS_FILTER
          ? (this.categories()[0]?.id ?? '')
          : selected,
      nameAr: '',
      nameEn: '',
      descriptionAr: '',
      descriptionEn: '',
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

    this.itemForm.reset({
      categoryId: item.categoryId,
      nameAr: item.nameAr,
      nameEn: item.nameEn ?? '',
      descriptionAr: item.descriptionAr ?? '',
      descriptionEn: item.descriptionEn ?? '',
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
    this.deletingItem.set(item);
    this.modalErrorMessage.set(null);
    this.modalKind.set('deleteItem');
  }

  protected closeModal(): void {
    this.resetItemFormState();
    this.modalKind.set(null);
    this.modalSubmitting.set(false);
    this.modalErrorMessage.set(null);
    this.editingCategory.set(null);
    this.editingItem.set(null);
    this.deletingCategory.set(null);
    this.deletingItem.set(null);
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
      ? this.menuService.updateCategory(editing.id, request)
      : this.menuService.createCategory(request);

    save$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (saved) => {
        this.categories.update((entries) =>
          this.sortCategories(
            editing
              ? entries.map((entry) => (entry.id === saved.id ? saved : entry))
              : [...entries, saved],
          ),
        );
        this.modalSubmitting.set(false);
        this.closeModal();
        this.successMessage.set(
          this.locale.uiText(
            editing ? 'adminMenuCategoryUpdateSuccess' : 'adminMenuCategoryCreateSuccess',
          ),
        );
        this.loadMenuItems();
      },
      error: (error) => {
        this.modalSubmitting.set(false);
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
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.categories.update((entries) => entries.filter((entry) => entry.id !== category.id));
          if (this.selectedCategoryId() === category.id) {
            this.selectedCategoryId.set(ALL_MENU_ITEMS_FILTER);
          }
          this.modalSubmitting.set(false);
          this.closeModal();
          this.successMessage.set(this.locale.uiText('adminMenuCategoryDeleteSuccess'));
          this.loadMenuItems();
        },
        error: (error) => {
          this.modalSubmitting.set(false);
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

    this.modalSubmitting.set(true);
    this.modalErrorMessage.set(null);

    this.ensureUploadedMedia$()
      .pipe(
        switchMap((media) => {
          const editing = this.editingItem();
          const request = this.toItemRequest(
            this.itemForm.getRawValue(),
            media?.id ?? editing?.imageFileId ?? null,
          );
          return editing
            ? this.menuService.updateMenuItem(editing.id, request)
            : this.menuService.createMenuItem(request);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (saved) => {
          this.menuItems.update((entries) =>
            this.sortItems(
              this.editingItem()
                ? entries.map((entry) => (entry.id === saved.id ? saved : entry))
                : [...entries, saved],
            ),
          );
          this.refreshCategoryCounts();
          this.modalSubmitting.set(false);
          this.closeModal();
          this.successMessage.set(
            this.locale.uiText(
              this.editingItem() ? 'adminMenuItemUpdateSuccess' : 'adminMenuItemCreateSuccess',
            ),
          );
        },
        error: (error) => {
          this.modalSubmitting.set(false);
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
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.menuItems.update((entries) => entries.filter((entry) => entry.id !== item.id));
          this.refreshCategoryCounts();
          this.modalSubmitting.set(false);
          this.closeModal();
          this.successMessage.set(this.locale.uiText('adminMenuItemDeleteSuccess'));
        },
        error: (error) => {
          this.modalSubmitting.set(false);
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
    const request = this.toItemRequestFromExisting(item, { isAvailable: !item.isAvailable });

    this.menuService
      .updateMenuItem(item.id, request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.menuItems.update((entries) =>
            entries.map((entry) => (entry.id === updated.id ? updated : entry)),
          );
          this.availabilityBusyId.set(null);
          this.successMessage.set(this.locale.uiText('adminMenuItemUpdateSuccess'));
        },
        error: (error) => {
          this.availabilityBusyId.set(null);
          this.successMessage.set(null);
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
    return this.locale.pickText(
      { ar: category.nameAr, en: category.nameEn ?? category.nameAr },
      category.nameAr,
    );
  }

  protected displayItemName(item: AdminMenuItem): string {
    return this.locale.pickText(
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

  private resetItemFormState(): void {
    revokeImagePreviewUrl(this.imagePreviewUrl());
    this.imagePreviewUrl.set(null);
    this.pendingImageFile.set(null);
    this.uploadedMedia.set(null);
    this.imageValidationError.set(null);
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
    return [...categories].sort(
      (a, b) => a.displayOrder - b.displayOrder || a.nameAr.localeCompare(b.nameAr),
    );
  }

  private sortItems(items: AdminMenuItem[]): AdminMenuItem[] {
    return [...items].sort(
      (a, b) => a.displayOrder - b.displayOrder || a.nameAr.localeCompare(b.nameAr),
    );
  }

  private toCategoryRequest(raw: ReturnType<typeof this.categoryForm.getRawValue>): SaveCategoryRequest {
    return {
      nameAr: raw.nameAr.trim(),
      nameEn: raw.nameEn.trim() || null,
      descriptionAr: raw.descriptionAr.trim() || null,
      descriptionEn: raw.descriptionEn.trim() || null,
      displayOrder: raw.displayOrder,
      isActive: raw.isActive,
    };
  }

  private toItemRequest(
    raw: ReturnType<typeof this.itemForm.getRawValue>,
    imageFileId: string | null,
  ): SaveMenuItemRequest {
    return {
      categoryId: raw.categoryId,
      imageFileId,
      nameAr: raw.nameAr.trim(),
      nameEn: raw.nameEn.trim() || null,
      descriptionAr: raw.descriptionAr.trim() || null,
      descriptionEn: raw.descriptionEn.trim() || null,
      price: raw.price,
      discountPrice: raw.discountPrice,
      displayOrder: raw.displayOrder,
      isAvailable: raw.isAvailable,
      isActive: raw.isActive,
    };
  }

  private toItemRequestFromExisting(
    item: AdminMenuItem,
    overrides: Partial<SaveMenuItemRequest>,
  ): SaveMenuItemRequest {
    return {
      categoryId: item.categoryId,
      imageFileId: item.imageFileId ?? null,
      nameAr: item.nameAr,
      nameEn: item.nameEn ?? null,
      descriptionAr: item.descriptionAr ?? null,
      descriptionEn: item.descriptionEn ?? null,
      price: item.price,
      discountPrice: item.discountPrice ?? null,
      displayOrder: item.displayOrder,
      isAvailable: item.isAvailable,
      isActive: item.isActive,
      ...overrides,
    };
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

import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { DirectionService } from '../../../../core/localization/direction.service';
import { LocaleApiService } from '../../../../core/localization/locale-api.service';
import { LocaleService } from '../../../../core/localization/locale';
import type { LocaleMetadata } from '../../../../core/localization/locale.types';
import { OrderModalShell } from '../../../../shared/components/order-modal-shell/order-modal-shell';
import type {
  TranslatableEntityType,
  TranslationDraftStatus,
  TranslationReviewApiDto,
} from '../../data-access/translation-review-api.models';
import { TranslationReviewApiService } from '../../data-access/translation-review-api.service';
import { TranslationReviewDetailModal } from './components/translation-review-detail-modal/translation-review-detail-modal';
import {
  areAllVisibleSelectableSelected,
  buildTranslationReviewQueryParams,
  collectBulkSelectableIds,
  formatTranslationUpdatedAt,
  isTranslationApproveVisible,
  isTranslationBulkSelectable,
  isTranslationRetryVisible,
  toggleSelectAllVisible,
  type EntityTypeFilterValue,
  type LocaleFilterValue,
  type StatusFilterValue,
  type TranslationReviewFilters,
} from './translation-review-page.util';

type PageState = 'loading' | 'ready' | 'error' | 'missing-context';

const ENTITY_TYPE_FILTERS: readonly EntityTypeFilterValue[] = [
  'all',
  'Restaurant',
  'Category',
  'MenuItem',
];

const STATUS_FILTERS: readonly StatusFilterValue[] = [
  'all',
  'NeedsReview',
  'Failed',
  'Pending',
];

@Component({
  selector: 'app-translation-review-page',
  imports: [FormsModule, OrderModalShell, TranslationReviewDetailModal],
  templateUrl: './translation-review-page.html',
  styleUrl: './translation-review-page.scss',
})
export class TranslationReviewPage {
  private readonly translationReviewApi = inject(TranslationReviewApiService);
  private readonly localeApi = inject(LocaleApiService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly locale = inject(LocaleService);
  protected readonly directionService = inject(DirectionService);

  protected readonly entityTypeFilters = ENTITY_TYPE_FILTERS;
  protected readonly statusFilters = STATUS_FILTERS;

  protected readonly pageState = signal<PageState>('loading');
  protected readonly listError = signal<string | null>(null);
  protected readonly refreshing = signal(false);
  protected readonly feedbackMessage = signal<string | null>(null);
  protected readonly items = signal<TranslationReviewApiDto[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly localeFilter = signal<LocaleFilterValue>('all');
  protected readonly entityTypeFilter = signal<EntityTypeFilterValue>('all');
  protected readonly statusFilter = signal<StatusFilterValue>('all');
  protected readonly localeOptions = signal<LocaleMetadata[]>([]);
  protected readonly selectedIds = signal<ReadonlySet<string>>(new Set());
  protected readonly rowActionIds = signal<ReadonlySet<string>>(new Set());

  protected readonly reviewOpen = signal(false);
  protected readonly reviewItem = signal<TranslationReviewApiDto | null>(null);
  protected readonly reviewSaving = signal(false);
  protected readonly reviewError = signal<string | null>(null);

  protected readonly bulkSubmitting = signal(false);

  protected readonly filters = computed<TranslationReviewFilters>(() => ({
    locale: this.localeFilter(),
    entityType: this.entityTypeFilter(),
    status: this.statusFilter(),
  }));

  protected readonly selectableSelectedIds = computed(() =>
    collectBulkSelectableIds(this.items(), this.selectedIds()),
  );

  protected readonly bulkApproveEnabled = computed(
    () => this.selectableSelectedIds().length > 0 && !this.bulkSubmitting(),
  );

  protected readonly allVisibleSelected = computed(() =>
    areAllVisibleSelectableSelected(this.items(), this.selectedIds()),
  );

  constructor() {
    this.loadPage();
  }

  protected loadPage(): void {
    const restaurantId = this.authService.restaurantId();
    if (!restaurantId) {
      this.pageState.set('missing-context');
      return;
    }

    this.pageState.set('loading');
    this.listError.set(null);
    this.feedbackMessage.set(null);
    this.selectedIds.set(new Set());

    this.localeApi
      .getRestaurantLocaleSettings(restaurantId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (settings) => {
          this.localeOptions.set(settings.availableLocales);
          this.directionService.registerLocales(settings.availableLocales);
          this.loadTranslations(restaurantId);
        },
        error: (error) => {
          this.pageState.set('error');
          this.listError.set(this.mapListError(error));
          this.refreshing.set(false);
        },
      });
  }

  protected refreshList(): void {
    if (this.refreshing() || this.pageState() === 'loading') {
      return;
    }

    const restaurantId = this.authService.restaurantId();
    if (!restaurantId) {
      this.pageState.set('missing-context');
      return;
    }

    this.feedbackMessage.set(null);
    this.refreshing.set(true);
    this.loadTranslations(restaurantId);
  }

  protected retryLoad(): void {
    this.loadPage();
  }

  protected setLocaleFilter(value: string): void {
    this.localeFilter.set(value as LocaleFilterValue);
    this.reloadTranslations();
  }

  protected setEntityTypeFilter(value: string): void {
    this.entityTypeFilter.set(value as EntityTypeFilterValue);
    this.reloadTranslations();
  }

  protected setStatusFilter(value: string): void {
    this.statusFilter.set(value as StatusFilterValue);
    this.reloadTranslations();
  }

  protected toggleRowSelection(item: TranslationReviewApiDto, checked: boolean): void {
    if (!isTranslationBulkSelectable(item)) {
      return;
    }

    this.selectedIds.update((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(item.translationId);
      } else {
        next.delete(item.translationId);
      }
      return next;
    });
  }

  protected toggleSelectAllVisible(checked: boolean): void {
    if (!checked) {
      this.selectedIds.set(new Set());
      return;
    }

    this.selectedIds.set(toggleSelectAllVisible(this.items(), this.selectedIds()));
  }

  protected isRowSelected(item: TranslationReviewApiDto): boolean {
    return this.selectedIds().has(item.translationId);
  }

  protected isRowSelectable(item: TranslationReviewApiDto): boolean {
    return isTranslationBulkSelectable(item);
  }

  protected canApproveRow(item: TranslationReviewApiDto): boolean {
    return isTranslationApproveVisible(item);
  }

  protected canRetryRow(item: TranslationReviewApiDto): boolean {
    return isTranslationRetryVisible(item);
  }

  protected openReview(item: TranslationReviewApiDto): void {
    const restaurantId = this.authService.restaurantId();
    if (!restaurantId) {
      return;
    }

    this.reviewError.set(null);
    this.reviewOpen.set(true);
    this.reviewItem.set(item);

    this.translationReviewApi
      .getTranslation(restaurantId, item.translationId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (fresh) => {
          this.reviewItem.set(fresh);
          this.upsertItem(fresh);
        },
        error: (error) => {
          this.reviewError.set(this.mapActionError(error));
        },
      });
  }

  protected closeReview(): void {
    if (this.reviewSaving()) {
      return;
    }

    this.reviewOpen.set(false);
    this.reviewItem.set(null);
    this.reviewError.set(null);
  }

  protected saveDraft(payload: {
    name: string;
    description?: string | null;
    address?: string | null;
  }): void {
    const restaurantId = this.authService.restaurantId();
    const item = this.reviewItem();
    if (!restaurantId || !item) {
      return;
    }

    this.reviewSaving.set(true);
    this.reviewError.set(null);

    this.translationReviewApi
      .updateDraft(restaurantId, item.translationId, payload)
      .pipe(
        finalize(() => this.reviewSaving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (updated) => {
          this.reviewItem.set(updated);
          this.upsertItem(updated);
          this.feedbackMessage.set(this.locale.uiText('translationReviewDraftSaved'));
        },
        error: (error) => {
          this.reviewError.set(this.mapActionError(error));
        },
      });
  }

  protected approveFromReview(): void {
    const item = this.reviewItem();
    if (!item || !this.canApproveRow(item)) {
      return;
    }

    this.approveTranslation(item.translationId, true);
  }

  protected retryFromReview(): void {
    const item = this.reviewItem();
    if (!item || !this.canRetryRow(item)) {
      return;
    }

    this.retryTranslation(item.translationId, true);
  }

  protected approveRow(item: TranslationReviewApiDto): void {
    if (!this.canApproveRow(item)) {
      return;
    }

    this.approveTranslation(item.translationId, false);
  }

  protected retryRow(item: TranslationReviewApiDto): void {
    if (!this.canRetryRow(item)) {
      return;
    }

    this.retryTranslation(item.translationId, false);
  }

  protected bulkApproveSelected(): void {
    const restaurantId = this.authService.restaurantId();
    const ids = this.selectableSelectedIds();
    if (!restaurantId || ids.length === 0 || this.bulkSubmitting()) {
      return;
    }

    this.bulkSubmitting.set(true);
    this.feedbackMessage.set(null);
    this.listError.set(null);

    this.translationReviewApi
      .bulkApprove(restaurantId, ids)
      .pipe(
        finalize(() => this.bulkSubmitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.feedbackMessage.set(this.locale.uiText('translationReviewBulkApproved'));
          this.reloadTranslations();
        },
        error: (error) => {
          this.listError.set(this.mapActionError(error));
        },
      });
  }

  protected directionBadge(localeCode: string): string {
    const direction = this.directionService.getDirection(localeCode);
    return direction === 'rtl'
      ? this.locale.uiText('translationReviewDirectionRtl')
      : this.locale.uiText('translationReviewDirectionLtr');
  }

  protected entityTypeLabel(entityType: TranslatableEntityType): string {
    switch (entityType) {
      case 'Restaurant':
        return this.locale.uiText('translationReviewEntityRestaurant');
      case 'Category':
        return this.locale.uiText('translationReviewEntityCategory');
      case 'MenuItem':
        return this.locale.uiText('translationReviewEntityMenuItem');
    }
  }

  protected statusLabel(status: TranslationDraftStatus | null): string {
    if (!status) {
      return '—';
    }

    switch (status) {
      case 'NeedsReview':
        return this.locale.uiText('translationReviewStatusNeedsReview');
      case 'Failed':
        return this.locale.uiText('translationReviewStatusFailed');
      case 'Pending':
        return this.locale.uiText('translationReviewStatusPending');
      case 'Approved':
        return this.locale.uiText('translationReviewStatusApproved');
    }
  }

  protected draftSourceLabel(source: TranslationReviewApiDto['draftSource']): string {
    if (!source) {
      return '—';
    }

    switch (source) {
      case 'Original':
        return this.locale.uiText('translationReviewSourceOriginal');
      case 'Machine':
        return this.locale.uiText('translationReviewSourceMachine');
      case 'Manual':
        return this.locale.uiText('translationReviewSourceManual');
      case 'TranslationMemory':
        return this.locale.uiText('translationReviewSourceTranslationMemory');
    }
  }

  protected formatUpdatedAt(value: string | null): string {
    return formatTranslationUpdatedAt(value, this.locale.locale());
  }

  protected isRowBusy(translationId: string): boolean {
    return this.rowActionIds().has(translationId);
  }

  private reloadTranslations(): void {
    const restaurantId = this.authService.restaurantId();
    if (!restaurantId) {
      this.pageState.set('missing-context');
      return;
    }

    this.feedbackMessage.set(null);
    this.selectedIds.set(new Set());
    this.loadTranslations(restaurantId);
  }

  private loadTranslations(restaurantId: string): void {
    this.translationReviewApi
      .getTranslations(restaurantId, buildTranslationReviewQueryParams(this.filters()))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.items.set(result.items);
          this.totalCount.set(result.totalCount);
          this.pageState.set('ready');
          this.refreshing.set(false);
        },
        error: (error) => {
          this.pageState.set('error');
          this.listError.set(this.mapListError(error));
          this.refreshing.set(false);
        },
      });
  }

  private approveTranslation(translationId: string, fromReview: boolean): void {
    const restaurantId = this.authService.restaurantId();
    if (!restaurantId) {
      return;
    }

    this.setRowBusy(translationId, true);
    if (fromReview) {
      this.reviewSaving.set(true);
      this.reviewError.set(null);
    }

    this.translationReviewApi
      .approveTranslation(restaurantId, translationId)
      .pipe(
        finalize(() => {
          this.setRowBusy(translationId, false);
          if (fromReview) {
            this.reviewSaving.set(false);
          }
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.feedbackMessage.set(this.locale.uiText('translationReviewApproved'));
          if (fromReview) {
            this.closeReview();
          }
          this.reloadTranslations();
        },
        error: (error) => {
          const message = this.mapActionError(error);
          if (fromReview) {
            this.reviewError.set(message);
          } else {
            this.feedbackMessage.set(message);
          }
        },
      });
  }

  private retryTranslation(translationId: string, fromReview: boolean): void {
    const restaurantId = this.authService.restaurantId();
    if (!restaurantId) {
      return;
    }

    this.setRowBusy(translationId, true);
    if (fromReview) {
      this.reviewSaving.set(true);
      this.reviewError.set(null);
    }

    this.translationReviewApi
      .retryTranslation(restaurantId, translationId)
      .pipe(
        finalize(() => {
          this.setRowBusy(translationId, false);
          if (fromReview) {
            this.reviewSaving.set(false);
          }
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (updated) => {
          this.feedbackMessage.set(this.locale.uiText('translationReviewRetried'));
          this.upsertItem(updated);
          if (fromReview) {
            this.reviewItem.set(updated);
          }
        },
        error: (error) => {
          const message = this.mapActionError(error);
          if (fromReview) {
            this.reviewError.set(message);
          } else {
            this.feedbackMessage.set(message);
          }
        },
      });
  }

  private upsertItem(item: TranslationReviewApiDto): void {
    this.items.update((current) => {
      const index = current.findIndex((row) => row.translationId === item.translationId);
      if (index === -1) {
        return current;
      }

      const next = [...current];
      next[index] = item;
      return next;
    });
  }

  private setRowBusy(translationId: string, busy: boolean): void {
    this.rowActionIds.update((current) => {
      const next = new Set(current);
      if (busy) {
        next.add(translationId);
      } else {
        next.delete(translationId);
      }
      return next;
    });
  }

  private mapListError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 403) {
        return this.locale.uiText('translationReviewErrorForbidden');
      }
    }

    return this.locale.uiText('translationReviewListError');
  }

  private mapActionError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 403) {
        return this.locale.uiText('translationReviewErrorForbidden');
      }

      const detail =
        typeof error.error === 'object' &&
        error.error &&
        typeof (error.error as Record<string, unknown>)['detail'] === 'string'
          ? String((error.error as Record<string, unknown>)['detail'])
          : null;

      if (detail?.trim()) {
        return detail.trim();
      }
    }

    return this.locale.uiText('translationReviewActionError');
  }
}

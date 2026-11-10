import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { DirectionService } from '../../../../../../core/localization/direction.service';
import { LocaleService } from '../../../../../../core/localization/locale';
import type { TranslationReviewApiDto } from '../../../../data-access/translation-review-api.models';
import {
  buildUpdateDraftPayload,
  createDraftFormState,
  entityTypeSupportsAddress,
  isTranslationApproveVisible,
  isTranslationRetryVisible,
  validateDraftForm,
} from '../../translation-review-page.util';

@Component({
  selector: 'app-translation-review-detail-modal',
  imports: [],
  templateUrl: './translation-review-detail-modal.html',
  styleUrl: './translation-review-detail-modal.scss',
})
export class TranslationReviewDetailModal {
  readonly item = input<TranslationReviewApiDto | null>(null);
  readonly saving = input(false);
  readonly actionError = input<string | null>(null);

  readonly saveDraft = output<{ name: string; description?: string | null; address?: string | null }>();
  readonly approve = output<void>();
  readonly retry = output<void>();

  protected readonly localeService = inject(LocaleService);
  protected readonly directionService = inject(DirectionService);

  protected readonly draft = signal({ name: '', description: '', address: '' });
  protected readonly validationError = signal<string | null>(null);

  protected readonly currentItem = computed(() => this.item());

  constructor() {
    effect(() => {
      const item = this.item();
      if (!item) {
        return;
      }

      this.draft.set(createDraftFormState(item));
      this.validationError.set(null);
    });
  }

  protected showAddressFields(item: TranslationReviewApiDto): boolean {
    return entityTypeSupportsAddress(item.entityType);
  }

  protected canApprove(item: TranslationReviewApiDto): boolean {
    return isTranslationApproveVisible(item);
  }

  protected canRetry(item: TranslationReviewApiDto): boolean {
    return isTranslationRetryVisible(item);
  }

  protected directionBadge(localeCode: string): string {
    const direction = this.directionService.getDirection(localeCode);
    return direction === 'rtl'
      ? this.localeService.uiText('translationReviewDirectionRtl')
      : this.localeService.uiText('translationReviewDirectionLtr');
  }

  protected entityTypeLabel(entityType: TranslationReviewApiDto['entityType']): string {
    switch (entityType) {
      case 'Restaurant':
        return this.localeService.uiText('translationReviewEntityRestaurant');
      case 'Category':
        return this.localeService.uiText('translationReviewEntityCategory');
      case 'MenuItem':
        return this.localeService.uiText('translationReviewEntityMenuItem');
    }
  }

  protected draftStatusLabel(status: TranslationReviewApiDto['draftStatus']): string {
    if (!status) {
      return '—';
    }

    switch (status) {
      case 'NeedsReview':
        return this.localeService.uiText('translationReviewStatusNeedsReview');
      case 'Failed':
        return this.localeService.uiText('translationReviewStatusFailed');
      case 'Pending':
        return this.localeService.uiText('translationReviewStatusPending');
      case 'Approved':
        return this.localeService.uiText('translationReviewStatusApproved');
    }
  }

  protected onSaveDraft(): void {
    const item = this.currentItem();
    if (!item) {
      return;
    }

    const draft = this.draft();
    const validation = validateDraftForm(item, draft);
    if (validation) {
      this.validationError.set(this.mapValidationMessage(validation));
      return;
    }

    this.validationError.set(null);
    this.saveDraft.emit(buildUpdateDraftPayload(item, draft));
  }

  protected onApprove(): void {
    const item = this.currentItem();
    if (!item || !this.canApprove(item)) {
      return;
    }

    this.approve.emit();
  }

  protected onRetry(): void {
    const item = this.currentItem();
    if (!item || !this.canRetry(item)) {
      return;
    }

    this.retry.emit();
  }

  protected setDraftName(value: string): void {
    this.draft.update((current) => ({ ...current, name: value }));
  }

  protected setDraftDescription(value: string): void {
    this.draft.update((current) => ({ ...current, description: value }));
  }

  protected setDraftAddress(value: string): void {
    this.draft.update((current) => ({ ...current, address: value }));
  }

  private mapValidationMessage(code: string): string {
    switch (code) {
      case 'nameRequired':
        return this.localeService.uiText('translationReviewDraftNameRequired');
      case 'nameTooLong':
        return this.localeService.uiText('translationReviewDraftNameTooLong');
      case 'descriptionTooLong':
        return this.localeService.uiText('translationReviewDraftDescriptionTooLong');
      case 'addressTooLong':
        return this.localeService.uiText('translationReviewDraftAddressTooLong');
      default:
        return this.localeService.uiText('translationReviewActionError');
    }
  }
}

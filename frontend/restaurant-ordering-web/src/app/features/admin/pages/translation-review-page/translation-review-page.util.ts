import type {
  TranslatableEntityType,
  TranslationDraftStatus,
  TranslationReviewApiDto,
  TranslationReviewListQueryParams,
} from '../../data-access/translation-review-api.models';

export type LocaleFilterValue = 'all' | string;
export type EntityTypeFilterValue = 'all' | TranslatableEntityType;
export type StatusFilterValue = 'all' | TranslationDraftStatus;

export interface TranslationReviewFilters {
  locale: LocaleFilterValue;
  entityType: EntityTypeFilterValue;
  status: StatusFilterValue;
}

export function buildTranslationReviewQueryParams(
  filters: TranslationReviewFilters,
  page = 1,
  pageSize?: number,
): TranslationReviewListQueryParams {
  const params: TranslationReviewListQueryParams = { page, pageSize };

  if (filters.entityType !== 'all') {
    params.entityType = filters.entityType;
  }

  if (filters.locale !== 'all') {
    params.locale = filters.locale;
  }

  if (filters.status !== 'all') {
    params.status = filters.status;
  }

  return params;
}

export function isTranslationBulkSelectable(item: TranslationReviewApiDto): boolean {
  return item.canApprove && !item.isStale;
}

export function isTranslationRetryVisible(item: TranslationReviewApiDto): boolean {
  return item.canRetry || item.draftStatus === 'Failed';
}

export function isTranslationApproveVisible(item: TranslationReviewApiDto): boolean {
  return item.canApprove && !item.isStale;
}

export function entityTypeSupportsAddress(entityType: TranslatableEntityType): boolean {
  return entityType === 'Restaurant';
}

export function collectBulkSelectableIds(
  items: readonly TranslationReviewApiDto[],
  selectedIds: ReadonlySet<string>,
): string[] {
  const selectable = new Set(
    items.filter(isTranslationBulkSelectable).map((item) => item.translationId),
  );

  return [...selectedIds].filter((id) => selectable.has(id));
}

export function areAllVisibleSelectableSelected(
  items: readonly TranslationReviewApiDto[],
  selectedIds: ReadonlySet<string>,
): boolean {
  const selectable = items.filter(isTranslationBulkSelectable);
  if (selectable.length === 0) {
    return false;
  }

  return selectable.every((item) => selectedIds.has(item.translationId));
}

export function toggleSelectAllVisible(
  items: readonly TranslationReviewApiDto[],
  selectedIds: ReadonlySet<string>,
): ReadonlySet<string> {
  const selectableIds = items.filter(isTranslationBulkSelectable).map((item) => item.translationId);
  if (selectableIds.length === 0) {
    return selectedIds;
  }

  const allSelected = selectableIds.every((id) => selectedIds.has(id));
  const next = new Set(selectedIds);

  if (allSelected) {
    for (const id of selectableIds) {
      next.delete(id);
    }
  } else {
    for (const id of selectableIds) {
      next.add(id);
    }
  }

  return next;
}

export function buildUpdateDraftPayload(
  item: TranslationReviewApiDto,
  draft: {
    name: string;
    description: string;
    address: string;
  },
): { name: string; description?: string | null; address?: string | null } {
  const payload: { name: string; description?: string | null; address?: string | null } = {
    name: draft.name.trim(),
  };

  if (item.draftDescription !== null || item.publishedDescription !== null) {
    payload.description = draft.description.trim() || null;
  }

  if (entityTypeSupportsAddress(item.entityType)) {
    payload.address = draft.address.trim() || null;
  }

  return payload;
}

export function createDraftFormState(item: TranslationReviewApiDto): {
  name: string;
  description: string;
  address: string;
} {
  return {
    name: item.draftName ?? '',
    description: item.draftDescription ?? '',
    address: item.draftAddress ?? '',
  };
}

export function validateDraftForm(
  item: TranslationReviewApiDto,
  draft: { name: string; description: string; address: string },
): string | null {
  if (!draft.name.trim()) {
    return 'nameRequired';
  }

  if (entityTypeSupportsAddress(item.entityType) && draft.address.length > 300) {
    return 'addressTooLong';
  }

  if (draft.name.length > 100) {
    return 'nameTooLong';
  }

  if (draft.description.length > 500) {
    return 'descriptionTooLong';
  }

  return null;
}

export function formatTranslationUpdatedAt(
  value: string | null,
  localeTag: string,
): string {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(localeTag, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export type TranslatableEntityType = 'Restaurant' | 'Category' | 'MenuItem';

export type TranslationDraftStatus = 'Pending' | 'NeedsReview' | 'Approved' | 'Failed';

export type TranslationDraftSource =
  | 'Original'
  | 'Machine'
  | 'Manual'
  | 'TranslationMemory';

export interface TranslationReviewListQueryParams {
  entityType?: TranslatableEntityType;
  locale?: string;
  status?: TranslationDraftStatus;
  page?: number;
  pageSize?: number;
}

export interface TranslationReviewApiDto {
  translationId: string;
  entityType: TranslatableEntityType;
  entityId: string;
  entityDisplayName: string;
  locale: string;
  draftStatus: TranslationDraftStatus | null;
  draftSource: TranslationDraftSource | null;
  draftName: string | null;
  draftDescription: string | null;
  draftAddress: string | null;
  publishedName: string | null;
  publishedDescription: string | null;
  publishedAddress: string | null;
  draftSourceVersion: number | null;
  currentContentVersion: number;
  isStale: boolean;
  canApprove: boolean;
  canRetry: boolean;
  updatedAt: string | null;
}

export interface PagedTranslationReviewResultApiDto {
  items: TranslationReviewApiDto[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface UpdateTranslationDraftApiRequest {
  name: string;
  description?: string | null;
  address?: string | null;
}

export interface BulkApproveTranslationsApiRequest {
  translationIds: string[];
}

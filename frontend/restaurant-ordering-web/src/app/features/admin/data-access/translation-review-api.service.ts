import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api-config';
import type {
  BulkApproveTranslationsApiRequest,
  PagedTranslationReviewResultApiDto,
  TranslationReviewApiDto,
  TranslationReviewListQueryParams,
  UpdateTranslationDraftApiRequest,
} from './translation-review-api.models';

export const TRANSLATION_REVIEW_PAGE_SIZE = 50;

@Injectable({
  providedIn: 'root',
})
export class TranslationReviewApiService {
  private readonly http = inject(HttpClient);

  getTranslations(
    restaurantId: string,
    filters: TranslationReviewListQueryParams = {},
  ): Observable<PagedTranslationReviewResultApiDto> {
    let params = new HttpParams();

    if (filters.entityType) {
      params = params.set('entityType', filters.entityType);
    }

    if (filters.locale?.trim()) {
      params = params.set('locale', filters.locale.trim());
    }

    if (filters.status) {
      params = params.set('status', filters.status);
    }

    params = params.set('page', String(filters.page ?? 1));
    params = params.set('pageSize', String(filters.pageSize ?? TRANSLATION_REVIEW_PAGE_SIZE));

    return this.http.get<PagedTranslationReviewResultApiDto>(
      `${API_BASE_URL}/api/v1/admin/restaurants/${restaurantId}/translations`,
      { params },
    );
  }

  getTranslation(restaurantId: string, translationId: string): Observable<TranslationReviewApiDto> {
    return this.http.get<TranslationReviewApiDto>(
      `${API_BASE_URL}/api/v1/admin/restaurants/${restaurantId}/translations/${translationId}`,
    );
  }

  updateDraft(
    restaurantId: string,
    translationId: string,
    payload: UpdateTranslationDraftApiRequest,
  ): Observable<TranslationReviewApiDto> {
    return this.http.put<TranslationReviewApiDto>(
      `${API_BASE_URL}/api/v1/admin/restaurants/${restaurantId}/translations/${translationId}`,
      payload,
    );
  }

  approveTranslation(
    restaurantId: string,
    translationId: string,
  ): Observable<TranslationReviewApiDto> {
    return this.http.post<TranslationReviewApiDto>(
      `${API_BASE_URL}/api/v1/admin/restaurants/${restaurantId}/translations/${translationId}/approve`,
      {},
    );
  }

  bulkApprove(
    restaurantId: string,
    translationIds: string[],
  ): Observable<TranslationReviewApiDto[]> {
    const payload: BulkApproveTranslationsApiRequest = { translationIds };
    return this.http.post<TranslationReviewApiDto[]>(
      `${API_BASE_URL}/api/v1/admin/restaurants/${restaurantId}/translations/bulk-approve`,
      payload,
    );
  }

  retryTranslation(
    restaurantId: string,
    translationId: string,
  ): Observable<TranslationReviewApiDto> {
    return this.http.post<TranslationReviewApiDto>(
      `${API_BASE_URL}/api/v1/admin/restaurants/${restaurantId}/translations/${translationId}/retry`,
      {},
    );
  }
}

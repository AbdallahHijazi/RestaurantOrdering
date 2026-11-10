import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { API_BASE_URL } from '../../../core/config/api-config';
import {
  TRANSLATION_REVIEW_PAGE_SIZE,
  TranslationReviewApiService,
} from './translation-review-api.service';

const RESTAURANT_ID = 'aaaaaaaa-1111-1111-1111-111111111111';
const TRANSLATION_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

describe('TranslationReviewApiService', () => {
  let service: TranslationReviewApiService;
  let httpMock: HttpTestingController;

  afterEach(() => {
    httpMock.verify();
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(TranslationReviewApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('loads translations with filters', () => {
    service
      .getTranslations(RESTAURANT_ID, {
        entityType: 'MenuItem',
        locale: 'fr',
        status: 'NeedsReview',
        page: 2,
        pageSize: 10,
      })
      .subscribe((result) => {
        expect(result.items).toHaveLength(1);
        expect(result.totalCount).toBe(1);
      });

    const req = httpMock.expectOne(
      (request) =>
        request.url ===
          `${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/translations` &&
        request.method === 'GET' &&
        request.params.get('entityType') === 'MenuItem' &&
        request.params.get('locale') === 'fr' &&
        request.params.get('status') === 'NeedsReview' &&
        request.params.get('page') === '2' &&
        request.params.get('pageSize') === '10',
    );
    req.flush({
      items: [
        {
          translationId: TRANSLATION_ID,
          entityType: 'MenuItem',
          entityId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
          entityDisplayName: 'Burger',
          locale: 'fr',
          draftStatus: 'NeedsReview',
          draftSource: 'Machine',
          draftName: 'Burger',
          draftDescription: 'Tasty',
          draftAddress: null,
          publishedName: null,
          publishedDescription: null,
          publishedAddress: null,
          draftSourceVersion: 1,
          currentContentVersion: 1,
          isStale: false,
          canApprove: true,
          canRetry: false,
          updatedAt: '2026-06-13T10:00:00.000Z',
        },
      ],
      page: 2,
      pageSize: 10,
      totalCount: 1,
    });
  });

  it('uses default pagination when filters omitted', () => {
    service.getTranslations(RESTAURANT_ID).subscribe();

    const req = httpMock.expectOne(
      (request) =>
        request.url ===
          `${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/translations` &&
        request.params.get('page') === '1' &&
        request.params.get('pageSize') === String(TRANSLATION_REVIEW_PAGE_SIZE),
    );
    req.flush({ items: [], page: 1, pageSize: TRANSLATION_REVIEW_PAGE_SIZE, totalCount: 0 });
  });

  it('loads a single translation', () => {
    service.getTranslation(RESTAURANT_ID, TRANSLATION_ID).subscribe((item) => {
      expect(item.translationId).toBe(TRANSLATION_ID);
    });

    const req = httpMock.expectOne(
      `${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/translations/${TRANSLATION_ID}`,
    );
    expect(req.request.method).toBe('GET');
    req.flush({ translationId: TRANSLATION_ID, entityType: 'Category' });
  });

  it('updates draft', () => {
    service
      .updateDraft(RESTAURANT_ID, TRANSLATION_ID, {
        name: 'Updated',
        description: 'Desc',
      })
      .subscribe();

    const req = httpMock.expectOne(
      `${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/translations/${TRANSLATION_ID}`,
    );
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ name: 'Updated', description: 'Desc' });
    req.flush({ translationId: TRANSLATION_ID });
  });

  it('approves translation', () => {
    service.approveTranslation(RESTAURANT_ID, TRANSLATION_ID).subscribe();

    const req = httpMock.expectOne(
      `${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/translations/${TRANSLATION_ID}/approve`,
    );
    expect(req.request.method).toBe('POST');
    req.flush({ translationId: TRANSLATION_ID });
  });

  it('bulk approves translations', () => {
    const ids = [TRANSLATION_ID, 'cccccccc-cccc-cccc-cccc-cccccccccccc'];
    service.bulkApprove(RESTAURANT_ID, ids).subscribe();

    const req = httpMock.expectOne(
      `${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/translations/bulk-approve`,
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ translationIds: ids });
    req.flush([]);
  });

  it('retries translation', () => {
    service.retryTranslation(RESTAURANT_ID, TRANSLATION_ID).subscribe();

    const req = httpMock.expectOne(
      `${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/translations/${TRANSLATION_ID}/retry`,
    );
    expect(req.request.method).toBe('POST');
    req.flush({ translationId: TRANSLATION_ID });
  });
});

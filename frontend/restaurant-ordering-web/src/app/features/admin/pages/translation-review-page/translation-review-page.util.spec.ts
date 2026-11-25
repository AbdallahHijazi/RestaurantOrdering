import { describe, expect, it } from 'vitest';
import type { TranslationReviewApiDto } from '../../data-access/translation-review-api.models';
import {
  areAllVisibleSelectableSelected,
  buildTranslationReviewQueryParams,
  buildUpdateDraftPayload,
  collectBulkSelectableIds,
  isTranslationApproveVisible,
  isTranslationBulkSelectable,
  isTranslationRetryVisible,
  toggleSelectAllVisible,
  validateDraftForm,
} from './translation-review-page.util';

function createItem(overrides: Partial<TranslationReviewApiDto> = {}): TranslationReviewApiDto {
  return {
    translationId: 'id-1',
    entityType: 'MenuItem',
    entityId: 'entity-1',
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
    ...overrides,
  };
}

describe('translation-review-page.util', () => {
  it('builds query params from filters', () => {
    expect(
      buildTranslationReviewQueryParams({
        locale: 'fr',
        entityType: 'Category',
        status: 'Failed',
      }),
    ).toEqual({
      page: 1,
      pageSize: undefined,
      locale: 'fr',
      entityType: 'Category',
      status: 'Failed',
    });

    expect(
      buildTranslationReviewQueryParams({
        locale: 'all',
        entityType: 'all',
        status: 'all',
      }),
    ).toEqual({ page: 1, pageSize: undefined });
  });

  it('detects bulk selectable and approve visibility', () => {
    const stale = createItem({ isStale: true, canApprove: true });
    const approvable = createItem({ canApprove: true, isStale: false });
    const blocked = createItem({ canApprove: false, isStale: false });

    expect(isTranslationBulkSelectable(stale)).toBe(false);
    expect(isTranslationApproveVisible(stale)).toBe(false);
    expect(isTranslationBulkSelectable(approvable)).toBe(true);
    expect(isTranslationApproveVisible(approvable)).toBe(true);
    expect(isTranslationBulkSelectable(blocked)).toBe(false);
  });

  it('shows retry for failed or canRetry items', () => {
    expect(isTranslationRetryVisible(createItem({ draftStatus: 'Failed', canRetry: false }))).toBe(
      true,
    );
    expect(isTranslationRetryVisible(createItem({ draftStatus: 'NeedsReview', canRetry: true }))).toBe(
      true,
    );
    expect(isTranslationRetryVisible(createItem({ draftStatus: 'NeedsReview', canRetry: false }))).toBe(
      false,
    );
  });

  it('collects only selectable ids for bulk approve', () => {
    const items = [
      createItem({ translationId: 'a', canApprove: true }),
      createItem({ translationId: 'b', isStale: true, canApprove: true }),
      createItem({ translationId: 'c', canApprove: false }),
    ];
    const selected = new Set(['a', 'b', 'c', 'd']);

    expect(collectBulkSelectableIds(items, selected)).toEqual(['a']);
  });

  it('toggles select-all for visible selectable rows only', () => {
    const items = [
      createItem({ translationId: 'a', canApprove: true }),
      createItem({ translationId: 'b', isStale: true, canApprove: true }),
    ];

    const selectedAll = toggleSelectAllVisible(items, new Set());
    expect(selectedAll.has('a')).toBe(true);
    expect(selectedAll.has('b')).toBe(false);
    expect(areAllVisibleSelectableSelected(items, selectedAll)).toBe(true);

    const cleared = toggleSelectAllVisible(items, selectedAll);
    expect(cleared.has('a')).toBe(false);
  });

  it('builds update payload by entity type', () => {
    const restaurant = createItem({
      entityType: 'Restaurant',
      draftAddress: 'Old',
      publishedAddress: 'Pub',
    });

    expect(
      buildUpdateDraftPayload(restaurant, {
        name: 'Name',
        description: 'Desc',
        address: 'Addr',
      }),
    ).toEqual({ name: 'Name', description: 'Desc', address: 'Addr' });

    const menuItem = createItem({ entityType: 'MenuItem' });
    expect(
      buildUpdateDraftPayload(menuItem, {
        name: 'Name',
        description: 'Desc',
        address: '',
      }),
    ).toEqual({ name: 'Name', description: 'Desc' });
  });

  it('validates draft name requirement', () => {
    const item = createItem();
    expect(validateDraftForm(item, { name: '', description: '', address: '' })).toBe('nameRequired');
    expect(validateDraftForm(item, { name: 'Ok', description: '', address: '' })).toBeNull();
  });
});

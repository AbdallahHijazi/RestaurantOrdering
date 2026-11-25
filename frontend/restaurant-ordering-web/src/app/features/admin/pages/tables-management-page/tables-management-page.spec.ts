import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { vi } from 'vitest';
import { API_BASE_URL } from '../../../../core/config/api-config';
import { ApplicationRoles } from '../../../../core/auth/application-roles';
import { AuthSessionService } from '../../../../core/auth/auth-session.service';
import { createTestSession } from '../../../../core/auth/test-jwt.util';
import { LocaleService } from '../../../../core/localization/locale';
import type { RestaurantTable } from '../../data-access/restaurant-tables.models';
import { TablesManagementPage } from './tables-management-page';

const RESTAURANT_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

function tablesUrl(suffix = '') {
  return `${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/tables${suffix}`;
}

function restaurantUrl() {
  return `${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}`;
}

describe('TablesManagementPage', () => {
  let fixture: ComponentFixture<TablesManagementPage>;
  let httpMock: HttpTestingController;
  let session: AuthSessionService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TablesManagementPage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    session = TestBed.inject(AuthSessionService);
    session.clearSession();
    session.saveSession(createTestSession(ApplicationRoles.RestaurantOwner, RESTAURANT_ID));

    fixture = TestBed.createComponent(TablesManagementPage);
    fixture.detectChanges();
  });

  afterEach(() => {
    document.body.classList.remove('order-modal-scroll-lock');
    document.querySelectorAll('app-modal-shell, app-order-modal-shell').forEach((node) => node.remove());
    httpMock.verify();
    session.clearSession();
  });

  function root(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function flushList(tables: RestaurantTable[] = []): void {
    const restaurantReq = httpMock.expectOne(restaurantUrl());
    restaurantReq.flush({ slug: 'demo-restaurant', nameAr: 'مطعم', nameEn: 'Restaurant' });
    const req = httpMock.expectOne((r) => r.url === tablesUrl() && r.method === 'GET');
    expect(req.request.params.get('includeArchived')).toBe('true');
    req.flush(tables);
    fixture.detectChanges();
  }

  const sampleTable: RestaurantTable = {
    id: '11111111-1111-1111-1111-111111111101',
    name: 'Table 1',
    zone: 'Main Hall',
    publicToken: 'token-abc',
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: null,
  };

  // ───────────────────────── UX-007: safe table archiving ─────────────────────────

  it('archives a table after confirmation and hides it from the default list (UX-007)', () => {
    flushList([sampleTable, { ...sampleTable, id: '22222222-2222-2222-2222-222222222202', name: 'Table 2', publicToken: 'tok2' }]);
    vi.useFakeTimers();
    try {
      document.querySelector<HTMLButtonElement>('body');
      root().querySelector<HTMLButtonElement>(`[data-testid="table-archive-${sampleTable.id}"]`)!.click();
      fixture.detectChanges();

      expect(httpMock.match((r) => r.url.endsWith('/archive')).length).toBe(0); // nothing before confirming
      document.body.querySelector<HTMLButtonElement>('[data-testid="table-confirm-submit"]')!.click();

      const req = httpMock.expectOne(tablesUrl(`/${sampleTable.id}/archive`));
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ isArchived: true });
      req.flush({ ...sampleTable, isActive: false, isArchived: true, archivedAt: '2026-11-16T00:00:00Z' });
      fixture.detectChanges();

      expect(root().querySelector(`[data-testid="table-card-${sampleTable.id}"]`)).toBeNull();
      expect(root().querySelectorAll('app-table-card')).toHaveLength(1);
      expect(root().querySelector('[data-testid="tables-stat-total"]')!.textContent!.trim()).toBe('1');
    } finally {
      vi.useRealTimers();
    }
  });

  it('shows archived tables only under the archived filter, with a restore action (UX-007)', () => {
    const archived = { ...sampleTable, isActive: false, isArchived: true, archivedAt: '2026-11-01T00:00:00Z' };
    flushList([archived]);
    const page = fixture.componentInstance as any;

    expect(root().querySelector(`[data-testid="table-card-${archived.id}"]`)).toBeNull();

    page.setStatusFilter('archived');
    fixture.detectChanges();

    const card = root().querySelector(`[data-testid="table-card-${archived.id}"]`)!;
    expect(card).toBeTruthy();
    expect(card.querySelector(`[data-testid="table-edit-${archived.id}"]`)).toBeNull(); // no editing while archived
    const restore = card.querySelector(`[data-testid="table-archive-${archived.id}"]`) as HTMLButtonElement;
    expect(restore.getAttribute('aria-label')).toBe(TestBed.inject(LocaleService).uiText('actionRestore'));
  });

  it('restores an archived table as inactive (UX-007)', () => {
    const archived = { ...sampleTable, isActive: false, isArchived: true, archivedAt: '2026-11-01T00:00:00Z' };
    flushList([archived]);
    const page = fixture.componentInstance as any;
    page.setStatusFilter('archived');
    fixture.detectChanges();

    root().querySelector<HTMLButtonElement>(`[data-testid="table-archive-${archived.id}"]`)!.click();
    fixture.detectChanges();
    document.body.querySelector<HTMLButtonElement>('[data-testid="table-confirm-submit"]')!.click();

    const req = httpMock.expectOne(tablesUrl(`/${archived.id}/archive`));
    expect(req.request.body).toEqual({ isArchived: false });
    req.flush({ ...archived, isArchived: false, archivedAt: null });
    fixture.detectChanges();

    page.setStatusFilter('inactive');
    fixture.detectChanges();
    expect(root().querySelector(`[data-testid="table-card-${archived.id}"]`)).toBeTruthy();
  });

  it('offers icon-only actions on a table card with localized accessible names (UX-008)', () => {
    flushList([sampleTable]);
    const locale = TestBed.inject(LocaleService);
    const edit = root().querySelector(`[data-testid="table-edit-${sampleTable.id}"]`) as HTMLButtonElement;
    const print = root().querySelector(`[data-testid="table-print-${sampleTable.id}"]`) as HTMLButtonElement;

    expect(edit.getAttribute('aria-label')).toBe(locale.uiText('tablesActionEdit'));
    expect(print.getAttribute('aria-label')).toBe(locale.uiText('tablesActionPrint'));
    expect(edit.textContent?.trim()).toBe('');
    expect(edit.querySelector('svg')).toBeTruthy();
  });

  it('shows the page actions together in the header without a duplicate print action', () => {
    flushList([]);
    const locale = TestBed.inject(LocaleService);
    expect(root().textContent).toContain(locale.uiText('tablesPageTitle'));
    expect(root().querySelector('[data-testid="tables-add-button"]')).toBeTruthy();
    const printButtons = root().querySelectorAll('[data-testid="tables-print-all-button"]');
    expect(printButtons.length).toBe(1);
    expect(printButtons[0].closest('.tables-management-head')).toBeTruthy();
    expect(root().querySelector('.tables-management-print-help')).toBeNull();
  });

  it('loads tables on init and renders cards', async () => {
    flushList([sampleTable]);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(root().querySelector('[data-testid="tables-grid"]')).toBeTruthy();
    expect(root().querySelector('[data-testid="table-card-11111111-1111-1111-1111-111111111101"]')).toBeTruthy();
  });

  it('derives stats from loaded tables', async () => {
    flushList([
      sampleTable,
      {
        ...sampleTable,
        id: '22222222-2222-2222-2222-222222222202',
        name: 'Table 2',
        zone: 'Terrace',
        isActive: false,
      },
    ]);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(root().querySelector('[data-testid="tables-stat-total"]')?.textContent?.trim()).toBe('2');
    expect(root().querySelector('[data-testid="tables-stat-active"]')?.textContent?.trim()).toBe('1');
    expect(root().querySelector('[data-testid="tables-stat-zones"]')?.textContent?.trim()).toBe('2');
  });

  it('opens create modal without POST before submit', () => {
    flushList([]);
    root().querySelector<HTMLButtonElement>('[data-testid="tables-add-button"]')?.click();
    fixture.detectChanges();
    expect(document.body.querySelector('[data-testid="tables-create-modal"]')).toBeTruthy();
    expect(httpMock.match({ method: 'POST', url: tablesUrl() }).length).toBe(0);
  });

  it('shows empty state when list is empty', () => {
    flushList([]);
    expect(root().querySelector('[data-testid="tables-empty-state"]')).toBeTruthy();
  });

  it('renders polished QR preview with restaurant and table identity', async () => {
    flushList([sampleTable]);
    await fixture.whenStable();
    fixture.detectChanges();

    const preview = root().querySelector('[data-testid="table-qr-preview-11111111-1111-1111-1111-111111111101"]');
    expect(preview).toBeTruthy();
    expect(preview?.querySelector('[data-testid="table-qr-card-restaurant-name"]')?.textContent).toBeTruthy();
    expect(preview?.querySelector('[data-testid="table-qr-card-table-name"]')?.textContent?.trim()).toBe('Table 1');
    expect(preview?.querySelector('[data-testid="table-qr-card-zone"]')?.textContent?.trim()).toBe('Main Hall');
  });

  it('keeps the table name and zone in the same card header row', async () => {
    flushList([sampleTable]);
    await fixture.whenStable();
    fixture.detectChanges();

    const titleRow = root().querySelector('.table-card__title-row');
    expect(titleRow?.textContent).toContain('Table 1');
    expect(titleRow?.textContent).toContain('Main Hall');
    expect(root().querySelector('.table-card__title > p')).toBeNull();
  });

  it('shows the disabled ordering overlay from the real inactive table state', async () => {
    flushList([{ ...sampleTable, isActive: false }]);
    await fixture.whenStable();
    fixture.detectChanges();

    const locale = TestBed.inject(LocaleService);
    const overlay = root().querySelector(
      '[data-testid="table-inactive-overlay-11111111-1111-1111-1111-111111111101"]',
    );
    expect(overlay?.textContent).toContain(locale.uiText('tablesOrderTemporarilyDisabled'));
    expect(overlay?.textContent).toContain(locale.uiText('tablesReactivateNow'));

    root()
      .querySelector<HTMLButtonElement>(
        '[data-testid="table-reactivate-11111111-1111-1111-1111-111111111101"]',
      )
      ?.click();
    fixture.detectChanges();
    expect(document.body.querySelector('[data-testid="table-confirm-submit"]')).toBeTruthy();
  });

  it('preview card uses fixed preview dimensions without clipping table meta', async () => {
    flushList([sampleTable]);
    await fixture.whenStable();
    fixture.detectChanges();

    const preview = root().querySelector(
      '[data-testid="table-qr-preview-11111111-1111-1111-1111-111111111101"]',
    ) as HTMLElement;
    expect(preview.classList.contains('table-qr-card--preview')).toBe(true);
    expect(preview.querySelector('.table-qr-card__table-meta')).toBeTruthy();
    expect(preview.querySelector('[data-testid="table-qr-card-table-name"]')).toBeTruthy();
    expect(preview.querySelector('[data-testid="table-qr-card-zone"]')).toBeTruthy();
  });

  it('includes single-print 100mm sizing rules in page print styles', () => {
    flushList([]);

    const printScss = readFileSync(resolve(__dirname, 'tables-management-page.print.scss'), 'utf8');

    expect(printScss).toContain('tables-print-active');
    expect(printScss).toMatch(/100mm/);
    expect(printScss).toMatch(/150mm/);
    expect(printScss).toContain('.profile-console');
    expect(printScss).toContain('.table-card__actions');
  });

  it('prints only the dedicated card area after moving it to document body', async () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    flushList([sampleTable]);
    await fixture.whenStable();
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const printButton = root().querySelector<HTMLButtonElement>(
      '[data-testid="table-print-11111111-1111-1111-1111-111111111101"]',
    );
    expect(printButton).toBeTruthy();
    printButton!.click();

    await vi.waitUntil(() => printSpy.mock.calls.length === 1, { timeout: 3000 });
    await fixture.whenStable();

    expect(document.body.classList.contains('tables-print-active')).toBe(true);
    const printArea = document.body.querySelector('[data-testid="tables-print-area"]') as HTMLElement;
    expect(printArea).toBeTruthy();
    expect(printArea.querySelector('[data-testid="table-qr-print-11111111-1111-1111-1111-111111111101"]')).toBeTruthy();

    document.body.classList.remove('tables-print-active');
    printSpy.mockRestore();
  });

  it('updates summary count when filters change', () => {
    flushList([
      sampleTable,
      {
        ...sampleTable,
        id: '22222222-2222-2222-2222-222222222202',
        name: 'VIP 1',
        zone: 'VIP',
      },
    ]);

    const locale = TestBed.inject(LocaleService);
    expect(root().querySelector('[data-testid="tables-summary"]')?.textContent).toContain(
      locale.uiText('tablesShowingCount').replace('{shown}', '2').replace('{total}', '2'),
    );
    expect(
      root()
        .querySelector('[data-testid="tables-summary"]')
        ?.closest('.tables-management-workspace-top'),
    ).toBeTruthy();

    const searchInput = root().querySelector<HTMLInputElement>('[data-testid="tables-search-input"]');
    searchInput!.value = 'VIP';
    searchInput!.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(root().querySelector('[data-testid="tables-summary"]')?.textContent).toContain(
      locale.uiText('tablesShowingCount').replace('{shown}', '1').replace('{total}', '2'),
    );
  });

  it('dismisses action success feedback automatically', () => {
    flushList([sampleTable]);
    vi.useFakeTimers();

    try {
      root()
        .querySelector<HTMLButtonElement>(
          '[data-testid="table-toggle-status-11111111-1111-1111-1111-111111111101"]',
        )
        ?.click();
      fixture.detectChanges();
      document.body.querySelector<HTMLButtonElement>('[data-testid="table-confirm-submit"]')?.click();

      const request = httpMock.expectOne(
        tablesUrl('/11111111-1111-1111-1111-111111111101/status'),
      );
      expect(request.request.body).toEqual({ isActive: false });
      request.flush({ ...sampleTable, isActive: false });
      fixture.detectChanges();

      expect(root().querySelector('[data-testid="tables-success-message"]')).toBeTruthy();
      expect(
        root().querySelector('[data-testid="tables-success-message"] .floating-notification-pill'),
      ).toBeTruthy();
      vi.advanceTimersByTime(3999);
      fixture.detectChanges();
      expect(root().querySelector('[data-testid="tables-success-message"]')).toBeTruthy();

      vi.advanceTimersByTime(1);
      fixture.detectChanges();
      expect(root().querySelector('[data-testid="tables-success-message"]')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});

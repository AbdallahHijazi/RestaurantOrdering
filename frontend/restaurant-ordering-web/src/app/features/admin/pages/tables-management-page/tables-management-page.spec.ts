import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
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
    const req = httpMock.expectOne(tablesUrl());
    expect(req.request.method).toBe('GET');
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

  it('shows internal header title and add table button', () => {
    flushList([]);
    const locale = TestBed.inject(LocaleService);
    expect(root().textContent).toContain(locale.uiText('tablesPageTitle'));
    expect(root().querySelector('[data-testid="tables-add-button"]')).toBeTruthy();
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

    const searchInput = root().querySelector<HTMLInputElement>('[data-testid="tables-search-input"]');
    searchInput!.value = 'VIP';
    searchInput!.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(root().querySelector('[data-testid="tables-summary"]')?.textContent).toContain(
      locale.uiText('tablesShowingCount').replace('{shown}', '1').replace('{total}', '2'),
    );
  });
});

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { API_BASE_URL } from '../../core/config/api-config';
import { LocaleService } from '../../core/localization/locale';
import { PublicCartService } from './data-access/public-cart.service';
import { PublicMenuApiService } from './data-access/public-menu-api';
import { MOCK_PUBLIC_MENU } from './data-access/public-menu-mock.data';
import { MenuPage } from './pages/menu-page/menu-page';

function createActivatedRoute(slug: string, tableToken: string | null): ActivatedRoute {
  const queryParamMap = convertToParamMap(tableToken ? { table: tableToken } : {});
  const childSnapshot = { paramMap: convertToParamMap({}), queryParamMap };
  const parentSnapshot = {
    paramMap: convertToParamMap({ slug }),
    queryParamMap,
  };

  return {
    snapshot: childSnapshot,
    pathFromRoot: [
      { snapshot: { paramMap: convertToParamMap({}), queryParamMap } },
      { snapshot: parentSnapshot },
      { snapshot: childSnapshot },
    ],
  } as ActivatedRoute;
}

describe('MenuPage table flow', () => {
  let fixture: ComponentFixture<MenuPage>;
  let httpMock: HttpTestingController;
  let cart: PublicCartService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MenuPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: createActivatedRoute('restaurant-a', 'table-token-1'),
        },
      ],
    }).compileComponents();

    TestBed.inject(LocaleService).setLocale('en');
    httpMock = TestBed.inject(HttpTestingController);
    cart = TestBed.inject(PublicCartService);

    vi.spyOn(TestBed.inject(PublicMenuApiService), 'getMenuBySlug').mockReturnValue(
      of(MOCK_PUBLIC_MENU),
    );

    fixture = TestBed.createComponent(MenuPage);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
  });

  it('resolves table token from query and shows badge', () => {
    const resolveReq = httpMock.expectOne(
      (req) =>
        req.url === `${API_BASE_URL}/api/v1/public/restaurants/restaurant-a/tables/resolve` &&
        req.params.get('token') === 'table-token-1',
    );
    resolveReq.flush({
      tableId: '11111111-1111-1111-1111-111111111101',
      tableName: 'Table 5',
      zone: 'Terrace',
      restaurantId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    });
    fixture.detectChanges();

    expect(cart.hasTableSession()).toBe(true);
    expect(cart.tableToken()).toBe('table-token-1');
    expect(fixture.nativeElement.querySelector('[data-testid="public-menu-table-badge"]')?.textContent).toContain(
      'Table 5',
    );
  });
});

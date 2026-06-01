import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { API_BASE_URL } from '../../../../core/config/api-config';
import { LocaleService } from '../../../../core/localization/locale';
import { MOCK_PUBLIC_MENU } from '../../data-access/public-menu-mock.data';
import { MenuPage } from './menu-page';

function createActivatedRoute(slug: string | null): ActivatedRoute {
  const childSnapshot = { paramMap: convertToParamMap({}) };
  const parentSnapshot = { paramMap: convertToParamMap(slug ? { slug } : {}) };

  return {
    snapshot: childSnapshot,
    pathFromRoot: [
      { snapshot: { paramMap: convertToParamMap({}) } },
      { snapshot: parentSnapshot },
      { snapshot: childSnapshot },
    ],
  } as ActivatedRoute;
}

describe('MenuPage', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  afterEach(() => {
    httpMock?.verify();
  });

  async function createPage(slug: string | null): Promise<ComponentFixture<MenuPage>> {
    await TestBed.configureTestingModule({
      imports: [MenuPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: createActivatedRoute(slug) },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(MenuPage);
    fixture.detectChanges();
    return fixture;
  }

  async function settle(fixture: ComponentFixture<MenuPage>): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('renders mock menu for demo slug without HTTP or not-found state', async () => {
    const fixture = await createPage('demo');
    await settle(fixture);
    const root = fixture.nativeElement as HTMLElement;

    httpMock.expectNone(`${API_BASE_URL}/api/v1/public/restaurants/demo/menu`);
    expect(root.textContent).toContain(MOCK_PUBLIC_MENU.restaurant.nameAr);
    expect(root.textContent).not.toContain('المطعم غير موجود');
  });

  it('shows not-found when slug param is missing from the route tree', async () => {
    const fixture = await createPage(null);
    await settle(fixture);
    const root = fixture.nativeElement as HTMLElement;

    httpMock.expectNone(`${API_BASE_URL}/api/v1/public/restaurants/demo/menu`);
    expect(root.textContent).toContain('المطعم غير موجود');
  });

  it('requests API for a real slug and renders the response', async () => {
    const fixture = await createPage('the-botanist');

    const req = httpMock.expectOne(`${API_BASE_URL}/api/v1/public/restaurants/the-botanist/menu`);
    req.flush({
      id: '11111111-1111-1111-1111-111111111111',
      slug: 'the-botanist',
      nameAr: 'مطعم حقيقي',
      phoneNumber: '+966500000000',
      categories: [],
    });

    await settle(fixture);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('مطعم حقيقي');
  });

  it('shows restaurant not found for a real slug that returns 404', async () => {
    const fixture = await createPage('missing-restaurant');

    const req = httpMock.expectOne(`${API_BASE_URL}/api/v1/public/restaurants/missing-restaurant/menu`);
    req.flush('Not found', { status: 404, statusText: 'Not Found' });

    await settle(fixture);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('المطعم غير موجود');
  });

  it('shows error state with retry for a real slug network failure', async () => {
    const fixture = await createPage('the-botanist');

    const req = httpMock.expectOne(`${API_BASE_URL}/api/v1/public/restaurants/the-botanist/menu`);
    req.error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });

    await settle(fixture);
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('تعذر تحميل القائمة');
    expect(root.querySelector('.error-state__retry')).toBeTruthy();
  });

  it('switches visible menu content by clicking the language switcher (DOM)', async () => {
    const fixture = await createPage('demo');
    await settle(fixture);

    const root = fixture.nativeElement as HTMLElement;
    const locale = TestBed.inject(LocaleService);
    locale.setLocale('ar');
    fixture.detectChanges();

    expect(root.textContent).toContain(MOCK_PUBLIC_MENU.restaurant.nameAr);
    expect(root.textContent).toContain('المقبلات');
    expect(root.textContent).toContain('سلطة الأعشاب الموسمية');
    expect(document.documentElement.dir).toBe('rtl');

    const enButton = root.querySelector(
      'app-language-switcher button.language-switcher__btn:nth-of-type(2)',
    ) as HTMLButtonElement | null;
    expect(enButton).toBeTruthy();

    enButton!.click();
    await settle(fixture);

    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');
    expect(root.textContent).toContain('The Botanist');
    expect(root.textContent).toContain('Starters');
    expect(root.textContent).toContain('Seasonal Herb Salad');
    expect(root.textContent).not.toContain('عالم النبات');

    const arButton = root.querySelector(
      'app-language-switcher button.language-switcher__btn:nth-of-type(1)',
    ) as HTMLButtonElement | null;
    expect(arButton).toBeTruthy();

    arButton!.click();
    await settle(fixture);

    expect(document.documentElement.lang).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');
    expect(root.textContent).toContain('عالم النبات');
    expect(root.textContent).toContain('المقبلات');
    expect(root.textContent).not.toContain('The Botanist');
  });
});

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { firstValueFrom, lastValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api-config';
import {
  PublicMenuApiService,
  isDemoMenuSlug,
} from './public-menu-api';
import { DEMO_RESTAURANT_SLUG, MOCK_PUBLIC_MENU } from './public-menu-mock.data';

describe('PublicMenuApiService', () => {
  let service: PublicMenuApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });

    service = TestBed.inject(PublicMenuApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('loads mock data directly for demo slug without HTTP', async () => {
    const result = await firstValueFrom(service.getMenuBySlug('demo'));

    expect(result.restaurant.slug).toBe(DEMO_RESTAURANT_SLUG);
    expect(result.items.length).toBeGreaterThanOrEqual(9);
    httpMock.expectNone(`${API_BASE_URL}/api/v1/public/restaurants/demo/menu`);
  });

  it('isDemoMenuSlug matches demo only', () => {
    expect(isDemoMenuSlug('demo')).toBe(true);
    expect(isDemoMenuSlug(' DEMO ')).toBe(true);
    expect(isDemoMenuSlug('the-botanist')).toBe(false);
  });

  it('requests API for a real slug', async () => {
    const promise = firstValueFrom(service.getMenuBySlug('the-botanist'));

    const req = httpMock.expectOne(
      `${API_BASE_URL}/api/v1/public/restaurants/the-botanist/menu`,
    );
    expect(req.request.method).toBe('GET');
    req.flush({
      id: '11111111-1111-1111-1111-111111111111',
      slug: 'the-botanist',
      nameAr: 'مطعم',
      phoneNumber: '+966500000000',
      categories: [],
    });

    const result = await promise;
    expect(result.restaurant.slug).toBe('the-botanist');
  });

  it('does not fall back to mock data when a real slug returns 404', async () => {
    const promise = lastValueFrom(service.getMenuBySlug('missing-restaurant'));

    const req = httpMock.expectOne(
      `${API_BASE_URL}/api/v1/public/restaurants/missing-restaurant/menu`,
    );
    req.flush('Not found', { status: 404, statusText: 'Not Found' });

    await expect(promise).rejects.toEqual({ type: 'not-found' });
  });

  it('does not fall back to mock data when a real slug returns 500', async () => {
    const promise = lastValueFrom(service.getMenuBySlug('broken-menu'));

    const req = httpMock.expectOne(
      `${API_BASE_URL}/api/v1/public/restaurants/broken-menu/menu`,
    );
    req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });

    await expect(promise).rejects.toMatchObject({ type: 'network' });
  });
});

describe('MOCK_PUBLIC_MENU localization', () => {
  it('keeps Arabic item names free of Latin characters', () => {
    const latinInArabic = /[A-Za-z]/;

    for (const item of MOCK_PUBLIC_MENU.items) {
      expect(latinInArabic.test(item.nameAr)).toBe(false);
      expect(item.nameEn?.trim().length).toBeGreaterThan(0);
    }
  });

  it('uses the corrected hummus Arabic name', () => {
    const hummus = MOCK_PUBLIC_MENU.items.find((item) => item.id === 'item-2');
    expect(hummus?.nameAr).toBe('حمص بالكمأ');
    expect(hummus?.nameEn).toBe('Truffle Hummus');
  });
});

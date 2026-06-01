import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../config/api-config';
import { AuthSessionService } from './auth-session.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let session: AuthSessionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    session = TestBed.inject(AuthSessionService);
    session.clearSession();
  });

  afterEach(() => {
    httpMock.verify();
    session.clearSession();
  });

  function saveValidSession(): void {
    session.saveSession({
      accessToken: 'jwt-token',
      expiresAtUtc: new Date(Date.now() + 60_000).toISOString(),
      restaurantId: null,
    });
  }

  it('attaches token to admin requests', () => {
    saveValidSession();
    http.get(`${API_BASE_URL}/api/v1/admin/restaurants/111`).subscribe();

    const req = httpMock.expectOne(`${API_BASE_URL}/api/v1/admin/restaurants/111`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer jwt-token');
    req.flush({});
  });

  it('does not attach token to login requests', () => {
    saveValidSession();
    http.post(`${API_BASE_URL}/api/v1/auth/login`, {}).subscribe();

    const req = httpMock.expectOne(`${API_BASE_URL}/api/v1/auth/login`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('does not attach token to public requests', () => {
    saveValidSession();
    http.get(`${API_BASE_URL}/api/v1/public/restaurants/demo/menu`).subscribe();

    const req = httpMock.expectOne(`${API_BASE_URL}/api/v1/public/restaurants/demo/menu`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('does not attach token to external URLs', () => {
    saveValidSession();
    http.get('https://example.com/api/v1/admin/restaurants/111').subscribe();

    const req = httpMock.expectOne('https://example.com/api/v1/admin/restaurants/111');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('does not attach token to http://localhost:5000 admin URLs', () => {
    saveValidSession();
    http.get('http://localhost:5000/api/v1/admin/restaurants/111').subscribe();

    const req = httpMock.expectOne('http://localhost:5000/api/v1/admin/restaurants/111');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('does not attach header when session is expired', () => {
    session.saveSession({
      accessToken: 'jwt-token',
      expiresAtUtc: new Date(Date.now() - 1_000).toISOString(),
      restaurantId: null,
    });

    http.get(`${API_BASE_URL}/api/v1/admin/restaurants/111`).subscribe();

    const req = httpMock.expectOne(`${API_BASE_URL}/api/v1/admin/restaurants/111`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });
});

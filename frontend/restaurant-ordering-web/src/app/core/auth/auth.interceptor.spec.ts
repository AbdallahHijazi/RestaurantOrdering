import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { API_BASE_URL } from '../config/api-config';
import { routes } from '../../app.routes';
import { ApplicationRoles } from './application-roles';
import { AuthSessionService } from './auth-session.service';
import { AuthService } from './auth.service';
import { authInterceptor } from './auth.interceptor';
import { createTestSession } from './test-jwt.util';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let session: AuthSessionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter(routes),
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
    session.saveSession(createTestSession(ApplicationRoles.RestaurantOwner));
  }

  it('attaches token to admin requests', () => {
    saveValidSession();
    const token = session.getAccessToken();
    http.get(`${API_BASE_URL}/api/v1/admin/restaurants/111`).subscribe();

    const req = httpMock.expectOne(`${API_BASE_URL}/api/v1/admin/restaurants/111`);
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
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
    const expired = {
      ...createTestSession(ApplicationRoles.RestaurantOwner),
      expiresAtUtc: new Date(Date.now() - 1_000).toISOString(),
    };
    session.saveSession(expired);

    http.get(`${API_BASE_URL}/api/v1/admin/restaurants/111`).subscribe();

    const req = httpMock.expectOne(`${API_BASE_URL}/api/v1/admin/restaurants/111`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('clears session on admin 401 and triggers login redirect', async () => {
    saveValidSession();
    const authService = TestBed.inject(AuthService);
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigateByUrl');

    http.get(`${API_BASE_URL}/api/v1/admin/restaurants/111`).subscribe({
      error: () => undefined,
    });

    const req = httpMock.expectOne(`${API_BASE_URL}/api/v1/admin/restaurants/111`);
    req.flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(session.hasValidSession()).toBe(false);
    expect(authService.isAuthenticated()).toBe(false);
    expect(navigateSpy).toHaveBeenCalledWith('/login');
  });

  it('does not clear session when login returns 401', () => {
    saveValidSession();

    http.post(`${API_BASE_URL}/api/v1/auth/login`, {}).subscribe({
      error: () => undefined,
    });

    const req = httpMock.expectOne(`${API_BASE_URL}/api/v1/auth/login`);
    req.flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(session.hasValidSession()).toBe(true);
  });
});

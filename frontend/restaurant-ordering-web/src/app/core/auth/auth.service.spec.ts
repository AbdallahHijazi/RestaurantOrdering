import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { API_BASE_URL } from '../config/api-config';
import { ApplicationRoles } from './application-roles';
import { AuthSessionService } from './auth-session.service';
import { AuthService } from './auth.service';
import { LoginError } from './auth.models';
import { createTestAccessToken } from './test-jwt.util';
import { routes } from '../../app.routes';

describe('AuthService', () => {
  let service: AuthService;
  let session: AuthSessionService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter(routes)],
    });

    service = TestBed.inject(AuthService);
    session = TestBed.inject(AuthSessionService);
    httpMock = TestBed.inject(HttpTestingController);
    session.clearSession();
  });

  afterEach(() => {
    httpMock.verify();
    session.clearSession();
  });

  function createOwnerToken(): string {
    return createTestAccessToken({
      role: ApplicationRoles.RestaurantOwner,
      restaurantId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    });
  }

  function createUnsupportedRoleToken(): string {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    const body = btoa(
      JSON.stringify({
        sub: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        role: 'SuperAdmin',
        restaurant_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      }),
    )
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    return `${header}.${body}.test-signature`;
  }

  it('posts to https://localhost:7167/api/v1/auth/login', () => {
    expect(API_BASE_URL).toBe('https://localhost:7167');

    service.login(' owner@test.local ', ' secret ').subscribe();

    const req = httpMock.expectOne('https://localhost:7167/api/v1/auth/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      email: 'owner@test.local',
      password: ' secret ',
    });
    req.flush({
      accessToken: createOwnerToken(),
      expiresAtUtc: new Date(Date.now() + 60_000).toISOString(),
      userId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      restaurantId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    });
  });

  it('saves session with role after success', () => {
    service.login('owner@test.local', 'P@ssw0rd').subscribe();

    const req = httpMock.expectOne(`${API_BASE_URL}/api/v1/auth/login`);
    req.flush({
      accessToken: createOwnerToken(),
      expiresAtUtc: new Date(Date.now() + 60_000).toISOString(),
      userId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      restaurantId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    });

    expect(session.getAccessToken()).not.toBeNull();
    expect(service.currentRole()).toBe(ApplicationRoles.RestaurantOwner);
    expect(service.restaurantId()).toBe('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
    expect(service.isAuthenticated()).toBe(true);
  });

  it('rejects login when token has unsupported role', () => {
    let error: unknown;

    service.login('owner@test.local', 'P@ssw0rd').subscribe({
      error: (err) => {
        error = err;
      },
    });

    const req = httpMock.expectOne(`${API_BASE_URL}/api/v1/auth/login`);
    req.flush({
      accessToken: createUnsupportedRoleToken(),
      expiresAtUtc: new Date(Date.now() + 60_000).toISOString(),
      userId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      restaurantId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    });

    expect(error).toBeInstanceOf(LoginError);
    expect((error as LoginError).code).toBe('unsupported-role');
    expect(session.getAccessToken()).toBeNull();
  });

  it('does not save session after 401', () => {
    let error: unknown;

    service.login('owner@test.local', 'wrong').subscribe({
      error: (err) => {
        error = err;
      },
    });

    const req = httpMock.expectOne(`${API_BASE_URL}/api/v1/auth/login`);
    req.flush({ title: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(error).toBeInstanceOf(LoginError);
    expect((error as LoginError).code).toBe('invalid-credentials');
    expect(session.getAccessToken()).toBeNull();
  });

  it('clears session on logout', () => {
    session.saveSession({
      accessToken: createOwnerToken(),
      expiresAtUtc: new Date(Date.now() + 60_000).toISOString(),
      userId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      restaurantId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      role: ApplicationRoles.RestaurantOwner,
    });
    service.restoreSessionFromStorage();

    service.logout({ navigate: false });
    expect(session.getAccessToken()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });

  it('restores session from storage on startup', () => {
    session.saveSession({
      accessToken: createOwnerToken(),
      expiresAtUtc: new Date(Date.now() + 60_000).toISOString(),
      userId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      restaurantId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      role: ApplicationRoles.RestaurantOwner,
    });

    const freshService = TestBed.inject(AuthService);
    freshService.restoreSessionFromStorage();

    expect(freshService.isAuthenticated()).toBe(true);
    expect(freshService.currentRole()).toBe(ApplicationRoles.RestaurantOwner);
  });
});

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../config/api-config';
import { AuthSessionService } from './auth-session.service';
import { AuthService } from './auth.service';
import { LoginError } from './auth.models';

describe('AuthService', () => {
  let service: AuthService;
  let session: AuthSessionService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
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
      accessToken: 'jwt-token',
      expiresAtUtc: new Date(Date.now() + 60_000).toISOString(),
      userId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      restaurantId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    });
  });

  it('saves session after success', () => {
    const expiresAtUtc = new Date(Date.now() + 60_000).toISOString();

    service.login('owner@test.local', 'P@ssw0rd').subscribe();

    const req = httpMock.expectOne(`${API_BASE_URL}/api/v1/auth/login`);
    req.flush({
      accessToken: 'jwt-token',
      expiresAtUtc,
      userId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      restaurantId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    });

    expect(session.getAccessToken()).toBe('jwt-token');
    expect(session.getRestaurantId()).toBe('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
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
      accessToken: 'jwt-token',
      expiresAtUtc: new Date(Date.now() + 60_000).toISOString(),
      restaurantId: null,
    });

    service.logout();
    expect(session.getAccessToken()).toBeNull();
  });
});

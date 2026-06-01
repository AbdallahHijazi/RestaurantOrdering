import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthSessionService } from './auth-session.service';
import { authGuard } from './auth.guard';
import { routes } from '../../app.routes';

describe('authGuard', () => {
  let session: AuthSessionService;
  let router: Router;

  beforeEach(() => {
    TestBed.resetTestingModule();

    TestBed.configureTestingModule({
      providers: [provideRouter(routes)],
    });

    session = TestBed.inject(AuthSessionService);
    router = TestBed.inject(Router);
    session.clearSession();
  });

  afterEach(() => {
    session.clearSession();
  });

  it('allows access with a valid session', async () => {
    session.saveSession({
      accessToken: 'jwt-token',
      expiresAtUtc: new Date(Date.now() + 60_000).toISOString(),
      restaurantId: null,
    });

    await router.navigateByUrl('/admin/dashboard');
    expect(router.url).toContain('/admin/dashboard');
  });

  it('redirects to /login without session', async () => {
    await router.navigateByUrl('/admin/restaurant-profile');
    expect(router.url).toContain('/login');
    expect(router.url).toContain('returnUrl=%2Fadmin%2Frestaurant-profile');
  });

  it('clears expired session and redirects to login', async () => {
    session.saveSession({
      accessToken: 'jwt-token',
      expiresAtUtc: new Date(Date.now() - 1_000).toISOString(),
      restaurantId: null,
    });

    await router.navigateByUrl('/admin/dashboard');
    expect(router.url).toContain('/login');
    expect(session.hasValidSession()).toBe(false);
  });

  it('allows /login without auth', async () => {
    await router.navigateByUrl('/login');
    expect(router.url).toBe('/login');
  });

  it('protects /admin/dashboard', async () => {
    await router.navigateByUrl('/admin/dashboard');
    expect(router.url).toContain('/login');
  });

  it('keeps public menu accessible without auth', async () => {
    await router.navigateByUrl('/r/demo/menu');
    expect(router.url).toBe('/r/demo/menu');
  });
});

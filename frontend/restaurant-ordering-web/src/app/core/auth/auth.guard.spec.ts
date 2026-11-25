import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthSessionService } from './auth-session.service';
import { routes } from '../../app.routes';
import { ApplicationRoles } from './application-roles';
import { createTestSession } from './test-jwt.util';

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
    session.saveSession(createTestSession(ApplicationRoles.RestaurantOwner));

    await router.navigateByUrl('/admin/dashboard');
    expect(router.url).toBe('/admin/dashboard');
  });

  it('redirects to /login without session', async () => {
    await router.navigateByUrl('/admin/dashboard');
    expect(router.url).toContain('/login');
    expect(router.url).toContain('returnUrl=%2Fadmin%2Fdashboard');
  });

  it('allows /login without auth', async () => {
    await router.navigateByUrl('/login');
    expect(router.url).toBe('/login');
  });

  it('keeps public menu accessible without auth', async () => {
    await router.navigateByUrl('/r/demo/menu');
    expect(router.url).toBe('/r/demo/menu');
  });
});

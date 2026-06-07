import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { ApplicationRoles } from './application-roles';
import { AuthSessionService } from './auth-session.service';
import { resolvePostLoginRoute } from './safe-return-url.util';
import { routes } from '../../app.routes';
import { createTestSession } from './test-jwt.util';

describe('role-aware routing', () => {
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

  it('redirects /admin to /admin/dashboard for RestaurantOwner', async () => {
    session.saveSession(createTestSession(ApplicationRoles.RestaurantOwner));
    await router.navigateByUrl('/admin');
    expect(router.url).toBe('/admin/dashboard');
  });

  it('allows RestaurantOwner to open /admin/dashboard', async () => {
    session.saveSession(createTestSession(ApplicationRoles.RestaurantOwner));
    await router.navigateByUrl('/admin/dashboard');
    expect(router.url).toBe('/admin/dashboard');
  });

  it('allows RestaurantOwner to open /admin/orders', async () => {
    session.saveSession(createTestSession(ApplicationRoles.RestaurantOwner));
    await router.navigateByUrl('/admin/orders');
    expect(router.url).toBe('/admin/orders');
  });

  it('allows RestaurantManager to open /admin/orders', async () => {
    session.saveSession(createTestSession(ApplicationRoles.RestaurantManager));
    await router.navigateByUrl('/admin/orders');
    expect(router.url).toBe('/admin/orders');
  });

  it('redirects KitchenManager from /admin/orders to /kitchen', async () => {
    session.saveSession(createTestSession(ApplicationRoles.KitchenManager));
    await router.navigateByUrl('/admin/orders');
    expect(router.url).toBe('/kitchen');
  });

  it('redirects guest from /admin/orders to /login', async () => {
    await router.navigateByUrl('/admin/orders');
    expect(router.url).toContain('/login');
  });

  it('redirects RestaurantManager from /admin/restaurant-profile to /admin/dashboard', async () => {
    session.saveSession(createTestSession(ApplicationRoles.RestaurantManager));
    await router.navigateByUrl('/admin/restaurant-profile');
    expect(router.url).toBe('/admin/dashboard');
  });

  it('allows RestaurantOwner to open /admin/restaurant-profile', async () => {
    session.saveSession(createTestSession(ApplicationRoles.RestaurantOwner));
    await router.navigateByUrl('/admin/restaurant-profile');
    expect(router.url).toBe('/admin/restaurant-profile');
  });

  it('allows RestaurantOwner to open /admin/staff', async () => {
    session.saveSession(createTestSession(ApplicationRoles.RestaurantOwner));
    await router.navigateByUrl('/admin/staff');
    expect(router.url).toBe('/admin/staff');
  });

  it('allows RestaurantOwner to open /admin/tables', async () => {
    session.saveSession(createTestSession(ApplicationRoles.RestaurantOwner));
    await router.navigateByUrl('/admin/tables');
    expect(router.url).toBe('/admin/tables');
  });

  it('redirects RestaurantManager from /admin/staff to /admin/dashboard', async () => {
    session.saveSession(createTestSession(ApplicationRoles.RestaurantManager));
    await router.navigateByUrl('/admin/staff');
    expect(router.url).toBe('/admin/dashboard');
  });

  it('redirects RestaurantManager from /admin/tables to /admin/dashboard', async () => {
    session.saveSession(createTestSession(ApplicationRoles.RestaurantManager));
    await router.navigateByUrl('/admin/tables');
    expect(router.url).toBe('/admin/dashboard');
  });

  it('allows RestaurantOwner to open /admin/menu', async () => {
    session.saveSession(createTestSession(ApplicationRoles.RestaurantOwner));
    await router.navigateByUrl('/admin/menu');
    expect(router.url).toBe('/admin/menu');
  });

  it('allows RestaurantManager to open /admin/menu', async () => {
    session.saveSession(createTestSession(ApplicationRoles.RestaurantManager));
    await router.navigateByUrl('/admin/menu');
    expect(router.url).toBe('/admin/menu');
  });

  it('redirects KitchenManager from /admin/menu to /kitchen', async () => {
    session.saveSession(createTestSession(ApplicationRoles.KitchenManager));
    await router.navigateByUrl('/admin/menu');
    expect(router.url).toBe('/kitchen');
  });

  it('redirects guest from /admin/menu to /login', async () => {
    await router.navigateByUrl('/admin/menu');
    expect(router.url).toContain('/login');
  });

  it('redirects KitchenManager from /admin/staff to /kitchen', async () => {
    session.saveSession(createTestSession(ApplicationRoles.KitchenManager));
    await router.navigateByUrl('/admin/staff');
    expect(router.url).toBe('/kitchen');
  });

  it('redirects guest from /admin/staff to /login', async () => {
    await router.navigateByUrl('/admin/staff');
    expect(router.url).toContain('/login');
  });

  it('redirects guest from /admin/tables to /login', async () => {
    await router.navigateByUrl('/admin/tables');
    expect(router.url).toContain('/login');
  });

  it('redirects KitchenManager from /admin/restaurant-profile to /kitchen', async () => {
    session.saveSession(createTestSession(ApplicationRoles.KitchenManager));
    await router.navigateByUrl('/admin/restaurant-profile');
    expect(router.url).toBe('/kitchen');
  });

  it('allows KitchenManager to open /kitchen', async () => {
    session.saveSession(createTestSession(ApplicationRoles.KitchenManager));
    await router.navigateByUrl('/kitchen');
    expect(router.url).toBe('/kitchen');
  });

  it('redirects RestaurantOwner from /kitchen to /admin/dashboard', async () => {
    session.saveSession(createTestSession(ApplicationRoles.RestaurantOwner));
    await router.navigateByUrl('/kitchen');
    expect(router.url).toBe('/admin/dashboard');
  });

  it('redirects RestaurantManager from /kitchen to /admin/dashboard', async () => {
    session.saveSession(createTestSession(ApplicationRoles.RestaurantManager));
    await router.navigateByUrl('/kitchen');
    expect(router.url).toBe('/admin/dashboard');
  });

  it('redirects guest from /kitchen to /login', async () => {
    await router.navigateByUrl('/kitchen');
    expect(router.url).toContain('/login');
  });

  it('routes authenticated RestaurantOwner away from /login to /admin/dashboard', async () => {
    session.saveSession(createTestSession(ApplicationRoles.RestaurantOwner));
    await router.navigateByUrl('/login');
    expect(router.url).toBe('/admin/dashboard');
  });

  it('routes authenticated KitchenManager away from /login to /kitchen', async () => {
    session.saveSession(createTestSession(ApplicationRoles.KitchenManager));
    await router.navigateByUrl('/login');
    expect(router.url).toBe('/kitchen');
  });

  it('redirects unauthenticated users to /login for protected routes', async () => {
    await router.navigateByUrl('/admin/dashboard');
    expect(router.url).toContain('/login');
    expect(router.url).toContain('returnUrl=%2Fadmin%2Fdashboard');
  });

  it('does not let KitchenManager use admin returnUrl after login', () => {
    const destination = resolvePostLoginRoute(
      '/admin/restaurant-profile',
      ApplicationRoles.KitchenManager,
    );
    expect(destination).toBe('/kitchen');
  });

  it('clears expired session and redirects to login', async () => {
    const expired = {
      ...createTestSession(ApplicationRoles.RestaurantOwner),
      expiresAtUtc: new Date(Date.now() - 1_000).toISOString(),
    };
    session.saveSession(expired);

    await router.navigateByUrl('/admin/dashboard');
    expect(router.url).toContain('/login');
    expect(session.hasValidSession()).toBe(false);
  });

  it('clears malformed token session without crashing', async () => {
    sessionStorage.setItem(
      'restaurant-ordering.auth.session',
      JSON.stringify({
        accessToken: 'not-a-jwt',
        expiresAtUtc: new Date(Date.now() + 60_000).toISOString(),
        userId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        restaurantId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        role: ApplicationRoles.RestaurantOwner,
      }),
    );

    await expect(router.navigateByUrl('/admin/dashboard')).resolves.toBe(true);
    expect(router.url).toContain('/login');
    expect(session.hasValidSession()).toBe(false);
  });
});

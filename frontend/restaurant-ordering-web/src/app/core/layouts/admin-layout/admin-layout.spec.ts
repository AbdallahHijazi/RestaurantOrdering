import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router, RouterOutlet } from '@angular/router';
import { ApplicationRoles } from '../../auth/application-roles';
import { AuthService } from '../../auth/auth.service';
import { authGuard } from '../../auth/auth.guard';
import { roleGuard } from '../../auth/role.guard';
import { AuthSessionService } from '../../auth/auth-session.service';
import { createTestSession } from '../../auth/test-jwt.util';
import { API_BASE_URL } from '../../config/api-config';
import { LocaleService } from '../../localization/locale';
import { routes } from '../../../app.routes';
import { AdminBrandingService } from './admin-branding.service';
import { AdminLayout } from './admin-layout';
import { ProfileConsoleLayout } from '../profile-console-layout/profile-console-layout';

const adminRoles = [ApplicationRoles.RestaurantOwner, ApplicationRoles.RestaurantManager];

function flushLocaleSettings(httpMock: HttpTestingController): void {
  for (const req of httpMock.match(() => true)) {
    if (req.cancelled || !req.request.url.includes('/locales')) {
      continue;
    }

    req.flush({
      defaultLocale: 'ar',
      translationMode: 'ManualOnly',
      supportedLocales: [
        { code: 'ar', isEnabled: true, sortOrder: 1 },
        { code: 'en', isEnabled: true, sortOrder: 2 },
      ],
      availableLocales: [
        { code: 'ar', displayName: 'Arabic', nativeName: 'العربية', direction: 'rtl' },
        { code: 'en', displayName: 'English', nativeName: 'English', direction: 'ltr' },
      ],
      canManageLocales: true,
    });
  }
}

describe('AdminLayout', () => {
  let fixture: ComponentFixture<AdminLayout>;
  let router: Router;
  let session: AuthSessionService;
  let auth: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminLayout],
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    session = TestBed.inject(AuthSessionService);
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    session.clearSession();
    session.saveSession(createTestSession(ApplicationRoles.RestaurantOwner));
    auth.restoreSessionFromStorage();

    fixture = TestBed.createComponent(AdminLayout);
    fixture.detectChanges();
    flushLocaleSettings(httpMock);
  });

  afterEach(() => {
    httpMock.match(() => true).forEach((req) => {
      if (!req.cancelled) {
        req.flush({});
      }
    });
    httpMock.verify({ ignoreCancelled: true });
    session.clearSession();
  });

  function navLinks(): HTMLAnchorElement[] {
    return Array.from(
      fixture.nativeElement.querySelectorAll('.admin-layout__nav a'),
    ) as HTMLAnchorElement[];
  }

  it('renders Dashboard and Restaurant Profile navigation links', () => {
    const hrefs = navLinks().map((link) => link.getAttribute('href'));
    expect(hrefs).toContain('/admin/dashboard');
    expect(hrefs).toContain('/admin/restaurant-profile');
    expect(hrefs).toContain('/admin/orders');
    expect(hrefs).toContain('/admin/menu');
    expect(hrefs).toContain('/admin/staff');
  });

  it('hides Restaurant Profile link for RestaurantManager', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [AdminLayout],
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    session = TestBed.inject(AuthSessionService);
    session.clearSession();
    session.saveSession(createTestSession(ApplicationRoles.RestaurantManager));
    TestBed.inject(AuthService).restoreSessionFromStorage();

    fixture = TestBed.createComponent(AdminLayout);
    fixture.detectChanges();
    flushLocaleSettings(httpMock);

    expect(
      fixture.nativeElement.querySelector('[data-testid="admin-nav-restaurant-profile"]'),
    ).toBeNull();
  });

  it('shows Restaurant Profile link for RestaurantOwner', () => {
    expect(
      fixture.nativeElement.querySelector('[data-testid="admin-nav-restaurant-profile"]'),
    ).toBeTruthy();
  });

  it('shows Orders link for RestaurantManager', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [AdminLayout],
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    session = TestBed.inject(AuthSessionService);
    session.clearSession();
    session.saveSession(createTestSession(ApplicationRoles.RestaurantManager));
    TestBed.inject(AuthService).restoreSessionFromStorage();

    fixture = TestBed.createComponent(AdminLayout);
    fixture.detectChanges();
    flushLocaleSettings(httpMock);

    expect(fixture.nativeElement.querySelector('[data-testid="admin-nav-orders"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="admin-nav-menu"]')).toBeTruthy();
  });

  it('shows logo fallback until a valid preview logo is available', () => {
    const branding = TestBed.inject(AdminBrandingService);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="admin-sidebar-logo-fallback"]')).toBeTruthy();

    branding.updateBranding({
      logoUrl: 'blob:http://localhost/logo-preview',
      coverImageUrl: null,
      nameAr: 'مطعم',
      nameEn: 'Restaurant',
    });
    fixture.detectChanges();

    const logo = fixture.nativeElement.querySelector('[data-testid="admin-sidebar-logo"]') as HTMLImageElement;
    expect(logo).toBeTruthy();
    expect(logo.getAttribute('src')).toBe('blob:http://localhost/logo-preview');
  });

  it('does not render Staff Management link for RestaurantManager', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [AdminLayout],
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    session = TestBed.inject(AuthSessionService);
    session.clearSession();
    session.saveSession(createTestSession(ApplicationRoles.RestaurantManager));
    TestBed.inject(AuthService).restoreSessionFromStorage();

    fixture = TestBed.createComponent(AdminLayout);
    fixture.detectChanges();
    flushLocaleSettings(httpMock);

    expect(fixture.nativeElement.querySelector('[data-testid="admin-nav-staff"]')).toBeNull();
  });

  it('marks the active route link', async () => {
    @Component({ template: '' })
    class StubPage {}

    @Component({ template: '<router-outlet />', imports: [RouterOutlet] })
    class Host {}

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [Host],
      providers: [
        provideRouter([
          {
            path: 'admin',
            component: AdminLayout,
            children: [
              { path: 'dashboard', component: StubPage },
              { path: 'orders', component: StubPage },
            ],
          },
        ]),
      ],
    }).compileComponents();

    const router = TestBed.inject(Router);
    const hostFixture = TestBed.createComponent(Host);
    await router.navigateByUrl('/admin/dashboard');
    await hostFixture.whenStable();
    hostFixture.detectChanges();

    const activeLink = hostFixture.nativeElement.querySelector(
      '.admin-layout__nav a.is-active',
    ) as HTMLAnchorElement | null;
    expect(activeLink).toBeTruthy();
    expect(activeLink?.getAttribute('href')).toMatch(/dashboard$/);
  });

  it('calls AuthService.logout when logout is triggered', () => {
    const logoutSpy = vi.spyOn(auth, 'logout');
    const sidebarLogout: HTMLButtonElement = fixture.nativeElement.querySelector(
      '[data-testid="admin-sidebar-logout"]',
    );
    sidebarLogout.click();
    expect(logoutSpy).toHaveBeenCalled();
  });

  it('keeps logout in sidebar footer and not in desktop header', () => {
    expect(fixture.nativeElement.querySelector('[data-testid="admin-sidebar-footer"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="admin-sidebar-logout"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="admin-header-logout"]')).toBeNull();
  });

  it('opens and closes the mobile sidebar drawer', () => {
    const root: HTMLElement = fixture.nativeElement.querySelector('.admin-layout');
    const toggle: HTMLButtonElement = fixture.nativeElement.querySelector(
      '[data-testid="admin-menu-toggle"]',
    );

    expect(root.classList.contains('admin-layout--drawer-open')).toBe(false);
    toggle.click();
    fixture.detectChanges();
    expect(root.classList.contains('admin-layout--drawer-open')).toBe(true);

    const backdrop: HTMLButtonElement =
      fixture.nativeElement.querySelector('.admin-layout__backdrop');
    backdrop.click();
    fixture.detectChanges();
    expect(root.classList.contains('admin-layout--drawer-open')).toBe(false);
  });

  it('keeps sidebar visible when switching locale from EN to AR on desktop layout', () => {
    const locale = TestBed.inject(LocaleService);
    const layout: HTMLElement = fixture.nativeElement.querySelector('.admin-layout');
    const sidebar: HTMLElement = fixture.nativeElement.querySelector('[data-testid="admin-sidebar"]');

    expect(layout.getAttribute('dir')).toBe('rtl');
    expect(sidebar).toBeTruthy();

    locale.setLocale('en');
    fixture.detectChanges();
    expect(layout.getAttribute('dir')).toBe('ltr');
    expect(fixture.nativeElement.querySelector('[data-testid="admin-sidebar"]')).toBeTruthy();

    locale.setLocale('ar');
    fixture.detectChanges();
    expect(layout.getAttribute('dir')).toBe('rtl');
    expect(fixture.nativeElement.querySelector('[data-testid="admin-sidebar"]')).toBeTruthy();
  });

  it('opens and closes the drawer in RTL', () => {
    const locale = TestBed.inject(LocaleService);
    locale.setLocale('ar');
    fixture.detectChanges();

    const root: HTMLElement = fixture.nativeElement.querySelector('.admin-layout');
    const toggle: HTMLButtonElement = fixture.nativeElement.querySelector(
      '[data-testid="admin-menu-toggle"]',
    );

    toggle.click();
    fixture.detectChanges();
    expect(root.getAttribute('dir')).toBe('rtl');
    expect(root.classList.contains('admin-layout--drawer-open')).toBe(true);

    toggle.click();
    fixture.detectChanges();
    expect(root.classList.contains('admin-layout--drawer-open')).toBe(false);
  });

  it('opens and closes the drawer in LTR', () => {
    const locale = TestBed.inject(LocaleService);
    locale.setLocale('en');
    fixture.detectChanges();

    const root: HTMLElement = fixture.nativeElement.querySelector('.admin-layout');
    const toggle: HTMLButtonElement = fixture.nativeElement.querySelector(
      '[data-testid="admin-menu-toggle"]',
    );

    toggle.click();
    fixture.detectChanges();
    expect(root.getAttribute('dir')).toBe('ltr');
    expect(root.classList.contains('admin-layout--drawer-open')).toBe(true);
  });

  it('closes the drawer after navigation', async () => {
    @Component({ template: '' })
    class StubPage {}

    @Component({ template: '<router-outlet />', imports: [RouterOutlet] })
    class Host {}

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [Host],
      providers: [
        provideRouter([
          {
            path: 'admin',
            component: AdminLayout,
            children: [
              { path: 'dashboard', component: StubPage },
              { path: 'orders', component: StubPage },
            ],
          },
        ]),
      ],
    }).compileComponents();

    const router = TestBed.inject(Router);
    const hostFixture = TestBed.createComponent(Host);
    await router.navigateByUrl('/admin/dashboard');
    hostFixture.detectChanges();

    const layout: HTMLElement = hostFixture.nativeElement.querySelector('.admin-layout');
    const toggle: HTMLButtonElement = hostFixture.nativeElement.querySelector(
      '[data-testid="admin-menu-toggle"]',
    );

    toggle.click();
    hostFixture.detectChanges();
    expect(layout.classList.contains('admin-layout--drawer-open')).toBe(true);

    await router.navigateByUrl('/admin/orders');
    hostFixture.detectChanges();
    expect(layout.classList.contains('admin-layout--drawer-open')).toBe(false);
  });
});

describe('Admin shell routing', () => {
  let router: Router;
  let session: AuthSessionService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    httpMock = TestBed.inject(HttpTestingController);
    session = TestBed.inject(AuthSessionService);
    router = TestBed.inject(Router);
    session.clearSession();
  });

  afterEach(() => {
    httpMock.match(() => true).forEach((req) => {
      if (!req.cancelled) {
        req.flush({});
      }
    });
    httpMock.verify({ ignoreCancelled: true });
    session.clearSession();
  });

  async function navigateAndFlush(url: string): Promise<boolean> {
    const navigation = router.navigateByUrl(url);
    await Promise.resolve();
    for (const req of httpMock.match(() => true)) {
      if (req.cancelled) {
        continue;
      }

      const requestUrl = req.request.url;

      if (requestUrl.includes('/locales')) {
        req.flush({
          defaultLocale: 'ar',
          translationMode: 'ManualOnly',
          supportedLocales: [
            { code: 'ar', isEnabled: true, sortOrder: 1 },
            { code: 'en', isEnabled: true, sortOrder: 2 },
          ],
          availableLocales: [
            { code: 'ar', displayName: 'Arabic', nativeName: 'العربية', direction: 'rtl' },
            { code: 'en', displayName: 'English', nativeName: 'English', direction: 'ltr' },
          ],
          canManageLocales: true,
        });
        continue;
      }

      if (requestUrl.includes('/restaurant-profile') || requestUrl.includes('/profile')) {
        req.flush({
          restaurant: {
            id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
            slug: 'demo',
            nameAr: 'مطعم',
            nameEn: 'Restaurant',
          },
          settings: {},
        });
        continue;
      }

      if (requestUrl.includes('/public/restaurants/') && requestUrl.includes('/menu')) {
        req.flush({
          id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
          slug: 'demo',
          nameAr: 'مطعم',
          nameEn: 'Restaurant',
          categories: [],
        });
        continue;
      }

      if (requestUrl.includes('/orders')) {
        req.flush({ items: [], totalCount: 0, pageNumber: 1, pageSize: 20 });
        continue;
      }

      req.flush({});
    }
    return navigation;
  }

  it('allows RestaurantOwner to open /admin/dashboard inside profile console layout', async () => {
    session.saveSession(createTestSession(ApplicationRoles.RestaurantOwner));
    await navigateAndFlush('/admin/dashboard');
    expect(router.url).toBe('/admin/dashboard');
  });

  it('renders unified top bar for all main admin routes without legacy sidebar', async () => {
    @Component({ template: '' })
    class StubPage {}

    @Component({ template: '<router-outlet />', imports: [RouterOutlet] })
    class Host {}

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [Host, ProfileConsoleLayout],
      providers: [
        provideRouter([
          {
            path: 'admin',
            canActivate: [authGuard, roleGuard],
            canActivateChild: [roleGuard],
            data: { roles: adminRoles },
            children: [
              { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
              {
                path: '',
                component: ProfileConsoleLayout,
                children: [
                  { path: 'dashboard', component: StubPage },
                  {
                    path: 'restaurant-profile',
                    data: { roles: [ApplicationRoles.RestaurantOwner] },
                    component: StubPage,
                  },
                  {
                    path: 'translation-review',
                    data: { roles: [ApplicationRoles.RestaurantOwner] },
                    component: StubPage,
                  },
                  { path: 'orders', component: StubPage },
                  { path: 'menu', component: StubPage },
                  {
                    path: 'staff',
                    data: { roles: [ApplicationRoles.RestaurantOwner] },
                    component: StubPage,
                  },
                  {
                    path: 'tables',
                    data: { roles: [ApplicationRoles.RestaurantOwner] },
                    component: StubPage,
                  },
                ],
              },
            ],
          },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    session = TestBed.inject(AuthSessionService);
    router = TestBed.inject(Router);
    session.clearSession();
    session.saveSession(createTestSession(ApplicationRoles.RestaurantOwner));
    TestBed.inject(AuthService).restoreSessionFromStorage();

    const hostFixture = TestBed.createComponent(Host);
    const adminPaths = [
      '/admin/dashboard',
      '/admin/restaurant-profile',
      '/admin/translation-review',
      '/admin/orders',
      '/admin/menu',
      '/admin/staff',
      '/admin/tables',
    ];

    for (const path of adminPaths) {
      await router.navigateByUrl(path);
      await hostFixture.whenStable();
      hostFixture.detectChanges();
      flushLocaleSettings(httpMock);

      expect(hostFixture.nativeElement.querySelector('app-admin-layout')).toBeNull();
      expect(hostFixture.nativeElement.querySelector('[data-testid="profile-console"]')).toBeTruthy();
      expect(hostFixture.nativeElement.querySelector('[data-testid="admin-sidebar"]')).toBeNull();
      expect(hostFixture.nativeElement.querySelectorAll('[data-testid="profile-console-header"]').length).toBe(1);
    }
  });

  it('redirects RestaurantManager from /admin/restaurant-profile to /admin/dashboard', async () => {
    session.saveSession(createTestSession(ApplicationRoles.RestaurantManager));
    await navigateAndFlush('/admin/restaurant-profile');
    expect(router.url).toBe('/admin/dashboard');
  });

  it('redirects KitchenManager away from /admin routes', async () => {
    session.saveSession(createTestSession(ApplicationRoles.KitchenManager));
    await navigateAndFlush('/admin/dashboard');
    expect(router.url).toBe('/kitchen');
  });

  it('renders profile console layout without admin sidebar on restaurant profile route', async () => {
    @Component({ template: '' })
    class StubPage {}

    @Component({ template: '<router-outlet />', imports: [RouterOutlet] })
    class Host {}

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [Host, ProfileConsoleLayout],
      providers: [
        provideRouter([
          {
            path: 'admin/restaurant-profile',
            component: ProfileConsoleLayout,
            children: [{ path: '', component: StubPage }],
          },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    session = TestBed.inject(AuthSessionService);
    router = TestBed.inject(Router);
    session.clearSession();
    session.saveSession(createTestSession(ApplicationRoles.RestaurantOwner));
    TestBed.inject(AuthService).restoreSessionFromStorage();

    const hostFixture = TestBed.createComponent(Host);
    await router.navigateByUrl('/admin/restaurant-profile');
    await hostFixture.whenStable();
    hostFixture.detectChanges();
    flushLocaleSettings(httpMock);

    expect(hostFixture.nativeElement.querySelector('app-admin-layout')).toBeNull();
    expect(hostFixture.nativeElement.querySelector('[data-testid="profile-console"]')).toBeTruthy();
    expect(hostFixture.nativeElement.querySelector('[data-testid="admin-sidebar"]')).toBeNull();
    expect(hostFixture.nativeElement.querySelector('router-outlet')).toBeTruthy();
  });
});

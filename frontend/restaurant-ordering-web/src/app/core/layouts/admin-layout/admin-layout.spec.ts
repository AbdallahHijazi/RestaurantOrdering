import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { provideRouter, Router, RouterOutlet } from '@angular/router';
import { ApplicationRoles } from '../../auth/application-roles';
import { AuthService } from '../../auth/auth.service';
import { AuthSessionService } from '../../auth/auth-session.service';
import { createTestSession } from '../../auth/test-jwt.util';
import { LocaleService } from '../../localization/locale';
import { routes } from '../../../app.routes';
import { AdminBrandingService } from './admin-branding.service';
import { AdminLayout } from './admin-layout';

describe('AdminLayout', () => {
  let fixture: ComponentFixture<AdminLayout>;
  let router: Router;
  let session: AuthSessionService;
  let auth: AuthService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminLayout],
      providers: [provideRouter(routes)],
    }).compileComponents();

    session = TestBed.inject(AuthSessionService);
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    session.clearSession();
    session.saveSession(createTestSession(ApplicationRoles.RestaurantOwner));
    auth.restoreSessionFromStorage();

    fixture = TestBed.createComponent(AdminLayout);
    fixture.detectChanges();
  });

  afterEach(() => {
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
      providers: [provideRouter(routes)],
    }).compileComponents();

    session = TestBed.inject(AuthSessionService);
    session.clearSession();
    session.saveSession(createTestSession(ApplicationRoles.RestaurantManager));
    TestBed.inject(AuthService).restoreSessionFromStorage();

    fixture = TestBed.createComponent(AdminLayout);
    fixture.detectChanges();

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
      providers: [provideRouter(routes)],
    }).compileComponents();

    session = TestBed.inject(AuthSessionService);
    session.clearSession();
    session.saveSession(createTestSession(ApplicationRoles.RestaurantManager));
    TestBed.inject(AuthService).restoreSessionFromStorage();

    fixture = TestBed.createComponent(AdminLayout);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="admin-nav-orders"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="admin-nav-menu"]')).toBeTruthy();
  });

  it('shows logo fallback until a valid preview logo is available', () => {
    const branding = TestBed.inject(AdminBrandingService);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="admin-sidebar-logo-fallback"]')).toBeTruthy();

    branding.updateBranding({
      logoUrl: 'blob:http://localhost/logo-preview',
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
      providers: [provideRouter(routes)],
    }).compileComponents();

    session = TestBed.inject(AuthSessionService);
    session.clearSession();
    session.saveSession(createTestSession(ApplicationRoles.RestaurantManager));
    TestBed.inject(AuthService).restoreSessionFromStorage();

    fixture = TestBed.createComponent(AdminLayout);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="admin-nav-staff"]')).toBeNull();
  });

  it('marks the active route link', async () => {
    @Component({ template: '<router-outlet />', imports: [RouterOutlet] })
    class Host {}

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [Host],
      providers: [provideRouter(routes)],
    }).compileComponents();

    session = TestBed.inject(AuthSessionService);
    router = TestBed.inject(Router);
    session.clearSession();
    session.saveSession(createTestSession(ApplicationRoles.RestaurantOwner));

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
    const sidebarLogout: HTMLButtonElement =
      fixture.nativeElement.querySelector('.admin-layout__sidebar-logout');
    sidebarLogout.click();
    expect(logoutSpy).toHaveBeenCalled();
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
    @Component({ template: '<router-outlet />', imports: [RouterOutlet] })
    class Host {}

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [Host],
      providers: [provideRouter(routes)],
    }).compileComponents();

    session = TestBed.inject(AuthSessionService);
    router = TestBed.inject(Router);
    session.clearSession();
    session.saveSession(createTestSession(ApplicationRoles.RestaurantOwner));

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

    await router.navigateByUrl('/admin/restaurant-profile');
    hostFixture.detectChanges();
    expect(layout.classList.contains('admin-layout--drawer-open')).toBe(false);
  });
});

describe('Admin shell routing', () => {
  let router: Router;
  let session: AuthSessionService;

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

  it('allows RestaurantOwner to open /admin/dashboard inside AdminLayout', async () => {
    session.saveSession(createTestSession(ApplicationRoles.RestaurantOwner));
    await router.navigateByUrl('/admin/dashboard');
    expect(router.url).toBe('/admin/dashboard');
  });

  it('redirects RestaurantManager from /admin/restaurant-profile to /admin/dashboard', async () => {
    session.saveSession(createTestSession(ApplicationRoles.RestaurantManager));
    await router.navigateByUrl('/admin/restaurant-profile');
    expect(router.url).toBe('/admin/dashboard');
  });

  it('redirects KitchenManager away from /admin routes', async () => {
    session.saveSession(createTestSession(ApplicationRoles.KitchenManager));
    await router.navigateByUrl('/admin/dashboard');
    expect(router.url).toBe('/kitchen');
  });

  it('renders RestaurantProfileSetupPage inside the admin layout outlet', async () => {
    @Component({ template: '<router-outlet />', imports: [RouterOutlet] })
    class Host {}

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [Host],
      providers: [provideRouter(routes)],
    }).compileComponents();

    session = TestBed.inject(AuthSessionService);
    router = TestBed.inject(Router);
    session.clearSession();
    session.saveSession(createTestSession(ApplicationRoles.RestaurantOwner));

    const hostFixture = TestBed.createComponent(Host);
    await router.navigateByUrl('/admin/restaurant-profile');
    hostFixture.detectChanges();

    expect(hostFixture.nativeElement.querySelector('app-admin-layout')).toBeTruthy();
    expect(hostFixture.nativeElement.querySelector('.profile-setup')).toBeTruthy();
  });
});

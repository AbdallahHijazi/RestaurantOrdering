import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router, RouterOutlet } from '@angular/router';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { ApplicationRoles } from '../../auth/application-roles';
import { AuthService } from '../../auth/auth.service';
import { LocaleService } from '../../localization/locale';
import { AdminBrandingService } from '../admin-layout/admin-branding.service';
import { ProfileConsoleLayout } from './profile-console-layout';

function setViewportWidth(width: number): void {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width,
  });
  window.dispatchEvent(new Event('resize'));
}

function getInjectedStyleText(): string {
  let cssText = '';
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      for (const rule of Array.from(sheet.cssRules)) {
        cssText += `${rule.cssText}\n`;
      }
    } catch {
      // Ignore inaccessible stylesheets in the test environment.
    }
  }
  return cssText;
}

describe('ProfileConsoleLayout', () => {
  let fixture: ComponentFixture<ProfileConsoleLayout>;
  let auth: { logout: ReturnType<typeof vi.fn>; hasAnyRole: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    setViewportWidth(1280);
    auth = {
      logout: vi.fn(),
      hasAnyRole: vi.fn((role: string) => role === ApplicationRoles.RestaurantOwner),
    };

    await TestBed.configureTestingModule({
      imports: [ProfileConsoleLayout],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
      ],
    }).compileComponents();

    TestBed.inject(LocaleService).setLocale('en');
    fixture = TestBed.createComponent(ProfileConsoleLayout);
    fixture.detectChanges();
  });

  it('renders compact header with five primary navigation links for owners', () => {
    expect(fixture.nativeElement.querySelector('[data-testid="profile-console-header"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.profile-console__header--compact')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="profile-console-header-start"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="profile-console-header-end"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="profile-console-nav-dashboard"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="profile-console-nav-profile"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="profile-console-nav-orders"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="profile-console-nav-menu"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="profile-console-nav-staff"]')).toBeTruthy();
  });

  it('defines desktop single-row balanced grid rules at min-width 1100px', () => {
    const cssText = getInjectedStyleText();

    expect(cssText).toContain('min-width: 1100px');
    expect(cssText).toContain('grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr)');
    expect(cssText).toContain('grid-template-areas: none');
    expect(cssText).toContain('grid-row: 1');
  });

  it('uses balanced three-zone header grid for true navigation centering on desktop', () => {
    const cssText = getInjectedStyleText();
    const nav = fixture.nativeElement.querySelector('.profile-console__header-nav') as HTMLElement;

    expect(cssText).toContain('grid-column: 2');
    expect(cssText).toContain('justify-self: center');
    expect(nav.classList.contains('profile-console__header-nav')).toBe(true);
    expect(getComputedStyle(nav).flexWrap).toBe('nowrap');
  });

  it('keeps desktop header on one row without multi-row grid areas', () => {
    const cssText = getInjectedStyleText();
    const header = fixture.nativeElement.querySelector(
      '[data-testid="profile-console-header"]',
    ) as HTMLElement;

    expect(cssText).toContain('grid-template-rows: auto');
    expect(cssText).toContain('header-start header-end');
    expect(getComputedStyle(header).alignItems).toBe('center');
  });

  it('uses two-row header layout on tablet widths only', () => {
    setViewportWidth(900);
    fixture.detectChanges();

    const header = fixture.nativeElement.querySelector(
      '[data-testid="profile-console-header"]',
    ) as HTMLElement;
    const nav = fixture.nativeElement.querySelector('.profile-console__header-nav') as HTMLElement;
    const headerStyle = getComputedStyle(header);

    expect(headerStyle.gridTemplateAreas).toContain('header-start');
    expect(headerStyle.gridTemplateAreas).toContain('header-nav');
    expect(getComputedStyle(nav).gridArea).toBe('header-nav');
  });

  it('supports RTL header zones without manual navigation margins', () => {
    TestBed.inject(LocaleService).setLocale('ar');
    fixture.detectChanges();

    const cssText = getInjectedStyleText();
    const root = fixture.nativeElement.querySelector('[data-testid="profile-console"]') as HTMLElement;
    const start = fixture.nativeElement.querySelector(
      '[data-testid="profile-console-header-start"]',
    ) as HTMLElement;
    const end = fixture.nativeElement.querySelector(
      '[data-testid="profile-console-header-end"]',
    ) as HTMLElement;

    expect(root.getAttribute('dir')).toBe('rtl');
    expect(cssText).toContain('[dir="rtl"]');
    expect(cssText).toContain('grid-column: 3');
    expect(cssText).toContain('grid-column: 1');
    expect(getComputedStyle(start).justifySelf).toBe('end');
    expect(getComputedStyle(end).justifySelf).toBe('start');
  });

  it('keeps navigation links on one flex row with horizontal overflow when needed', () => {
    setViewportWidth(900);
    fixture.detectChanges();

    const nav = fixture.nativeElement.querySelector('.profile-console__nav') as HTMLElement;
    const navStyle = getComputedStyle(nav);

    expect(navStyle.flexWrap).toBe('nowrap');
    expect(navStyle.overflowX).toBe('auto');
  });

  it('uses real admin sidebar route targets', () => {
    expect(
      fixture.nativeElement.querySelector('[data-testid="profile-console-nav-dashboard"]')?.getAttribute('href'),
    ).toBe('/admin/dashboard');
    expect(
      fixture.nativeElement.querySelector('[data-testid="profile-console-nav-profile"]')?.getAttribute('href'),
    ).toBe('/admin/restaurant-profile');
    expect(
      fixture.nativeElement.querySelector('[data-testid="profile-console-nav-orders"]')?.getAttribute('href'),
    ).toBe('/admin/orders');
    expect(
      fixture.nativeElement.querySelector('[data-testid="profile-console-nav-menu"]')?.getAttribute('href'),
    ).toBe('/admin/menu');
    expect(
      fixture.nativeElement.querySelector('[data-testid="profile-console-nav-staff"]')?.getAttribute('href'),
    ).toBe('/admin/staff');
  });

  it('shows restaurant avatar from cover image before logo', () => {
    const branding = TestBed.inject(AdminBrandingService);
    branding.updateBranding({
      logoUrl: 'https://example.test/logo.png',
      coverImageUrl: 'https://example.test/cover.png',
      nameAr: 'مطعم',
      nameEn: 'Restaurant',
    });
    fixture.detectChanges();

    const avatar = fixture.nativeElement.querySelector(
      '[data-testid="profile-console-brand-avatar"]',
    ) as HTMLImageElement;
    expect(avatar).toBeTruthy();
    expect(avatar.src).toContain('cover.png');
  });

  it('falls back to logo then initial when cover is unavailable', () => {
    const branding = TestBed.inject(AdminBrandingService);
    branding.updateBranding({
      logoUrl: 'https://example.test/logo.png',
      coverImageUrl: null,
      nameAr: 'مطعم',
      nameEn: 'Restaurant',
    });
    fixture.detectChanges();

    const avatar = fixture.nativeElement.querySelector(
      '[data-testid="profile-console-brand-avatar"]',
    ) as HTMLImageElement;
    expect(avatar.src).toContain('logo.png');
  });

  it('renders globe language toggle with target language label and icon-only logout', () => {
    const languageButton = fixture.nativeElement.querySelector(
      '[data-testid="profile-console-language-toggle"]',
    ) as HTMLButtonElement;
    const languageLabel = fixture.nativeElement.querySelector(
      '[data-testid="profile-console-language-label"]',
    ) as HTMLSpanElement;
    const logoutButton = fixture.nativeElement.querySelector(
      '[data-testid="profile-console-logout"]',
    ) as HTMLButtonElement;

    expect(languageButton.querySelector('svg')).toBeTruthy();
    expect(languageLabel.textContent?.trim()).toBe('العربية');
    expect(logoutButton.querySelector('svg')).toBeTruthy();
    expect(logoutButton.textContent?.trim()).toBe('');
    expect(logoutButton.getAttribute('aria-label')).toBeTruthy();
    expect(logoutButton.getAttribute('title')).toBeTruthy();
  });

  it('shows EN as target language label when admin locale is Arabic', () => {
    TestBed.inject(LocaleService).setLocale('ar');
    fixture.detectChanges();

    const languageLabel = fixture.nativeElement.querySelector(
      '[data-testid="profile-console-language-label"]',
    ) as HTMLSpanElement;
    expect(languageLabel.textContent?.trim()).toBe('EN');
  });

  it('toggles admin interface locale from globe button', () => {
    const locale = TestBed.inject(LocaleService);
    locale.setLocale('en');
    fixture.detectChanges();

    (
      fixture.nativeElement.querySelector('[data-testid="profile-console-language-toggle"]') as HTMLButtonElement
    ).click();
    fixture.detectChanges();
    expect(locale.locale()).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');
  });

  it('does not render publish in the primary top bar', () => {
    expect(fixture.nativeElement.querySelector('[data-testid="profile-publish-live"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="profile-publish-hint"]')).toBeNull();
  });

  it('calls AuthService.logout from icon-only logout button', () => {
    (
      fixture.nativeElement.querySelector('[data-testid="profile-console-logout"]') as HTMLButtonElement
    ).click();
    expect(auth.logout).toHaveBeenCalled();
  });

  it('hides owner-only navigation links for restaurant managers', async () => {
    TestBed.resetTestingModule();
    auth = {
      logout: vi.fn(),
      hasAnyRole: vi.fn((role: string) => role === ApplicationRoles.RestaurantManager),
    };

    await TestBed.configureTestingModule({
      imports: [ProfileConsoleLayout],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
      ],
    }).compileComponents();

    const managerFixture = TestBed.createComponent(ProfileConsoleLayout);
    managerFixture.detectChanges();

    expect(managerFixture.nativeElement.querySelector('[data-testid="profile-console-nav-dashboard"]')).toBeTruthy();
    expect(managerFixture.nativeElement.querySelector('[data-testid="profile-console-nav-orders"]')).toBeTruthy();
    expect(managerFixture.nativeElement.querySelector('[data-testid="profile-console-nav-menu"]')).toBeTruthy();
    expect(managerFixture.nativeElement.querySelector('[data-testid="profile-console-nav-profile"]')).toBeNull();
    expect(managerFixture.nativeElement.querySelector('[data-testid="profile-console-nav-staff"]')).toBeNull();
  });

  it('marks restaurant profile link active on profile route', async () => {
    @Component({ template: '' })
    class StubPage {}

    @Component({ template: '<router-outlet />', imports: [RouterOutlet] })
    class Host {}

    TestBed.resetTestingModule();
    auth = {
      logout: vi.fn(),
      hasAnyRole: vi.fn((role: string) => role === ApplicationRoles.RestaurantOwner),
    };

    await TestBed.configureTestingModule({
      imports: [Host],
      providers: [
        provideRouter([
          {
            path: 'admin/restaurant-profile',
            component: ProfileConsoleLayout,
            children: [{ path: '', component: StubPage }],
          },
        ]),
        { provide: AuthService, useValue: auth },
      ],
    }).compileComponents();

    const router = TestBed.inject(Router);
    TestBed.inject(LocaleService).setLocale('en');
    const hostFixture = TestBed.createComponent(Host);
    await router.navigateByUrl('/admin/restaurant-profile');
    await hostFixture.whenStable();
    hostFixture.detectChanges();

    const profileLink = hostFixture.nativeElement.querySelector(
      '[data-testid="profile-console-nav-profile"]',
    ) as HTMLAnchorElement;
    expect(profileLink.classList.contains('is-active')).toBe(true);
  });

  it('marks dashboard link active on dashboard route', async () => {
    @Component({ template: '' })
    class StubPage {}

    @Component({ template: '<router-outlet />', imports: [RouterOutlet] })
    class Host {}

    TestBed.resetTestingModule();
    auth = {
      logout: vi.fn(),
      hasAnyRole: vi.fn((role: string) => role === ApplicationRoles.RestaurantOwner),
    };

    await TestBed.configureTestingModule({
      imports: [Host],
      providers: [
        provideRouter([
          {
            path: 'admin/dashboard',
            component: ProfileConsoleLayout,
            children: [{ path: '', component: StubPage }],
          },
        ]),
        { provide: AuthService, useValue: auth },
      ],
    }).compileComponents();

    const router = TestBed.inject(Router);
    const hostFixture = TestBed.createComponent(Host);
    await router.navigateByUrl('/admin/dashboard');
    await hostFixture.whenStable();
    hostFixture.detectChanges();

    const dashboardLink = hostFixture.nativeElement.querySelector(
      '[data-testid="profile-console-nav-dashboard"]',
    ) as HTMLAnchorElement;
    expect(dashboardLink.classList.contains('is-active')).toBe(true);
    expect(hostFixture.nativeElement.querySelector('[data-testid="admin-sidebar"]')).toBeNull();
  });

  it('enables scrollable shell for non-profile routes', async () => {
    @Component({ template: '' })
    class StubPage {}

    @Component({ template: '<router-outlet />', imports: [RouterOutlet] })
    class Host {}

    TestBed.resetTestingModule();
    auth = {
      logout: vi.fn(),
      hasAnyRole: vi.fn((role: string) => role === ApplicationRoles.RestaurantOwner),
    };

    await TestBed.configureTestingModule({
      imports: [Host],
      providers: [
        provideRouter([
          {
            path: 'admin/orders',
            component: ProfileConsoleLayout,
            children: [{ path: '', component: StubPage }],
          },
        ]),
        { provide: AuthService, useValue: auth },
      ],
    }).compileComponents();

    const router = TestBed.inject(Router);
    const hostFixture = TestBed.createComponent(Host);
    await router.navigateByUrl('/admin/orders');
    await hostFixture.whenStable();
    hostFixture.detectChanges();

    expect(
      hostFixture.nativeElement.querySelector('.profile-console__shell--scrollable'),
    ).toBeTruthy();
  });
});
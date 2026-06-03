import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ApplicationRoles } from '../../../../core/auth/application-roles';
import { AuthSessionService } from '../../../../core/auth/auth-session.service';
import { createTestSession } from '../../../../core/auth/test-jwt.util';
import { LocaleService } from '../../../../core/localization/locale';
import { ADMIN_DASHBOARD_DEMO_STATS } from '../../data/admin-dashboard-demo.data';
import { DashboardPage } from './dashboard-page';

describe('DashboardPage', () => {
  let fixture: ComponentFixture<DashboardPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [provideRouter([])],
    }).compileComponents();

    const session = TestBed.inject(AuthSessionService);
    session.clearSession();
    session.saveSession(createTestSession(ApplicationRoles.RestaurantOwner));

    fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
  });

  it('shows welcome content and a link to restaurant profile', () => {
    const profileLink: HTMLAnchorElement = fixture.nativeElement.querySelector(
      'a[href="/admin/restaurant-profile"]',
    );
    expect(profileLink).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.admin-dashboard__ready-card')).toBeTruthy();
    expect(fixture.nativeElement.querySelectorAll('.admin-dashboard__placeholder-card').length).toBe(
      3,
    );
  });

  it('shows demo preview notice and menu items stat card', () => {
    const locale = TestBed.inject(LocaleService);
    locale.setLocale('en');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="admin-dashboard-demo-notice"]')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain(locale.uiText('adminDashboardDemoNotice'));

    const menuItemsCard = fixture.nativeElement.querySelector(
      '[data-testid="admin-dashboard-stat-menuItems"]',
    );
    expect(menuItemsCard).toBeTruthy();
    expect(menuItemsCard?.textContent).toContain(String(ADMIN_DASHBOARD_DEMO_STATS.menuItems));
  });

  it('reads demo stat values from the central data module', () => {
    expect(
      fixture.nativeElement.querySelector('[data-testid="admin-dashboard-stat-menuItems"]')?.textContent,
    ).toContain(String(ADMIN_DASHBOARD_DEMO_STATS.menuItems));
    expect(
      fixture.nativeElement.querySelector('[data-testid="admin-dashboard-stat-orders"]')?.textContent,
    ).toContain(String(ADMIN_DASHBOARD_DEMO_STATS.orders));
    expect(
      fixture.nativeElement.querySelector('[data-testid="admin-dashboard-stat-staff"]')?.textContent,
    ).toContain(String(ADMIN_DASHBOARD_DEMO_STATS.staff));
  });
});

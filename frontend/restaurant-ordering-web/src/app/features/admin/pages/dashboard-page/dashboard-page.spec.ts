import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ApplicationRoles } from '../../../../core/auth/application-roles';
import { AuthSessionService } from '../../../../core/auth/auth-session.service';
import { createTestSession } from '../../../../core/auth/test-jwt.util';
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
});

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../../../core/config/api-config';
import {
  ApplicationRoles,
  AssignableStaffRoles,
} from '../../../../core/auth/application-roles';
import { AuthSessionService } from '../../../../core/auth/auth-session.service';
import { createTestSession } from '../../../../core/auth/test-jwt.util';
import { LocaleService } from '../../../../core/localization/locale';
import type { RestaurantStaffUser } from '../../data-access/restaurant-staff.models';
import { StaffManagementPage } from './staff-management-page';

const RESTAURANT_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

function staffUrl(suffix = '') {
  return `${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/users${suffix}`;
}

describe('StaffManagementPage', () => {
  let fixture: ComponentFixture<StaffManagementPage>;
  let httpMock: HttpTestingController;
  let session: AuthSessionService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StaffManagementPage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    session = TestBed.inject(AuthSessionService);
    session.clearSession();
    session.saveSession(createTestSession(ApplicationRoles.RestaurantOwner, RESTAURANT_ID));

    fixture = TestBed.createComponent(StaffManagementPage);
    fixture.detectChanges();
  });

  afterEach(() => {
    document.body.classList.remove('order-modal-scroll-lock');
    document.querySelectorAll('app-modal-shell, app-order-modal-shell').forEach((node) => node.remove());
    httpMock.verify();
    session.clearSession();
  });

  function root(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function flushList(users: RestaurantStaffUser[] = []): void {
    const req = httpMock.expectOne(staffUrl());
    expect(req.request.method).toBe('GET');
    req.flush(users);
    fixture.detectChanges();
  }

  it('loads staff list on init', () => {
    const users: RestaurantStaffUser[] = [
      {
        id: '11111111-1111-1111-1111-111111111101',
        email: 'manager@test.local',
        fullName: 'Manager User',
        phoneNumber: null,
        restaurantId: RESTAURANT_ID,
        role: ApplicationRoles.RestaurantManager,
        isActive: true,
      },
    ];

    flushList(users);

    expect(root().querySelector('[data-testid="staff-table"] tbody tr')).toBeTruthy();
    expect(root().textContent).toContain('manager@test.local');
  });

  it('shows empty state when list is empty', () => {
    flushList([]);
    expect(root().querySelector('[data-testid="staff-empty-state"]')).toBeTruthy();
  });

  it('does not expose sensitive fields in list response handling', () => {
    const req = httpMock.expectOne(staffUrl());
    req.flush([
      {
        id: '11111111-1111-1111-1111-111111111101',
        email: 'safe@test.local',
        fullName: 'Safe User',
        phoneNumber: null,
        password: 'should-not-appear',
        passwordHash: 'hash-value',
        securityStamp: 'stamp-value',
        role: ApplicationRoles.RestaurantManager,
        restaurantId: RESTAURANT_ID,
        isActive: true,
      },
    ]);
    fixture.detectChanges();

    expect(root().textContent).not.toContain('should-not-appear');
    expect(root().textContent).not.toContain('hash-value');
    expect(root().textContent).not.toContain('stamp-value');
  });

  it('shows error state and retries list load', () => {
    const req = httpMock.expectOne(staffUrl());
    req.flush('failed', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(root().querySelector('[data-testid="staff-error-state"]')).toBeTruthy();
    root().querySelector<HTMLButtonElement>('.staff-page__secondary-btn')?.click();
    fixture.detectChanges();

    flushList([]);
    expect(root().querySelector('[data-testid="staff-empty-state"]')).toBeTruthy();
  });

  it('opens create modal on body with unified close button', () => {
    flushList([]);
    root().querySelector<HTMLButtonElement>('[data-testid="staff-add-button"]')?.click();
    fixture.detectChanges();

    expect(document.body.querySelector('[data-testid="staff-create-modal"]')).toBeTruthy();
    expect(
      document.body.querySelector('[data-testid="order-modal-close"]')?.classList.contains('modal-close-button'),
    ).toBe(true);
    expect(document.body.classList.contains('order-modal-scroll-lock')).toBe(true);
  });

  it('creates staff with correct POST payload and refreshes list locally', () => {
    flushList([]);

    root().querySelector<HTMLButtonElement>('[data-testid="staff-add-button"]')?.click();
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      createForm: {
        setValue: (value: Record<string, string>) => void;
      };
      submitCreate: () => void;
    };

    component.createForm.setValue({
      email: 'new.staff@test.local',
      password: 'StrongPassword@123',
      fullName: 'New Staff',
      phoneNumber: '',
      role: ApplicationRoles.KitchenManager,
    });
    component.submitCreate();
    fixture.detectChanges();

    const req = httpMock.expectOne(staffUrl());
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      email: 'new.staff@test.local',
      password: 'StrongPassword@123',
      fullName: 'New Staff',
      phoneNumber: null,
      role: ApplicationRoles.KitchenManager,
    });

    req.flush({
      id: '22222222-2222-2222-2222-222222222202',
      email: 'new.staff@test.local',
      fullName: 'New Staff',
      phoneNumber: null,
      restaurantId: RESTAURANT_ID,
      role: ApplicationRoles.KitchenManager,
      isActive: true,
    });
    fixture.detectChanges();

    expect(root().querySelector('[data-testid="staff-success-message"]')).toBeTruthy();
    expect(root().textContent).toContain('new.staff@test.local');
    expect(root().textContent).not.toContain('StrongPassword@123');
  });

  it('shows duplicate email message on 409', () => {
    flushList([]);
    root().querySelector<HTMLButtonElement>('[data-testid="staff-add-button"]')?.click();
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      createForm: { setValue: (value: Record<string, string>) => void };
      submitCreate: () => void;
    };

    component.createForm.setValue({
      email: 'dup@test.local',
      password: 'StrongPassword@123',
      fullName: '',
      phoneNumber: '',
      role: ApplicationRoles.RestaurantManager,
    });
    component.submitCreate();
    fixture.detectChanges();

    const req = httpMock.expectOne(staffUrl());
    req.flush(
      { title: 'Conflict', detail: 'Unable to create user with the provided details.' },
      { status: 409, statusText: 'Conflict' },
    );
    fixture.detectChanges();

    const locale = TestBed.inject(LocaleService);
    expect(document.body.querySelector('.staff-modal__error')?.textContent).toContain(
      locale.uiText('staffErrorDuplicateEmail'),
    );
  });

  it('sends PATCH for role change and updates row', () => {
    const users: RestaurantStaffUser[] = [
      {
        id: '33333333-3333-3333-3333-333333333303',
        email: 'change@test.local',
        fullName: 'Change Role',
        phoneNumber: null,
        restaurantId: RESTAURANT_ID,
        role: ApplicationRoles.RestaurantManager,
        isActive: true,
      },
    ];

    flushList(users);

    root()
      .querySelector<HTMLButtonElement>('[data-testid="staff-change-role-33333333-3333-3333-3333-333333333303"]')
      ?.click();
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      changeRoleForm: { setValue: (value: { role: string }) => void };
      submitChangeRole: () => void;
    };

    component.changeRoleForm.setValue({ role: ApplicationRoles.KitchenManager });
    component.submitChangeRole();
    fixture.detectChanges();

    const req = httpMock.expectOne(
      staffUrl('/33333333-3333-3333-3333-333333333303/role'),
    );
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ role: ApplicationRoles.KitchenManager });

    req.flush({
      id: users[0].id,
      restaurantId: RESTAURANT_ID,
      role: ApplicationRoles.KitchenManager,
    });
    fixture.detectChanges();

    expect(root().querySelector('[data-testid="staff-row-33333333-3333-3333-3333-333333333303"]'))
      .toBeTruthy();
    expect(root().textContent).toContain('change@test.local');
  });

  it('offers only assignable staff roles in create form', () => {
    flushList([]);
    root().querySelector<HTMLButtonElement>('[data-testid="staff-add-button"]')?.click();
    fixture.detectChanges();

    const options = Array.from(
      document.body.querySelectorAll<HTMLOptionElement>(
        '[data-testid="staff-create-role-select"] option',
      ),
    ).map((option) => option.value);

    expect(options).toEqual([...AssignableStaffRoles]);
    expect(options).not.toContain(ApplicationRoles.RestaurantOwner);
  });

  it('renders mobile cards in DOM for responsive layout', () => {
    const users: RestaurantStaffUser[] = [
      {
        id: '44444444-4444-4444-4444-444444444404',
        email: 'mobile@test.local',
        fullName: 'Mobile Staff',
        phoneNumber: '+1000000000',
        restaurantId: RESTAURANT_ID,
        role: ApplicationRoles.KitchenManager,
        isActive: true,
      },
    ];

    flushList(users);

    expect(root().querySelector('[data-testid="staff-cards"]')).toBeTruthy();
    expect(root().querySelector('[data-testid="staff-card-44444444-4444-4444-4444-444444444404"]'))
      .toBeTruthy();
  });
});

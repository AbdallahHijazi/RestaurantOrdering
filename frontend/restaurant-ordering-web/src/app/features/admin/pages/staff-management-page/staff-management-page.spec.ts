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

  const sampleUsers: RestaurantStaffUser[] = [
    {
      id: '11111111-1111-1111-1111-111111111101',
      email: 'manager@test.local',
      fullName: 'Manager User',
      phoneNumber: '0982720564',
      restaurantId: RESTAURANT_ID,
      role: ApplicationRoles.RestaurantManager,
      isActive: true,
    },
    {
      id: '22222222-2222-2222-2222-222222222202',
      email: 'kitchen@test.local',
      fullName: 'Kitchen Lead',
      phoneNumber: null,
      restaurantId: RESTAURANT_ID,
      role: ApplicationRoles.KitchenManager,
      isActive: false,
    },
  ];

  it('does not render a page-level top bar', () => {
    flushList([]);
    expect(root().querySelector('.topbar')).toBeNull();
    expect(root().querySelector('.main-nav')).toBeNull();
    expect(root().querySelector('.profile-console-layout')).toBeNull();
  });

  it('shows internal header title, lead, and add employee button', () => {
    flushList([]);
    expect(root().textContent).toContain('إدارة الموظفين');
    expect(root().querySelector('.staff-management-title p')).toBeTruthy();
    expect(root().querySelector('[data-testid="staff-add-button"]')).toBeTruthy();
  });

  it('loads staff list on init and renders desktop table rows', () => {
    flushList([sampleUsers[0]!]);
    expect(root().querySelector('[data-testid="staff-table"] tbody tr')).toBeTruthy();
    expect(root().textContent).toContain('manager@test.local');
  });

  it('derives stats from loaded staff without hardcoded numbers', () => {
    flushList(sampleUsers);
    expect(root().querySelector('[data-testid="staff-stat-total"]')?.textContent?.trim()).toBe('2');
    expect(root().querySelector('[data-testid="staff-stat-active"]')?.textContent?.trim()).toBe('1');
    expect(root().querySelector('[data-testid="staff-stat-roles"]')?.textContent?.trim()).toBe('2');
  });

  it('shows empty state when list is empty', () => {
    flushList([]);
    expect(root().querySelector('[data-testid="staff-empty-state"]')).toBeTruthy();
  });

  it('filters staff locally by search, role, and status together', () => {
    flushList(sampleUsers);

    const searchInput = root().querySelector<HTMLInputElement>('[data-testid="staff-search-input"]');
    searchInput!.value = 'kitchen';
    searchInput!.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(root().querySelectorAll('[data-testid="staff-table"] tbody tr').length).toBe(1);

    searchInput!.value = '';
    searchInput!.dispatchEvent(new Event('input'));
    root().querySelector<HTMLButtonElement>('[data-testid="staff-role-filter"]')?.click();
    fixture.detectChanges();
    document.body.querySelector<HTMLButtonElement>('[data-option-index="1"]')?.click();
    fixture.detectChanges();
    expect(root().querySelectorAll('[data-testid="staff-table"] tbody tr').length).toBe(1);

    root().querySelector<HTMLButtonElement>('[data-testid="staff-status-filter"]')?.click();
    fixture.detectChanges();
    const statusOptions = document.body.querySelectorAll('.staff-select__panel [role="option"]');
    (statusOptions[statusOptions.length - 1] as HTMLButtonElement)?.click();
    fixture.detectChanges();
    expect(root().querySelectorAll('[data-testid="staff-table"] tbody tr').length).toBe(0);
    expect(root().querySelector('[data-testid="staff-empty-filtered"]')).toBeTruthy();
  });

  it('updates summary count when filters change', () => {
    flushList(sampleUsers);
    const locale = TestBed.inject(LocaleService);
    expect(root().querySelector('[data-testid="staff-summary"]')?.textContent).toContain(
      locale.uiText('staffShowingCount').replace('{shown}', '2').replace('{total}', '2'),
    );

    const searchInput = root().querySelector<HTMLInputElement>('[data-testid="staff-search-input"]');
    searchInput!.value = 'manager';
    searchInput!.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(root().querySelector('[data-testid="staff-summary"]')?.textContent).toContain(
      locale.uiText('staffShowingCount').replace('{shown}', '1').replace('{total}', '2'),
    );
  });

  it('derives avatar initials from employee names', () => {
    flushList([sampleUsers[0]!]);
    expect(root().querySelector('.staff-roster__avatar')?.textContent?.trim()).toBe('MU');
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
    root().querySelector<HTMLButtonElement>('.staff-management-secondary')?.click();
    fixture.detectChanges();

    flushList([]);
    expect(root().querySelector('[data-testid="staff-empty-state"]')).toBeTruthy();
  });

  it('opens create modal on body without sending request before submit', () => {
    flushList([]);
    root().querySelector<HTMLButtonElement>('[data-testid="staff-add-button"]')?.click();
    fixture.detectChanges();

    expect(document.body.querySelector('[data-testid="staff-create-modal"]')).toBeTruthy();
    expect(httpMock.match(staffUrl()).length).toBe(0);
    expect(document.body.classList.contains('order-modal-scroll-lock')).toBe(true);
  });

  it('closes create modal from cancel without request', () => {
    flushList([]);
    root().querySelector<HTMLButtonElement>('[data-testid="staff-add-button"]')?.click();
    fixture.detectChanges();

    document.body.querySelector<HTMLButtonElement>('.staff-modal-actions__cancel')?.click();
    fixture.detectChanges();

    expect(document.body.querySelector('[data-testid="staff-create-modal"]')).toBeNull();
    expect(httpMock.match({ method: 'POST', url: staffUrl() }).length).toBe(0);
  });

  it('creates staff with correct POST payload and refreshes list locally', () => {
    flushList([]);

    root().querySelector<HTMLButtonElement>('[data-testid="staff-add-button"]')?.click();
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      createForm: { setValue: (value: Record<string, string>) => void };
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
      id: '33333333-3333-3333-3333-333333333303',
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
    expect(document.body.querySelector('[data-testid="staff-create-modal"]')).toBeNull();
  });

  it('shows duplicate email message on 409 and keeps modal open', () => {
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
    expect(document.body.querySelector('.staff-management-modal-error')?.textContent).toContain(
      locale.uiText('staffErrorDuplicateEmail'),
    );
    expect(document.body.querySelector('[data-testid="staff-create-modal"]')).toBeTruthy();
    expect(
      (document.body.querySelector('[data-testid="staff-create-submit"]') as HTMLButtonElement).disabled,
    ).toBe(false);
  });

  it('sends PATCH for role change and updates row', () => {
    flushList([sampleUsers[0]!]);

    root()
      .querySelector<HTMLButtonElement>('[data-testid="staff-change-role-11111111-1111-1111-1111-111111111101"]')
      ?.click();
    fixture.detectChanges();

    expect(document.body.querySelector('[data-testid="staff-change-role-modal"]')).toBeTruthy();
    expect(document.body.textContent).toContain('Manager User');

    const component = fixture.componentInstance as unknown as {
      changeRoleForm: { setValue: (value: { role: string }) => void };
      submitChangeRole: () => void;
    };

    component.changeRoleForm.setValue({ role: ApplicationRoles.KitchenManager });
    component.submitChangeRole();
    fixture.detectChanges();

    const req = httpMock.expectOne(staffUrl('/11111111-1111-1111-1111-111111111101/role'));
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ role: ApplicationRoles.KitchenManager });

    req.flush({
      id: sampleUsers[0]!.id,
      restaurantId: RESTAURANT_ID,
      role: ApplicationRoles.KitchenManager,
    });
    fixture.detectChanges();

    expect(root().querySelector('[data-testid="staff-row-11111111-1111-1111-1111-111111111101"]')).toBeTruthy();
    expect(document.body.querySelector('[data-testid="staff-change-role-modal"]')).toBeNull();
  });

  it('offers only assignable staff roles in create form dropdown', () => {
    flushList([]);
    root().querySelector<HTMLButtonElement>('[data-testid="staff-add-button"]')?.click();
    fixture.detectChanges();

    expect(document.body.querySelector('select')).toBeNull();
    document.body.querySelector<HTMLButtonElement>('[data-testid="staff-create-role-select"]')?.click();
    fixture.detectChanges();

    const panelOptions = Array.from(
      document.body.querySelectorAll<HTMLButtonElement>('.staff-select__panel [role="option"]'),
    );
    expect(panelOptions.length).toBe(2);

    panelOptions[1]?.click();
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      createForm: { controls: { role: { value: string } } };
    };
    expect(component.createForm.controls.role.value).toBe(ApplicationRoles.KitchenManager);
  });

  it('shows modal footer actions with visible terracotta save and secondary cancel', () => {
    flushList([]);
    root().querySelector<HTMLButtonElement>('[data-testid="staff-add-button"]')?.click();
    fixture.detectChanges();

    const footer = document.body.querySelector('.staff-modal-actions') as HTMLElement;
    const saveButton = document.body.querySelector('.staff-modal-actions__save') as HTMLButtonElement;
    const cancelButton = document.body.querySelector('.staff-modal-actions__cancel') as HTMLButtonElement;
    const saveIcon = document.body.querySelector('.staff-modal-actions__icon') as SVGElement;

    expect(footer).toBeTruthy();
    expect(saveButton).toBeTruthy();
    expect(cancelButton).toBeTruthy();
    expect(saveIcon).toBeTruthy();
    expect(saveButton.classList.contains('staff-modal-actions__save')).toBe(true);
    expect(cancelButton.classList.contains('staff-modal-actions__cancel')).toBe(true);
    expect(saveIcon.classList.contains('staff-modal-actions__icon')).toBe(true);
    expect(saveIcon.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(saveButton.textContent).toContain('حفظ الموظف');
    expect(cancelButton.textContent).toContain('إلغاء');
    expect(saveButton.compareDocumentPosition(cancelButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    const footerStyle = getComputedStyle(footer);
    expect(footerStyle.display).toBe('flex');
    expect(footerStyle.width).toBeTruthy();

    const saveStyle = getComputedStyle(saveButton);
    expect(saveStyle.width).not.toBe('100%');
    expect(Number.parseFloat(saveStyle.minHeight)).toBeGreaterThanOrEqual(44);
    expect(saveStyle.display).toBe('inline-flex');

    const iconStyle = getComputedStyle(saveIcon);
    expect(iconStyle.width).toBe('18px');
    expect(iconStyle.height).toBe('18px');
    expect(iconStyle.flexBasis).toBe('18px');

    const cancelStyle = getComputedStyle(cancelButton);
    expect(Number.parseFloat(cancelStyle.minHeight)).toBeGreaterThanOrEqual(44);
    expect(cancelStyle.backgroundColor).not.toBe('');
    expect(cancelStyle.borderWidth).not.toBe('0px');
  });

  it('shows change role modal footer with save and cancel actions', () => {
    flushList([sampleUsers[0]!]);
    root()
      .querySelector<HTMLButtonElement>('[data-testid="staff-change-role-11111111-1111-1111-1111-111111111101"]')
      ?.click();
    fixture.detectChanges();

    const footer = document.body.querySelector('[data-testid="staff-change-role-modal"] .staff-modal-actions');
    const saveButton = document.body.querySelector(
      '[data-testid="staff-change-role-modal"] .staff-modal-actions__save',
    ) as HTMLButtonElement;
    const cancelButton = document.body.querySelector(
      '[data-testid="staff-change-role-modal"] .staff-modal-actions__cancel',
    ) as HTMLButtonElement;
    const saveIcon = document.body.querySelector(
      '[data-testid="staff-change-role-modal"] .staff-modal-actions__icon',
    ) as SVGElement;

    expect(footer).toBeTruthy();
    expect(saveButton).toBeTruthy();
    expect(cancelButton).toBeTruthy();
    expect(saveIcon).toBeTruthy();
    expect(saveButton.textContent).toContain('حفظ التغيير');
    expect(cancelButton.textContent).toContain('إلغاء');
    expect(getComputedStyle(saveIcon).width).toBe('18px');
    expect(getComputedStyle(saveIcon).height).toBe('18px');
  });

  it('uses role dropdown panel with max-height and vertical scrolling', () => {
    flushList([]);
    root().querySelector<HTMLButtonElement>('[data-testid="staff-add-button"]')?.click();
    fixture.detectChanges();

    document.body.querySelector<HTMLButtonElement>('[data-testid="staff-create-role-select"]')?.click();
    fixture.detectChanges();

    const panel = document.body.querySelector('.staff-select__panel') as HTMLElement;
    expect(panel).toBeTruthy();
    expect(getComputedStyle(panel).overflowY).toBe('auto');
    expect(Number.parseFloat(getComputedStyle(panel).maxHeight)).toBeLessThanOrEqual(220);
  });

  it('uses custom role filter dropdown instead of native select', () => {
    flushList(sampleUsers);
    expect(root().querySelector('[data-testid="staff-role-filter"]')?.tagName).toBe('BUTTON');
    expect(root().querySelector('[data-testid="staff-role-filter"]')?.getAttribute('aria-haspopup')).toBe('listbox');
  });

  it('renders mobile cards in DOM for responsive layout', () => {
    flushList([sampleUsers[0]!]);
    expect(root().querySelector('[data-testid="staff-cards"]')).toBeTruthy();
    expect(root().querySelector('[data-testid="staff-card-11111111-1111-1111-1111-111111111101"]')).toBeTruthy();
  });

  it('uses local inline-flex badges and does not load external icon fonts', () => {
    flushList([sampleUsers[0]!]);
    expect(root().querySelector('.staff-roster__badge--status')).toBeTruthy();
    expect(root().querySelector('link[href*="fonts.googleapis"]')).toBeNull();
    expect(root().querySelector('link[href*="Material+Symbols"]')).toBeNull();
  });

  it('cleans up modal overlay from body after dismiss', () => {
    flushList([]);
    root().querySelector<HTMLButtonElement>('[data-testid="staff-add-button"]')?.click();
    fixture.detectChanges();
    document.body.querySelector<HTMLButtonElement>('[data-testid="order-modal-close"]')?.click();
    fixture.detectChanges();
    expect(document.body.querySelector('[data-testid="staff-create-modal"]')).toBeNull();
    expect(document.body.classList.contains('order-modal-scroll-lock')).toBe(false);
  });
});

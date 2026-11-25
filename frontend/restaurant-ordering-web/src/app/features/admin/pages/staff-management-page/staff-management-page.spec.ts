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

  // ───────────────────────── UX-001: edit employee + activate/deactivate ─────────────────────────

  const MANAGER_ID = '11111111-1111-1111-1111-111111111101';
  const KITCHEN_ID = '22222222-2222-2222-2222-222222222202';

  function click(selector: string): void {
    (document.body.querySelector(selector) as HTMLButtonElement).click();
    fixture.detectChanges();
  }

  it('offers icon-only edit, role and status actions with localized accessible names (UX-001/008)', () => {
    flushList(sampleUsers);
    const locale = TestBed.inject(LocaleService);
    const edit = root().querySelector(`[data-testid="staff-edit-${MANAGER_ID}"]`) as HTMLButtonElement;
    const toggleActive = root().querySelector(`[data-testid="staff-toggle-status-${MANAGER_ID}"]`) as HTMLButtonElement;
    const toggleInactive = root().querySelector(`[data-testid="staff-toggle-status-${KITCHEN_ID}"]`) as HTMLButtonElement;

    expect(edit.getAttribute('aria-label')).toBe(locale.uiText('actionEdit'));
    expect(toggleActive.getAttribute('aria-label')).toBe(locale.uiText('actionDeactivate'));
    expect(toggleInactive.getAttribute('aria-label')).toBe(locale.uiText('actionActivate'));
    expect(edit.textContent?.trim()).toBe('');
    expect(edit.querySelector('svg')).toBeTruthy();
  });

  it('edits name and phone with a PATCH, keeping role and e-mail untouched (UX-001)', () => {
    flushList(sampleUsers);
    click(`[data-testid="staff-edit-${MANAGER_ID}"]`);

    expect(document.body.querySelector('[data-testid="staff-edit-modal"]')).toBeTruthy();
    const name = document.body.querySelector('#staff-edit-full-name') as HTMLInputElement;
    const phone = document.body.querySelector('#staff-edit-phone') as HTMLInputElement;
    expect(name.value).toBe('Manager User');
    name.value = 'Renamed Manager';
    name.dispatchEvent(new Event('input'));
    phone.value = '  0790000000 ';
    phone.dispatchEvent(new Event('input'));

    click('[data-testid="staff-edit-submit"]');

    const req = httpMock.expectOne(`${staffUrl()}/${MANAGER_ID}`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ fullName: 'Renamed Manager', phoneNumber: '0790000000' });
    req.flush({ ...sampleUsers[0]!, fullName: 'Renamed Manager', phoneNumber: '0790000000' });
    fixture.detectChanges();

    expect(document.body.querySelector('[data-testid="staff-edit-modal"]')).toBeNull();
    expect(root().textContent).toContain('Renamed Manager');
    expect(root().querySelector('[data-testid="staff-success-message"]')).toBeTruthy();
  });

  it('asks for confirmation before deactivating and then PATCHes the status (UX-001)', () => {
    flushList(sampleUsers);
    click(`[data-testid="staff-toggle-status-${MANAGER_ID}"]`);

    expect(document.body.querySelector('[data-testid="staff-status-modal"]')).toBeTruthy();
    expect(httpMock.match((r) => r.url.endsWith('/status')).length).toBe(0);
    expect(document.body.querySelector('[data-testid="staff-status-confirm-text"]')!.textContent).toContain(
      TestBed.inject(LocaleService).uiText('staffDeactivateConfirm'),
    );

    click('[data-testid="staff-status-confirm"]');

    const req = httpMock.expectOne(`${staffUrl()}/${MANAGER_ID}/status`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ isActive: false });
    req.flush({ ...sampleUsers[0]!, isActive: false });
    fixture.detectChanges();

    expect(document.body.querySelector('[data-testid="staff-status-modal"]')).toBeNull();
    const toggle = root().querySelector(`[data-testid="staff-toggle-status-${MANAGER_ID}"]`) as HTMLButtonElement;
    expect(toggle.getAttribute('aria-label')).toBe(TestBed.inject(LocaleService).uiText('actionActivate'));
  });

  it('reactivates an inactive employee (UX-001)', () => {
    flushList(sampleUsers);
    click(`[data-testid="staff-toggle-status-${KITCHEN_ID}"]`);
    click('[data-testid="staff-status-confirm"]');

    const req = httpMock.expectOne(`${staffUrl()}/${KITCHEN_ID}/status`);
    expect(req.request.body).toEqual({ isActive: true });
    req.flush({ ...sampleUsers[1]!, isActive: true });
    fixture.detectChanges();

    expect(root().querySelector(`[data-testid="staff-toggle-status-${KITCHEN_ID}"]`)!.getAttribute('aria-label')).toBe(
      TestBed.inject(LocaleService).uiText('actionDeactivate'),
    );
  });

  it('shows a clear error when the server refuses the status change and keeps the list intact (UX-001)', () => {
    flushList(sampleUsers);
    click(`[data-testid="staff-toggle-status-${MANAGER_ID}"]`);
    click('[data-testid="staff-status-confirm"]');

    httpMock
      .expectOne(`${staffUrl()}/${MANAGER_ID}/status`)
      .flush({ title: 'forbidden' }, { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();

    expect(document.body.querySelector('[data-testid="staff-status-modal"] [role="alert"]')!.textContent).toContain(
      TestBed.inject(LocaleService).uiText('staffErrorForbiddenAction'),
    );
    expect(root().querySelectorAll('[data-testid^="staff-row-"]').length).toBe(2);
  });

  it('cancelling the status confirmation sends nothing (UX-001)', () => {
    flushList(sampleUsers);
    click(`[data-testid="staff-toggle-status-${MANAGER_ID}"]`);
    click('[data-testid="staff-status-modal"] .staff-modal-actions__cancel');

    expect(document.body.querySelector('[data-testid="staff-status-modal"]')).toBeNull();
    expect(httpMock.match((r) => r.method === 'PATCH').length).toBe(0);
  });

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
    root().querySelector<HTMLButtonElement>('[data-testid="staff-retry"]')?.click();
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

  it('shows labelled modal footer actions (icon + visible text) with localized accessible names (UX-008)', () => {
    flushList([]);
    root().querySelector<HTMLButtonElement>('[data-testid="staff-add-button"]')?.click();
    fixture.detectChanges();

    const locale = TestBed.inject(LocaleService);
    const footer = document.body.querySelector('.staff-modal-actions') as HTMLElement;
    const saveButton = document.body.querySelector('.staff-modal-actions__save') as HTMLButtonElement;
    const cancelButton = document.body.querySelector('.staff-modal-actions__cancel') as HTMLButtonElement;

    expect(footer).toBeTruthy();
    expect(saveButton.getAttribute('aria-label')).toBe(locale.uiText('staffCreateSubmit'));
    expect(cancelButton.getAttribute('aria-label')).toBe(locale.uiText('staffCancel'));
    expect(saveButton.getAttribute('title')).toBe(locale.uiText('staffCreateSubmit'));
    expect(saveButton.querySelector('svg')).toBeTruthy();
    expect(cancelButton.querySelector('svg')).toBeTruthy();
    expect(saveButton.textContent?.trim()).toBe(locale.uiText('staffCreateSubmit'));
    expect(cancelButton.textContent?.trim()).toBe(locale.uiText('staffCancel'));
    expect(saveButton.classList.contains('app-icon-btn--with-label')).toBe(true);
    // Cancel first, primary last: the primary sits at the inline-end in both RTL and LTR.
    expect(cancelButton.compareDocumentPosition(saveButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // The buttons live in the dialog footer, not in its body.
    expect(footer.closest('.modal-dialog__footer')).toBeTruthy();
    expect(document.body.querySelector('.modal-dialog__body app-staff-modal-actions')).toBeNull();
  });

  it('shows a compact floating toast (shared pill) instead of a full-width banner', () => {
    flushList([sampleUsers[0]!]);
    (fixture.componentInstance as unknown as { successMessage: { set(v: string): void } }).successMessage.set('Saved');
    fixture.detectChanges();

    const toast = root().querySelector('[data-testid="staff-success-message"]');
    expect(toast?.tagName.toLowerCase()).toBe('app-floating-notification-pill');
    expect(toast?.textContent).toContain('Saved');
    expect(root().querySelector('.staff-management-success')).toBeNull();

    toast?.querySelector<HTMLButtonElement>('.floating-notification-pill__close')?.click();
    fixture.detectChanges();
    expect(root().querySelector('[data-testid="staff-success-message"]')).toBeNull();
  });

  it('sizes each dialog independently and marks invalid fields only after interaction', () => {
    flushList([]);
    root().querySelector<HTMLButtonElement>('[data-testid="staff-add-button"]')?.click();
    fixture.detectChanges();
    const shell = document.body.querySelector('app-modal-shell') as HTMLElement;
    expect(shell.style.getPropertyValue('--modal-dialog-max-width')).toBe('34rem');

    const email = document.body.querySelector('#staff-create-email') as HTMLInputElement;
    expect(email.getAttribute('dir')).toBe('ltr');
    expect(email.classList.contains('ng-touched')).toBe(false);
    document.body.querySelector<HTMLButtonElement>('[data-testid="staff-create-submit"]')?.click();
    fixture.detectChanges();
    expect(email.classList.contains('ng-invalid') && email.classList.contains('ng-touched')).toBe(true);
    expect(document.body.querySelector('.staff-management-modal-error')).toBeTruthy();
  });

  it('shows change role modal footer with icon save and cancel actions', () => {
    flushList([sampleUsers[0]!]);
    root()
      .querySelector<HTMLButtonElement>('[data-testid="staff-change-role-11111111-1111-1111-1111-111111111101"]')
      ?.click();
    fixture.detectChanges();

    const locale = TestBed.inject(LocaleService);
    const modal = document.body.querySelector('[data-testid="staff-change-role-modal"]') as HTMLElement;
    const saveButton = modal.querySelector('.staff-modal-actions__save') as HTMLButtonElement;
    const cancelButton = modal.querySelector('.staff-modal-actions__cancel') as HTMLButtonElement;

    expect(modal.querySelector('.staff-modal-actions')).toBeTruthy();
    expect(saveButton.getAttribute('aria-label')).toBe(locale.uiText('staffChangeRoleSubmit'));
    expect(cancelButton.getAttribute('aria-label')).toBe(locale.uiText('staffCancel'));
    expect(saveButton.querySelector('svg')).toBeTruthy();
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

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { API_BASE_URL } from '../../../../core/config/api-config';
import { AuthSessionService } from '../../../../core/auth/auth-session.service';
import { LocaleService } from '../../../../core/localization/locale';
import {
  ApplicationRoles,
  type ApplicationRole,
} from '../../../../core/auth/application-roles';
import { createTestAccessToken } from '../../../../core/auth/test-jwt.util';
import { routes } from '../../../../app.routes';
import { LoginPage } from './login-page';

function createLoginResponse(role: ApplicationRole = ApplicationRoles.RestaurantOwner) {
  return {
    accessToken: createTestAccessToken({
      role,
      restaurantId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    }),
    expiresAtUtc: new Date(Date.now() + 60_000).toISOString(),
    userId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    restaurantId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  };
}

type LoginPageHarness = {
  form: {
    setValue: (value: { email: string; password: string }) => void;
    controls: { password: { value: string; setValue: (value: string) => void } };
    invalid: boolean;
  };
  submit: () => void;
};

describe('LoginPage', () => {
  let fixture: ComponentFixture<LoginPage>;
  let httpMock: HttpTestingController;
  let session: AuthSessionService;
  let router: Router;

  beforeEach(async () => {
    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter(routes)],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    session = TestBed.inject(AuthSessionService);
    router = TestBed.inject(Router);
    session.clearSession();

    fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
    session.clearSession();
  });

  function root(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function page(): LoginPageHarness {
    return fixture.componentInstance as unknown as LoginPageHarness;
  }

  it('renders email and password fields only', () => {
    expect(root().querySelector('#login-email')).toBeTruthy();
    expect(root().querySelector('#login-password')).toBeTruthy();
    expect(root().textContent).not.toContain('Register');
    expect(root().textContent).not.toContain('Forgot');
    expect(root().textContent).not.toContain('Google');
  });

  it('disables submit when form is invalid', () => {
    const submit = root().querySelector('.login-page__submit') as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
  });

  it('disables submit while loading', () => {
    page().form.setValue({
      email: 'owner@test.local',
      password: 'P@ssw0rd!123',
    });
    fixture.detectChanges();

    page().submit();
    fixture.detectChanges();

    const submit = root().querySelector('.login-page__submit') as HTMLButtonElement;
    expect(submit.disabled).toBe(true);

    const req = httpMock.expectOne(`${API_BASE_URL}/api/v1/auth/login`);
    req.flush(createLoginResponse());
  });

  it('submits valid form to login endpoint', async () => {
    page().form.setValue({
      email: ' owner@test.local ',
      password: ' P@ssw0rd!123 ',
    });
    fixture.detectChanges();

    page().submit();

    const req = httpMock.expectOne(`${API_BASE_URL}/api/v1/auth/login`);
    expect(req.request.body).toEqual({
      email: 'owner@test.local',
      password: ' P@ssw0rd!123 ',
    });
    req.flush(createLoginResponse());

    await fixture.whenStable();
  });

  it('shows generic error on 401 and clears password field', () => {
    const locale = TestBed.inject(LocaleService);
    locale.setLocale('en');
    fixture.detectChanges();

    page().form.setValue({
      email: 'owner@test.local',
      password: 'wrong',
    });
    fixture.detectChanges();

    page().submit();
    const req = httpMock.expectOne(`${API_BASE_URL}/api/v1/auth/login`);
    req.flush({ title: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });
    fixture.detectChanges();

    expect(root().textContent).toContain(locale.uiText('loginInvalidCredentials'));
    expect(page().form.controls.password.value).toBe('');
    expect(session.getAccessToken()).toBeNull();
  });

  it('shows rate-limit message on 429', () => {
    const locale = TestBed.inject(LocaleService);
    locale.setLocale('en');
    fixture.detectChanges();

    page().form.setValue({
      email: 'owner@test.local',
      password: 'wrong',
    });
    fixture.detectChanges();

    page().submit();
    const req = httpMock.expectOne(`${API_BASE_URL}/api/v1/auth/login`);
    req.flush({ title: 'Too many requests.' }, { status: 429, statusText: 'Too Many Requests' });
    fixture.detectChanges();

    expect(root().textContent).toContain(locale.uiText('loginTooManyAttempts'));
  });

  it('shows network error on 5xx', () => {
    const locale = TestBed.inject(LocaleService);
    locale.setLocale('en');
    fixture.detectChanges();

    page().form.setValue({
      email: 'owner@test.local',
      password: 'wrong',
    });
    fixture.detectChanges();

    page().submit();
    const req = httpMock.expectOne(`${API_BASE_URL}/api/v1/auth/login`);
    req.flush({ title: 'Server error' }, { status: 500, statusText: 'Internal Server Error' });
    fixture.detectChanges();

    expect(root().textContent).toContain(locale.uiText('loginNetworkError'));
  });

  it('toggles password visibility without changing the value', () => {
    const locale = TestBed.inject(LocaleService);
    locale.setLocale('en');
    fixture.detectChanges();

    const passwordInput = root().querySelector('#login-password') as HTMLInputElement;
    page().form.controls.password.setValue('secret-value');
    fixture.detectChanges();

    expect(passwordInput.type).toBe('password');

    const toggle = root().querySelector('[data-testid="login-password-toggle"]') as HTMLButtonElement;
    expect(toggle.type).toBe('button');
    expect(toggle.textContent?.trim()).toBe('');
    expect(toggle.getAttribute('aria-label')).toBe(locale.uiText('loginShowPassword'));

    toggle.click();
    fixture.detectChanges();

    expect(passwordInput.type).toBe('text');
    expect(passwordInput.value).toBe('secret-value');
    expect(toggle.getAttribute('aria-label')).toBe(locale.uiText('loginHidePassword'));

    toggle.click();
    fixture.detectChanges();

    expect(passwordInput.type).toBe('password');
    expect(passwordInput.value).toBe('secret-value');
  });

  it('does not submit the form when pressing the password toggle', () => {
    page().form.setValue({
      email: 'owner@test.local',
      password: 'P@ssw0rd!123',
    });
    fixture.detectChanges();

    (root().querySelector('[data-testid="login-password-toggle"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    httpMock.expectNone(`${API_BASE_URL}/api/v1/auth/login`);
  });

  it('submits form when Enter is pressed', () => {
    page().form.setValue({
      email: 'owner@test.local',
      password: 'P@ssw0rd!123',
    });
    fixture.detectChanges();

    const form = root().querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    const req = httpMock.expectOne(`${API_BASE_URL}/api/v1/auth/login`);
    req.flush(createLoginResponse());
  });

  it('switches Arabic and English without refresh', () => {
    const locale = TestBed.inject(LocaleService);

    locale.setLocale('ar');
    fixture.detectChanges();
    expect(document.documentElement.dir).toBe('rtl');
    expect(root().textContent).toContain('مرحبًا بعودتك');

    locale.setLocale('en');
    fixture.detectChanges();
    expect(document.documentElement.dir).toBe('ltr');
    expect(root().textContent).toContain('Welcome Back');

    locale.setLocale('ar');
    fixture.detectChanges();
    expect(root().textContent).toContain('مرحبًا بعودتك');
  });

  it('navigates to safe returnUrl after successful login', async () => {
    await router.navigate(['/login'], {
      queryParams: { returnUrl: '/admin/restaurant-profile' },
    });
    fixture.detectChanges();

    page().form.setValue({
      email: 'owner@test.local',
      password: 'P@ssw0rd!123',
    });
    page().submit();

    const req = httpMock.expectOne(`${API_BASE_URL}/api/v1/auth/login`);
    req.flush(createLoginResponse());

    await fixture.whenStable();
    fixture.detectChanges();

    expect(router.url).toBe('/admin/restaurant-profile');
  });

  it('navigates KitchenManager to /kitchen after login', async () => {
    page().form.setValue({
      email: 'kitchen@test.local',
      password: 'P@ssw0rd!123',
    });
    fixture.detectChanges();

    page().submit();

    const req = httpMock.expectOne(`${API_BASE_URL}/api/v1/auth/login`);
    req.flush(createLoginResponse(ApplicationRoles.KitchenManager));

    await fixture.whenStable();
    fixture.detectChanges();

    expect(router.url).toBe('/kitchen');
  });
});

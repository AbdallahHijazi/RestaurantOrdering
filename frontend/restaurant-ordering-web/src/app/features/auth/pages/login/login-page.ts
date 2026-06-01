import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LocaleService, type SupportedLocale } from '../../../../core/localization/locale';
import { AuthService } from '../../../../core/auth/auth.service';
import { LoginError } from '../../../../core/auth/auth.models';
import {
  DEFAULT_ADMIN_ROUTE,
  sanitizeAdminReturnUrl,
} from '../../../../core/auth/safe-return-url.util';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule],
  templateUrl: './login-page.html',
  styleUrl: './login-page.scss',
})
export class LoginPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly localeService = inject(LocaleService);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly passwordVisible = signal(false);

  protected readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(256)]],
    password: ['', [Validators.required, Validators.maxLength(200)]],
  });

  protected submit(): void {
    this.form.controls.email.setValue(this.form.controls.email.value.trim(), { emitEvent: false });

    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage.set(null);
    this.submitting.set(true);

    const { email, password } = this.form.getRawValue();

    this.authService
      .login(email, password)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.submitting.set(false);
          const returnUrl =
            sanitizeAdminReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl')) ??
            DEFAULT_ADMIN_ROUTE;
          void this.router.navigateByUrl(returnUrl);
        },
        error: (error: unknown) => {
          this.submitting.set(false);
          this.form.controls.password.reset('');
          this.errorMessage.set(this.resolveErrorMessage(error));
        },
      });
  }

  protected togglePasswordVisibility(): void {
    this.passwordVisible.update((visible) => !visible);
  }

  protected setLocale(locale: SupportedLocale): void {
    this.localeService.setLocale(locale);
  }

  protected emailError(): string | null {
    const control = this.form.controls.email;
    if (!control.touched || !control.invalid) {
      return null;
    }

    if (control.hasError('required')) {
      return this.localeService.uiText('loginEmailRequired');
    }

    if (control.hasError('email')) {
      return this.localeService.uiText('loginEmailInvalid');
    }

    return null;
  }

  protected passwordError(): string | null {
    const control = this.form.controls.password;
    if (!control.touched || !control.invalid) {
      return null;
    }

    if (control.hasError('required')) {
      return this.localeService.uiText('loginPasswordRequired');
    }

    return null;
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof LoginError) {
      switch (error.code) {
        case 'invalid-credentials':
          return this.localeService.uiText('loginInvalidCredentials');
        case 'too-many-requests':
          return this.localeService.uiText('loginTooManyAttempts');
        case 'network':
          return this.localeService.uiText('loginNetworkError');
      }
    }

    return this.localeService.uiText('loginNetworkError');
  }
}

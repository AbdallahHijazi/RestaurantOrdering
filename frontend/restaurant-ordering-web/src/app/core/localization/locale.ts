import { Injectable, computed, signal } from '@angular/core';

export type SupportedLocale = 'ar' | 'en';
export type TextDirection = 'rtl' | 'ltr';

export interface LocalizedText {
  ar?: string | null;
  en?: string | null;
}

const LOCALE_STORAGE_KEY = 'restaurant-ordering.locale';

@Injectable({
  providedIn: 'root',
})
export class LocaleService {
  private readonly localeSignal = signal<SupportedLocale>(this.readStoredLocale());

  readonly locale = this.localeSignal.asReadonly();
  readonly direction = computed<TextDirection>(() =>
    this.localeSignal() === 'ar' ? 'rtl' : 'ltr',
  );
  readonly ui = computed(() => UI_TEXT[this.localeSignal()]);

  constructor() {
    this.applyDocumentAttributes(this.localeSignal());
  }

  setLocale(locale: SupportedLocale): void {
    this.localeSignal.set(locale);
    this.applyDocumentAttributes(locale);

    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      // Storage may be unavailable in private mode; ignore.
    }
  }

  toggleLocale(): void {
    this.setLocale(this.localeSignal() === 'ar' ? 'en' : 'ar');
  }

  pickText(text: LocalizedText | null | undefined, fallback = '—'): string {
    return this.pickTextForLocale(this.localeSignal(), text, fallback);
  }

  pickTextForLocale(
    locale: SupportedLocale,
    text: LocalizedText | null | undefined,
    fallback = '—',
  ): string {
    if (!text) {
      return fallback;
    }

    const primary = locale === 'ar' ? text.ar : text.en;
    const secondary = locale === 'ar' ? text.en : text.ar;

    const chosen = (primary?.trim() || secondary?.trim() || '').trim();
    return chosen || fallback;
  }

  formatCurrency(
    amount: number,
    currencyCode = 'SAR',
    countryCode = 'SA',
  ): string {
    const localeTag = this.localeSignal() === 'ar' ? 'ar-SA' : 'en-' + countryCode;

    try {
      return new Intl.NumberFormat(localeTag, {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `${amount.toFixed(2)} ${currencyCode}`;
    }
  }

  uiText(key: UiTextKey): string {
    return this.ui()[key];
  }

  private readStoredLocale(): SupportedLocale {
    try {
      const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
      return stored === 'en' ? 'en' : 'ar';
    } catch {
      return 'ar';
    }
  }

  private applyDocumentAttributes(locale: SupportedLocale): void {
    const dir: TextDirection = locale === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }
}

type UiTextKey =
  | 'loading'
  | 'errorTitle'
  | 'errorGeneric'
  | 'notFoundTitle'
  | 'notFoundMessage'
  | 'emptyCategories'
  | 'emptyItems'
  | 'menuTitle'
  | 'viewMenu'
  | 'openNow'
  | 'closedNow'
  | 'cart'
  | 'footerInfo'
  | 'footerHours'
  | 'footerContact'
  | 'whatsapp'
  | 'demoSaveNotice'
  | 'demoSaveTitle'
  | 'profileTitle'
  | 'saveProfile'
  | 'previewTitle'
  | 'fullPreview'
  | 'closePreview'
  | 'loginBrand'
  | 'loginTitle'
  | 'loginDescription'
  | 'loginEmailLabel'
  | 'loginPasswordLabel'
  | 'loginSubmit'
  | 'loginSubmitting'
  | 'loginShowPassword'
  | 'loginHidePassword'
  | 'loginInvalidCredentials'
  | 'loginTooManyAttempts'
  | 'loginNetworkError'
  | 'loginEmailRequired'
  | 'loginEmailInvalid'
  | 'loginPasswordRequired'
  | 'languageArabic'
  | 'languageEnglish';

const UI_TEXT: Record<SupportedLocale, Record<UiTextKey, string>> = {
  ar: {
    loading: 'جاري تحميل القائمة…',
    errorTitle: 'تعذر تحميل القائمة',
    errorGeneric: 'حدث خطأ أثناء تحميل البيانات. يرجى المحاولة لاحقًا.',
    notFoundTitle: 'المطعم غير موجود',
    notFoundMessage: 'لم نتمكن من العثور على مطعم بهذا الرابط.',
    emptyCategories: 'لا توجد تصنيفات متاحة حاليًا.',
    emptyItems: 'لا توجد أطباق في هذا التصنيف.',
    menuTitle: 'القائمة',
    viewMenu: 'استكشف القائمة',
    openNow: 'مفتوح الآن',
    closedNow: 'مغلق حاليًا',
    cart: 'السلة',
    footerInfo: 'معلومات التواصل',
    footerHours: 'ساعات العمل',
    footerContact: 'تواصل معنا',
    whatsapp: 'واتساب',
    demoSaveNotice: 'المعاينة التجريبية فقط — لم يتم الحفظ على الخادم.',
    demoSaveTitle: 'وضع العرض التجريبي',
    profileTitle: 'إعداد ملف المطعم',
    saveProfile: 'حفظ الإعدادات',
    previewTitle: 'معاينة مباشرة',
    fullPreview: 'معاينة كاملة',
    closePreview: 'إغلاق',
    loginBrand: 'Restaurant Admin',
    loginTitle: 'مرحبًا بعودتك',
    loginDescription: 'سجّل الدخول لإدارة ملف المطعم والقائمة والإعدادات.',
    loginEmailLabel: 'البريد الإلكتروني',
    loginPasswordLabel: 'كلمة المرور',
    loginSubmit: 'تسجيل الدخول',
    loginSubmitting: 'جاري تسجيل الدخول…',
    loginShowPassword: 'إظهار كلمة المرور',
    loginHidePassword: 'إخفاء كلمة المرور',
    loginInvalidCredentials: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
    loginTooManyAttempts: 'محاولات تسجيل الدخول كثيرة جدًا. حاول مرة أخرى لاحقًا.',
    loginNetworkError: 'تعذر تسجيل الدخول حاليًا. حاول مرة أخرى.',
    loginEmailRequired: 'البريد الإلكتروني مطلوب.',
    loginEmailInvalid: 'أدخل بريدًا إلكترونيًا صالحًا.',
    loginPasswordRequired: 'كلمة المرور مطلوبة.',
    languageArabic: 'العربية',
    languageEnglish: 'EN',
  },
  en: {
    loading: 'Loading menu…',
    errorTitle: 'Unable to load menu',
    errorGeneric: 'Something went wrong while loading data. Please try again later.',
    notFoundTitle: 'Restaurant not found',
    notFoundMessage: 'We could not find a restaurant for this link.',
    emptyCategories: 'No categories are available right now.',
    emptyItems: 'No dishes in this category yet.',
    menuTitle: 'Menu',
    viewMenu: 'Explore menu',
    openNow: 'Open now',
    closedNow: 'Closed now',
    cart: 'Cart',
    footerInfo: 'Contact info',
    footerHours: 'Working hours',
    footerContact: 'Get in touch',
    whatsapp: 'WhatsApp',
    demoSaveNotice: 'Demo preview only — not saved to the server.',
    demoSaveTitle: 'Demo mode',
    profileTitle: 'Restaurant profile setup',
    saveProfile: 'Save settings',
    previewTitle: 'Live preview',
    fullPreview: 'Open full preview',
    closePreview: 'Close',
    loginBrand: 'Restaurant Admin',
    loginTitle: 'Welcome Back',
    loginDescription: 'Sign in to manage your restaurant profile, menu, and settings.',
    loginEmailLabel: 'Email',
    loginPasswordLabel: 'Password',
    loginSubmit: 'Sign in',
    loginSubmitting: 'Signing in…',
    loginShowPassword: 'Show password',
    loginHidePassword: 'Hide password',
    loginInvalidCredentials: 'Invalid email or password.',
    loginTooManyAttempts: 'Too many login attempts. Please try again later.',
    loginNetworkError: 'Unable to sign in right now. Please try again.',
    loginEmailRequired: 'Email is required.',
    loginEmailInvalid: 'Enter a valid email address.',
    loginPasswordRequired: 'Password is required.',
    languageArabic: 'العربية',
    languageEnglish: 'EN',
  },
};

/** @deprecated Use LocaleService */
export { LocaleService as Locale };

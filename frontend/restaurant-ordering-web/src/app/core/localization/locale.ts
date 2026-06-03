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
  | 'loginUnsupportedRole'
  | 'adminSidebarLabel'
  | 'adminNavLabel'
  | 'adminNavDashboard'
  | 'adminNavRestaurantProfile'
  | 'adminNavStaff'
  | 'adminPageStaff'
  | 'adminLogout'
  | 'adminOpenSidebar'
  | 'adminCloseSidebar'
  | 'adminPageDashboard'
  | 'adminPageRestaurantProfile'
  | 'adminRoleOwner'
  | 'adminRoleManager'
  | 'adminLanguageGroup'
  | 'adminDashboardEyebrow'
  | 'adminDashboardWelcome'
  | 'adminDashboardLead'
  | 'adminDashboardRoleLabel'
  | 'adminDashboardReadyTitle'
  | 'adminDashboardReadyDescription'
  | 'adminDashboardGoToProfile'
  | 'adminDashboardComingSoonLabel'
  | 'adminDashboardMenuTitle'
  | 'adminDashboardMenuDescription'
  | 'adminDashboardOrdersTitle'
  | 'adminDashboardOrdersDescription'
  | 'adminDashboardStaffTitle'
  | 'adminDashboardStaffDescription'
  | 'staffPageTitle'
  | 'staffPageLead'
  | 'staffAddMember'
  | 'staffAddFirstMember'
  | 'staffListErrorTitle'
  | 'staffListError'
  | 'staffRetry'
  | 'staffEmptyTitle'
  | 'staffEmptyDescription'
  | 'staffColName'
  | 'staffColEmail'
  | 'staffColPhone'
  | 'staffColRole'
  | 'staffColStatus'
  | 'staffColActions'
  | 'staffChangeRole'
  | 'staffStatusActive'
  | 'staffStatusInactive'
  | 'staffRoleManager'
  | 'staffRoleKitchen'
  | 'staffCreateTitle'
  | 'staffCreateSubmit'
  | 'staffCreateSuccess'
  | 'staffChangeRoleTitle'
  | 'staffChangeRoleSubmit'
  | 'staffRoleUpdateSuccess'
  | 'staffCurrentRole'
  | 'staffNewRole'
  | 'staffFormEmail'
  | 'staffFormPassword'
  | 'staffFormFullName'
  | 'staffFormPhone'
  | 'staffFormRole'
  | 'staffCancel'
  | 'staffSaving'
  | 'staffCloseModal'
  | 'staffErrorValidation'
  | 'staffErrorDuplicateEmail'
  | 'staffErrorTooManyRequests'
  | 'staffErrorGeneric'
  | 'staffMissingContextTitle'
  | 'staffMissingContextDescription'
  | 'kitchenEyebrow'
  | 'kitchenTitle'
  | 'kitchenLead'
  | 'kitchenRoleLabel'
  | 'kitchenRoleKitchenManager'
  | 'kitchenLogout'
  | 'kitchenRefresh'
  | 'kitchenRefreshing'
  | 'kitchenRetry'
  | 'kitchenBoardErrorTitle'
  | 'kitchenBoardError'
  | 'kitchenColumnNew'
  | 'kitchenColumnPreparing'
  | 'kitchenColumnReady'
  | 'kitchenColumnEmpty'
  | 'kitchenMobileTabsLabel'
  | 'kitchenOrderTypePickup'
  | 'kitchenOrderTypeDelivery'
  | 'kitchenStatusNew'
  | 'kitchenStatusPreparing'
  | 'kitchenStatusReady'
  | 'kitchenItemsCount'
  | 'kitchenDeliveryIndicator'
  | 'kitchenViewDetails'
  | 'kitchenStartPreparing'
  | 'kitchenMarkReady'
  | 'kitchenReadyWaiting'
  | 'kitchenUpdating'
  | 'kitchenLoadMore'
  | 'kitchenLoadingMore'
  | 'kitchenLoadMoreError'
  | 'kitchenDetailsTitle'
  | 'kitchenCloseDetails'
  | 'kitchenDetailsLoading'
  | 'kitchenDetailsError'
  | 'kitchenFieldOrderNumber'
  | 'kitchenFieldStatus'
  | 'kitchenFieldOrderType'
  | 'kitchenFieldCreatedAt'
  | 'kitchenFieldGuestName'
  | 'kitchenFieldGuestPhone'
  | 'kitchenFieldDeliveryAddress'
  | 'kitchenFieldOrderNotes'
  | 'kitchenFieldTotal'
  | 'kitchenItemsHeading'
  | 'kitchenStatusUpdateSuccess'
  | 'kitchenErrorConflict'
  | 'kitchenErrorForbidden'
  | 'kitchenErrorNotFound'
  | 'kitchenErrorTooManyRequests'
  | 'kitchenErrorGeneric'
  | 'kitchenMissingContextTitle'
  | 'kitchenMissingContextDescription'
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
    loginUnsupportedRole:
      'لا يمكن استخدام هذا الحساب هنا. تواصل مع مسؤول المطعم إذا كنت تعتقد أن هذا خطأ.',
    adminSidebarLabel: 'قائمة إدارة المطعم',
    adminNavLabel: 'التنقل الرئيسي',
    adminNavDashboard: 'لوحة التحكم',
    adminNavRestaurantProfile: 'ملف المطعم',
    adminNavStaff: 'إدارة الموظفين',
    adminPageStaff: 'إدارة الموظفين',
    adminLogout: 'تسجيل الخروج',
    adminOpenSidebar: 'فتح القائمة الجانبية',
    adminCloseSidebar: 'إغلاق القائمة الجانبية',
    adminPageDashboard: 'لوحة التحكم',
    adminPageRestaurantProfile: 'ملف المطعم',
    adminRoleOwner: 'مالك المطعم',
    adminRoleManager: 'مدير المطعم',
    adminLanguageGroup: 'اختيار اللغة',
    adminDashboardEyebrow: 'لوحة التحكم',
    adminDashboardWelcome: 'مرحبًا بك في لوحة إدارة المطعم',
    adminDashboardLead:
      'هيكل لوحة التحكم جاهز. ابدأ بإعداد ملف المطعم، وستُضاف بقية الأقسام تدريجيًا.',
    adminDashboardRoleLabel: 'دورك الحالي:',
    adminDashboardReadyTitle: 'لوحة التحكم جاهزة',
    adminDashboardReadyDescription:
      'يمكنك الآن التنقل بين الأقسام المتاحة. ابدأ بملف المطعم لضبط الهوية والمعاينة.',
    adminDashboardGoToProfile: 'الانتقال إلى ملف المطعم',
    adminDashboardComingSoonLabel: 'أقسام قادمة',
    adminDashboardMenuTitle: 'إدارة القائمة',
    adminDashboardMenuDescription: 'ستظهر أدوات القائمة هنا لاحقًا.',
    adminDashboardOrdersTitle: 'الطلبات',
    adminDashboardOrdersDescription: 'ستظهر متابعة الطلبات هنا لاحقًا.',
    adminDashboardStaffTitle: 'الموظفون',
    adminDashboardStaffDescription: 'ستظهر إدارة الموظفين هنا لاحقًا.',
    staffPageTitle: 'إدارة الموظفين',
    staffPageLead: 'اعرض موظفي المطعم، وأضف حسابات جديدة، وحدّث أدوارهم.',
    staffAddMember: 'إضافة موظف',
    staffAddFirstMember: 'إضافة أول موظف',
    staffListErrorTitle: 'تعذر تحميل الموظفين',
    staffListError: 'حدث خطأ أثناء تحميل قائمة الموظفين. حاول مرة أخرى.',
    staffRetry: 'إعادة المحاولة',
    staffEmptyTitle: 'لا يوجد موظفون بعد',
    staffEmptyDescription: 'ابدأ بإضافة مدير مطعم أو مدير مطبخ لمساعدتك في التشغيل.',
    staffColName: 'الاسم',
    staffColEmail: 'البريد الإلكتروني',
    staffColPhone: 'الهاتف',
    staffColRole: 'الدور',
    staffColStatus: 'الحالة',
    staffColActions: 'إجراءات',
    staffChangeRole: 'تغيير الدور',
    staffStatusActive: 'نشط',
    staffStatusInactive: 'غير نشط',
    staffRoleManager: 'مدير المطعم',
    staffRoleKitchen: 'مدير المطبخ',
    staffCreateTitle: 'إضافة موظف',
    staffCreateSubmit: 'حفظ الموظف',
    staffCreateSuccess: 'تم إنشاء الموظف بنجاح.',
    staffChangeRoleTitle: 'تغيير دور الموظف',
    staffChangeRoleSubmit: 'حفظ الدور',
    staffRoleUpdateSuccess: 'تم تحديث الدور بنجاح.',
    staffCurrentRole: 'الدور الحالي',
    staffNewRole: 'الدور الجديد',
    staffFormEmail: 'البريد الإلكتروني',
    staffFormPassword: 'كلمة المرور',
    staffFormFullName: 'الاسم الكامل',
    staffFormPhone: 'رقم الهاتف (اختياري)',
    staffFormRole: 'الدور',
    staffCancel: 'إلغاء',
    staffSaving: 'جاري الحفظ…',
    staffCloseModal: 'إغلاق النافذة',
    staffErrorValidation: 'تحقق من الحقول وأعد المحاولة.',
    staffErrorDuplicateEmail: 'البريد الإلكتروني مستخدم مسبقًا.',
    staffErrorTooManyRequests: 'عدد المحاولات كبير جدًا. حاول لاحقًا.',
    staffErrorGeneric: 'تعذر إكمال العملية. حاول مرة أخرى.',
    staffMissingContextTitle: 'سياق المطعم غير متوفر',
    staffMissingContextDescription:
      'لا يمكن إدارة الموظفين بدون معرف مطعم في الجلسة الحالية.',
    kitchenEyebrow: 'المطبخ',
    kitchenTitle: 'لوحة المطبخ',
    kitchenLead: 'تابع الطلبات النشطة وحدّث حالة التحضير.',
    kitchenRoleLabel: 'الدور الحالي',
    kitchenRoleKitchenManager: 'مدير المطبخ',
    kitchenLogout: 'تسجيل الخروج',
    kitchenRefresh: 'تحديث',
    kitchenRefreshing: 'جاري التحديث…',
    kitchenRetry: 'إعادة المحاولة',
    kitchenBoardErrorTitle: 'تعذر تحميل الطلبات',
    kitchenBoardError: 'حدث خطأ أثناء تحميل لوحة المطبخ. حاول مرة أخرى.',
    kitchenColumnNew: 'طلبات جديدة',
    kitchenColumnPreparing: 'قيد التحضير',
    kitchenColumnReady: 'جاهزة',
    kitchenColumnEmpty: 'لا توجد طلبات في هذا العمود.',
    kitchenMobileTabsLabel: 'أعمدة الطلبات',
    kitchenOrderTypePickup: 'استلام',
    kitchenOrderTypeDelivery: 'توصيل',
    kitchenStatusNew: 'جديد',
    kitchenStatusPreparing: 'قيد التحضير',
    kitchenStatusReady: 'جاهز',
    kitchenItemsCount: 'البنود',
    kitchenDeliveryIndicator: 'توصيل',
    kitchenViewDetails: 'عرض التفاصيل',
    kitchenStartPreparing: 'بدء التحضير',
    kitchenMarkReady: 'تعليم كجاهز',
    kitchenReadyWaiting: 'بانتظار الاستلام أو التسليم',
    kitchenUpdating: 'جاري التحديث…',
    kitchenLoadMore: 'تحميل المزيد',
    kitchenLoadingMore: 'جاري التحميل…',
    kitchenLoadMoreError: 'تعذر تحميل المزيد من الطلبات.',
    kitchenDetailsTitle: 'تفاصيل الطلب',
    kitchenCloseDetails: 'إغلاق التفاصيل',
    kitchenDetailsLoading: 'جاري تحميل التفاصيل…',
    kitchenDetailsError: 'تعذر تحميل تفاصيل الطلب.',
    kitchenFieldOrderNumber: 'رقم الطلب',
    kitchenFieldStatus: 'الحالة',
    kitchenFieldOrderType: 'نوع الطلب',
    kitchenFieldCreatedAt: 'وقت الإنشاء',
    kitchenFieldGuestName: 'اسم الضيف',
    kitchenFieldGuestPhone: 'هاتف الضيف',
    kitchenFieldDeliveryAddress: 'عنوان التوصيل',
    kitchenFieldOrderNotes: 'ملاحظات الطلب',
    kitchenFieldTotal: 'الإجمالي',
    kitchenItemsHeading: 'البنود',
    kitchenStatusUpdateSuccess: 'تم تحديث حالة الطلب.',
    kitchenErrorConflict: 'تغيّرت حالة الطلب أو لم يعد الانتقال صالحًا. تم تحديث اللوحة.',
    kitchenErrorForbidden: 'ليست لديك صلاحية لتنفيذ هذا الإجراء.',
    kitchenErrorNotFound: 'الطلب لم يعد متاحًا. تم تحديث اللوحة.',
    kitchenErrorTooManyRequests: 'عدد المحاولات كبير جدًا. حاول لاحقًا.',
    kitchenErrorGeneric: 'تعذر إكمال العملية. حاول مرة أخرى.',
    kitchenMissingContextTitle: 'سياق المطعم غير متوفر',
    kitchenMissingContextDescription:
      'لا يمكن عرض لوحة المطبخ بدون معرف مطعم في الجلسة الحالية.',
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
    loginUnsupportedRole:
      'This account cannot be used here. Contact your restaurant administrator if you believe this is a mistake.',
    adminSidebarLabel: 'Restaurant admin menu',
    adminNavLabel: 'Main navigation',
    adminNavDashboard: 'Dashboard',
    adminNavRestaurantProfile: 'Restaurant profile',
    adminNavStaff: 'Staff management',
    adminPageStaff: 'Staff management',
    adminLogout: 'Log out',
    adminOpenSidebar: 'Open sidebar menu',
    adminCloseSidebar: 'Close sidebar menu',
    adminPageDashboard: 'Dashboard',
    adminPageRestaurantProfile: 'Restaurant profile',
    adminRoleOwner: 'Restaurant owner',
    adminRoleManager: 'Restaurant manager',
    adminLanguageGroup: 'Language selection',
    adminDashboardEyebrow: 'Dashboard',
    adminDashboardWelcome: 'Welcome to your restaurant dashboard',
    adminDashboardLead:
      'Your admin shell is ready. Start with the restaurant profile; more sections will arrive in later steps.',
    adminDashboardRoleLabel: 'Your role:',
    adminDashboardReadyTitle: 'Dashboard shell is ready',
    adminDashboardReadyDescription:
      'You can move between the available sections now. Begin with the restaurant profile to set branding and preview.',
    adminDashboardGoToProfile: 'Go to restaurant profile',
    adminDashboardComingSoonLabel: 'Coming soon',
    adminDashboardMenuTitle: 'Menu management',
    adminDashboardMenuDescription: 'Menu tools will appear here in a later step.',
    adminDashboardOrdersTitle: 'Orders',
    adminDashboardOrdersDescription: 'Order tracking will appear here in a later step.',
    adminDashboardStaffTitle: 'Staff',
    adminDashboardStaffDescription: 'Staff management will appear here in a later step.',
    staffPageTitle: 'Staff management',
    staffPageLead: 'View restaurant staff, add new accounts, and update their roles.',
    staffAddMember: 'Add staff member',
    staffAddFirstMember: 'Add first staff member',
    staffListErrorTitle: 'Unable to load staff',
    staffListError: 'Something went wrong while loading staff. Please try again.',
    staffRetry: 'Retry',
    staffEmptyTitle: 'No staff members yet',
    staffEmptyDescription:
      'Start by adding a restaurant manager or kitchen manager to help run operations.',
    staffColName: 'Name',
    staffColEmail: 'Email',
    staffColPhone: 'Phone',
    staffColRole: 'Role',
    staffColStatus: 'Status',
    staffColActions: 'Actions',
    staffChangeRole: 'Change role',
    staffStatusActive: 'Active',
    staffStatusInactive: 'Inactive',
    staffRoleManager: 'Restaurant manager',
    staffRoleKitchen: 'Kitchen manager',
    staffCreateTitle: 'Add staff member',
    staffCreateSubmit: 'Save staff member',
    staffCreateSuccess: 'Staff member created successfully.',
    staffChangeRoleTitle: 'Change staff role',
    staffChangeRoleSubmit: 'Save role',
    staffRoleUpdateSuccess: 'Role updated successfully.',
    staffCurrentRole: 'Current role',
    staffNewRole: 'New role',
    staffFormEmail: 'Email',
    staffFormPassword: 'Password',
    staffFormFullName: 'Full name',
    staffFormPhone: 'Phone number (optional)',
    staffFormRole: 'Role',
    staffCancel: 'Cancel',
    staffSaving: 'Saving…',
    staffCloseModal: 'Close dialog',
    staffErrorValidation: 'Check the form fields and try again.',
    staffErrorDuplicateEmail: 'This email is already in use.',
    staffErrorTooManyRequests: 'Too many requests. Please try again later.',
    staffErrorGeneric: 'Unable to complete the request. Please try again.',
    staffMissingContextTitle: 'Restaurant context unavailable',
    staffMissingContextDescription:
      'Staff management requires a restaurant id in the current session.',
    kitchenEyebrow: 'Kitchen',
    kitchenTitle: 'Kitchen Dashboard',
    kitchenLead: 'Track active orders and update preparation status.',
    kitchenRoleLabel: 'Current role',
    kitchenRoleKitchenManager: 'Kitchen manager',
    kitchenLogout: 'Log out',
    kitchenRefresh: 'Refresh',
    kitchenRefreshing: 'Refreshing…',
    kitchenRetry: 'Retry',
    kitchenBoardErrorTitle: 'Unable to load orders',
    kitchenBoardError: 'Something went wrong while loading the kitchen board. Please try again.',
    kitchenColumnNew: 'New orders',
    kitchenColumnPreparing: 'Preparing',
    kitchenColumnReady: 'Ready',
    kitchenColumnEmpty: 'No orders in this column.',
    kitchenMobileTabsLabel: 'Order columns',
    kitchenOrderTypePickup: 'Pickup',
    kitchenOrderTypeDelivery: 'Delivery',
    kitchenStatusNew: 'New',
    kitchenStatusPreparing: 'Preparing',
    kitchenStatusReady: 'Ready',
    kitchenItemsCount: 'Items',
    kitchenDeliveryIndicator: 'Delivery',
    kitchenViewDetails: 'View details',
    kitchenStartPreparing: 'Start preparing',
    kitchenMarkReady: 'Mark as ready',
    kitchenReadyWaiting: 'Waiting for pickup or handoff',
    kitchenUpdating: 'Updating…',
    kitchenLoadMore: 'Load more',
    kitchenLoadingMore: 'Loading…',
    kitchenLoadMoreError: 'Unable to load more orders.',
    kitchenDetailsTitle: 'Order details',
    kitchenCloseDetails: 'Close details',
    kitchenDetailsLoading: 'Loading details…',
    kitchenDetailsError: 'Unable to load order details.',
    kitchenFieldOrderNumber: 'Order number',
    kitchenFieldStatus: 'Status',
    kitchenFieldOrderType: 'Order type',
    kitchenFieldCreatedAt: 'Created at',
    kitchenFieldGuestName: 'Guest name',
    kitchenFieldGuestPhone: 'Guest phone',
    kitchenFieldDeliveryAddress: 'Delivery address',
    kitchenFieldOrderNotes: 'Order notes',
    kitchenFieldTotal: 'Total',
    kitchenItemsHeading: 'Items',
    kitchenStatusUpdateSuccess: 'Order status updated.',
    kitchenErrorConflict: 'The order status changed or this transition is no longer valid. Board refreshed.',
    kitchenErrorForbidden: 'You are not allowed to perform this action.',
    kitchenErrorNotFound: 'This order is no longer available. Board refreshed.',
    kitchenErrorTooManyRequests: 'Too many requests. Please try again later.',
    kitchenErrorGeneric: 'Unable to complete the request. Please try again.',
    kitchenMissingContextTitle: 'Restaurant context unavailable',
    kitchenMissingContextDescription:
      'The kitchen dashboard requires a restaurant id in the current session.',
    languageArabic: 'العربية',
    languageEnglish: 'EN',
  },
};

/** @deprecated Use LocaleService */
export { LocaleService as Locale };

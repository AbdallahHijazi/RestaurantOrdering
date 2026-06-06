import { Injectable, computed, signal } from '@angular/core';
import { formatOrderCurrency } from '../../shared/orders/order-money.util';

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
    _countryCode = 'SA',
  ): string {
    void _countryCode;
    return formatOrderCurrency(amount, currencyCode);
  }

  uiText(key: UiTextKey): string {
    return this.ui()[key];
  }

  uiTextForLocale(locale: SupportedLocale, key: UiTextKey): string {
    return UI_TEXT[locale][key];
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
  | 'adminConsoleTitle'
  | 'profileNavProfileSetup'
  | 'profileNavMenuBuilder'
  | 'profileNavOrderDashboard'
  | 'profileIdentitySectionDesc'
  | 'profileLocalizationSectionDesc'
  | 'profileContactSectionDesc'
  | 'profileDeliverySectionDesc'
  | 'profileSaveIdentityChanges'
  | 'profileSaveLocalization'
  | 'profileSaveContactInfo'
  | 'profileLiveSync'
  | 'profilePreviewLang'
  | 'profilePreviewDeviceLabel'
  | 'profileWorkspaceSubtitle'
  | 'profileTabIdentity'
  | 'profileTabLocalization'
  | 'profileTabContact'
  | 'profileTabDelivery'
  | 'profilePublishLive'
  | 'profilePublishUnavailable'
  | 'profilePreviewSynced'
  | 'profileUnsavedChanges'
  | 'profilePreviewStudio'
  | 'saveProfile'
  | 'profileDeliverySettingsTitle'
  | 'profileEnablePickup'
  | 'profileEnableDelivery'
  | 'profileDeliveryFee'
  | 'profileMinimumOrder'
  | 'profileTaxRate'
  | 'profileCurrencyCode'
  | 'profileOrderingMethodRequired'
  | 'profileSettingsLoadError'
  | 'profileSettingsRetry'
  | 'profileSettingsSaved'
  | 'profileSaveRestaurant'
  | 'profileSavingRestaurant'
  | 'profileUploadingLogo'
  | 'profileUploadingCoverImage'
  | 'profileLogoUploadFailed'
  | 'profileCoverUploadFailed'
  | 'profileUnsupportedImageType'
  | 'profileImageTooLarge'
  | 'profileInvalidAccentColor'
  | 'profileUnsavedBrandingPreview'
  | 'profileReloadFailed'
  | 'profileSaveOrderingSettings'
  | 'profileRestaurantSaved'
  | 'profileValidationNonNegative'
  | 'profileValidationTaxRate'
  | 'profileValidationCurrency'
  | 'profileCurrencyCodeHelp'
  | 'profileValidationCurrencySymbol'
  | 'previewTitle'
  | 'fullPreview'
  | 'profilePreviewLoadingMenu'
  | 'profilePreviewEmptyMenu'
  | 'profilePreviewErrorMenu'
  | 'profilePreviewRetry'
  | 'profilePreviewRefresh'
  | 'profilePreviewRealMenu'
  | 'profilePreviewDemoMode'
  | 'publicMenuNotFound'
  | 'publicMenuUnavailable'
  | 'publicMenuEmpty'
  | 'closePreview'
  | 'closePreviewAria'
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
  | 'adminNavOrders'
  | 'adminNavMenu'
  | 'adminNavStaff'
  | 'adminPageStaff'
  | 'adminPageOrders'
  | 'adminPageMenu'
  | 'adminLogout'
  | 'adminOpenSidebar'
  | 'adminCloseSidebar'
  | 'adminPageDashboard'
  | 'adminPageRestaurantProfile'
  | 'adminRoleOwner'
  | 'adminRoleManager'
  | 'adminRestaurantLogoAlt'
  | 'adminLanguageGroup'
  | 'adminSwitchToEnglish'
  | 'adminSwitchToArabic'
  | 'adminDashboardEyebrow'
  | 'adminDashboardWelcome'
  | 'adminDashboardLead'
  | 'adminDashboardRoleLabel'
  | 'adminDashboardDemoNotice'
  | 'adminDashboardStatMenuItems'
  | 'adminDashboardStatOrders'
  | 'adminDashboardStatStaff'
  | 'adminDashboardReadyTitle'
  | 'adminDashboardReadyDescription'
  | 'adminDashboardGoToProfile'
  | 'adminDashboardGoToOrders'
  | 'adminDashboardGoToMenu'
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
  | 'staffSearchPlaceholder'
  | 'staffFilterAllRoles'
  | 'staffFilterAllStatuses'
  | 'staffStatTotal'
  | 'staffStatActive'
  | 'staffStatRoles'
  | 'staffShowingCount'
  | 'staffEmptyFiltered'
  | 'staffAccountLabel'
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
  | 'kitchenFieldDeliveryFee'
  | 'kitchenItemsHeading'
  | 'kitchenStatusUpdateSuccess'
  | 'kitchenErrorConflict'
  | 'kitchenErrorForbidden'
  | 'kitchenErrorNotFound'
  | 'kitchenErrorTooManyRequests'
  | 'kitchenErrorGeneric'
  | 'kitchenMissingContextTitle'
  | 'kitchenMissingContextDescription'
  | 'adminOrdersEyebrow'
  | 'adminOrdersTitle'
  | 'adminOrdersLead'
  | 'adminOrdersRefresh'
  | 'adminOrdersRefreshing'
  | 'adminOrdersRetry'
  | 'adminOrdersLoading'
  | 'adminOrdersListErrorTitle'
  | 'adminOrdersListError'
  | 'adminOrdersLoadMoreError'
  | 'adminOrdersEmptyTitle'
  | 'adminOrdersEmptyDescription'
  | 'adminOrdersFiltersLabel'
  | 'adminOrdersFilterAll'
  | 'adminOrdersStatusNew'
  | 'adminOrdersStatusPreparing'
  | 'adminOrdersStatusReady'
  | 'adminOrdersStatusCompleted'
  | 'adminOrdersStatusCancelled'
  | 'adminOrdersTypePickup'
  | 'adminOrdersTypeDelivery'
  | 'adminOrdersColNumber'
  | 'adminOrdersColCreatedAt'
  | 'adminOrdersColType'
  | 'adminOrdersColGuest'
  | 'adminOrdersColPhone'
  | 'adminOrdersColStatus'
  | 'adminOrdersColTotal'
  | 'adminOrdersColActions'
  | 'adminOrdersViewDetails'
  | 'adminOrdersActionStartPreparing'
  | 'adminOrdersActionMarkReady'
  | 'adminOrdersActionComplete'
  | 'adminOrdersActionCancel'
  | 'adminOrdersCancelConfirmTitle'
  | 'adminOrdersCancelConfirmMessage'
  | 'adminOrdersCancelConfirmDismiss'
  | 'adminOrdersDetailsTitle'
  | 'adminOrdersCloseDetails'
  | 'adminOrdersDetailsLoading'
  | 'adminOrdersDetailsError'
  | 'adminOrdersItemsHeading'
  | 'adminOrdersFieldUpdatedAt'
  | 'adminOrdersFieldDeliveryAddress'
  | 'adminOrdersFieldNotes'
  | 'adminOrdersFieldSubtotal'
  | 'adminOrdersFieldDiscount'
  | 'adminOrdersFieldTax'
  | 'adminOrdersFieldDeliveryFee'
  | 'adminOrdersFieldTotal'
  | 'adminOrdersStatusUpdateSuccess'
  | 'adminOrdersErrorConflict'
  | 'adminOrdersErrorForbidden'
  | 'adminOrdersErrorNotFound'
  | 'adminOrdersErrorTooManyRequests'
  | 'adminOrdersErrorGeneric'
  | 'adminOrdersMissingContextTitle'
  | 'adminOrdersMissingContextDescription'
  | 'adminOrdersLoadMore'
  | 'adminMenuPageTitle'
  | 'adminMenuPageLead'
  | 'adminMenuAddItem'
  | 'adminMenuAddCategory'
  | 'adminMenuAllItems'
  | 'adminMenuCategoriesHeading'
  | 'adminMenuItemsHeading'
  | 'adminMenuEdit'
  | 'adminMenuDelete'
  | 'adminMenuActive'
  | 'adminMenuInactive'
  | 'adminMenuAvailable'
  | 'adminMenuUnavailable'
  | 'adminMenuLoading'
  | 'adminMenuRetry'
  | 'adminMenuEmptyItemsTitle'
  | 'adminMenuEmptyItemsDescription'
  | 'adminMenuListErrorTitle'
  | 'adminMenuListError'
  | 'adminMenuMissingContextTitle'
  | 'adminMenuMissingContextDescription'
  | 'adminMenuCreateCategoryTitle'
  | 'adminMenuEditCategoryTitle'
  | 'adminMenuCreateItemTitle'
  | 'adminMenuEditItemTitle'
  | 'adminMenuFormNameAr'
  | 'adminMenuFormNameEn'
  | 'adminMenuFormDescriptionAr'
  | 'adminMenuFormDescriptionEn'
  | 'adminMenuFormDisplayOrder'
  | 'adminMenuFormIsActive'
  | 'adminMenuFormCategory'
  | 'adminMenuFormPrice'
  | 'adminMenuFormDiscountPrice'
  | 'adminMenuFormIsAvailable'
  | 'adminMenuFormImage'
  | 'adminMenuSave'
  | 'adminMenuSaving'
  | 'adminMenuDeleting'
  | 'adminMenuCancel'
  | 'adminMenuCloseModal'
  | 'adminMenuCategoryCreateSuccess'
  | 'adminMenuCategoryUpdateSuccess'
  | 'adminMenuCategoryDeleteSuccess'
  | 'adminMenuItemCreateSuccess'
  | 'adminMenuItemUpdateSuccess'
  | 'adminMenuItemDeleteSuccess'
  | 'adminMenuDeleteCategoryTitle'
  | 'adminMenuDeleteCategoryMessage'
  | 'adminMenuDeleteCategoryWarning'
  | 'adminMenuDeleteItemTitle'
  | 'adminMenuDeleteItemMessage'
  | 'adminMenuConfirmDelete'
  | 'adminMenuDismissDelete'
  | 'adminMenuDiscountLabel'
  | 'adminMenuDiscountInvalid'
  | 'adminMenuImageInvalidType'
  | 'adminMenuImageInvalidSize'
  | 'adminMenuImageInvalidEmpty'
  | 'adminMenuImageHelp'
  | 'adminMenuImagePreviewAlt'
  | 'adminMenuImageFallbackAlt'
  | 'adminMenuErrorForbidden'
  | 'adminMenuErrorNotFound'
  | 'adminMenuErrorConflict'
  | 'adminMenuErrorTooManyRequests'
  | 'adminMenuErrorGeneric'
  | 'adminMenuErrorValidation'
  | 'adminMenuToggleAvailable'
  | 'adminMenuToggleAvailableBusy'
  | 'adminMenuSelectCategory'
  | 'adminMenuSearchLabel'
  | 'adminMenuSearchPlaceholder'
  | 'adminMenuShowingCount'
  | 'adminMenuEmptyFiltered'
  | 'adminMenuAddNewMealTitle'
  | 'adminMenuAddNewMealDescription'
  | 'adminMenuAvailableNow'
  | 'adminMenuAddCategoryAria'
  | 'publicCartTitle'
  | 'publicCartEmpty'
  | 'publicCartRemove'
  | 'publicCartClear'
  | 'publicCartClearConfirm'
  | 'publicCartQuantity'
  | 'publicCartItemNotes'
  | 'publicCartContinueCheckout'
  | 'publicCartClose'
  | 'publicCartOpenAria'
  | 'publicCartCloseAria'
  | 'publicCartSubtotal'
  | 'publicCheckoutTitle'
  | 'publicCheckoutPickup'
  | 'publicCheckoutDelivery'
  | 'publicCheckoutGuestName'
  | 'publicCheckoutGuestPhone'
  | 'publicCheckoutDeliveryAddress'
  | 'publicCheckoutOrderNotes'
  | 'publicCheckoutEstimatedTax'
  | 'publicCheckoutDeliveryFee'
  | 'publicCheckoutEstimatedTotal'
  | 'publicCheckoutEstimatedDisclaimer'
  | 'publicCheckoutMinimumOrder'
  | 'publicCheckoutServiceDisabled'
  | 'publicCheckoutAllServicesDisabled'
  | 'publicCheckoutPreviewMode'
  | 'publicCheckoutSubmit'
  | 'publicCheckoutSubmitting'
  | 'publicCheckoutSuccess'
  | 'publicOrderErrorValidation'
  | 'publicOrderErrorNotFound'
  | 'publicOrderErrorConflict'
  | 'publicOrderErrorTooManyRequests'
  | 'publicOrderErrorGeneric'
  | 'publicOrderErrorReviewCart'
  | 'publicConfirmationTitle'
  | 'publicConfirmationOrderNumber'
  | 'publicConfirmationOrderType'
  | 'publicConfirmationStatus'
  | 'publicConfirmationCreatedAt'
  | 'publicConfirmationItems'
  | 'publicConfirmationSubtotal'
  | 'publicConfirmationDiscount'
  | 'publicConfirmationTax'
  | 'publicConfirmationDeliveryFee'
  | 'publicConfirmationTotal'
  | 'publicConfirmationPickupInstructions'
  | 'publicConfirmationDeliveryInstructions'
  | 'publicConfirmationClose'
  | 'publicConfirmationReturnMenu'
  | 'publicConfirmationCloseAria'
  | 'publicOrderTypePickup'
  | 'publicOrderTypeDelivery'
  | 'publicOrderStatusNew'
  | 'publicStaffLogin'
  | 'publicConfirmationSuccessTitle'
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
    adminConsoleTitle: 'إدارة المطعم',
    profileNavProfileSetup: 'إعداد الملف',
    profileNavMenuBuilder: 'بناء القائمة',
    profileNavOrderDashboard: 'لوحة الطلبات',
    profileIdentitySectionDesc: 'عرّف هوية مطعمك الرقمية ومظهره.',
    profileLocalizationSectionDesc: 'إدارة الإعدادات الخاصة بالمنطقة واللغة.',
    profileContactSectionDesc: 'كيف يتواصل الزبائن معك وأين يجدونك.',
    profileDeliverySectionDesc: 'اضبط توفر الخدمة وقواعد الطلب.',
    profileSaveIdentityChanges: 'حفظ تغييرات الهوية',
    profileSaveLocalization: 'حفظ الإعدادات المحلية',
    profileSaveContactInfo: 'حفظ بيانات التواصل',
    profileLiveSync: 'مزامنة مباشرة',
    profilePreviewLang: 'لغة المعاينة',
    profilePreviewDeviceLabel: 'الجهاز',
    profileWorkspaceSubtitle:
      'خصّص هوية مطعمك وإعداداته ومعاينة تجربة الزبون.',
    profileTabIdentity: 'هوية المطعم',
    profileTabLocalization: 'الدولة وإعدادات اللغة',
    profileTabContact: 'معلومات التواصل',
    profileTabDelivery: 'التوصيل والطلبات',
    profilePublishLive: 'نشر مباشر',
    profilePublishUnavailable:
      'ميزة النشر المباشر ستتاح بعد ربط خدمة النشر. التغييرات المحفوظة تظهر حاليًا في رابط المطعم العام.',
    profilePreviewSynced: 'تمت مزامنة المعاينة',
    profileUnsavedChanges: 'تغييرات غير محفوظة',
    profilePreviewStudio: 'استوديو المعاينة',
    saveProfile: 'حفظ الإعدادات',
    profileDeliverySettingsTitle: 'إعدادات التوصيل والطلبات',
    profileEnablePickup: 'تفعيل الاستلام من المطعم',
    profileEnableDelivery: 'تفعيل خدمة التوصيل',
    profileDeliveryFee: 'رسوم التوصيل',
    profileMinimumOrder: 'الحد الأدنى للطلب',
    profileTaxRate: 'نسبة الضريبة',
    profileCurrencyCode: 'رمز العملة',
    profileOrderingMethodRequired: 'يجب تفعيل الاستلام أو التوصيل على الأقل.',
    profileSettingsLoadError: 'تعذر تحميل إعدادات المطعم. حاول مرة أخرى.',
    profileSettingsRetry: 'إعادة المحاولة',
    profileSettingsSaved: 'تم حفظ إعدادات التوصيل والطلبات بنجاح.',
    profileSaveRestaurant: 'حفظ ملف المطعم',
    profileSavingRestaurant: 'جاري حفظ ملف المطعم…',
    profileUploadingLogo: 'جاري رفع الشعار…',
    profileUploadingCoverImage: 'جاري رفع صورة الغلاف…',
    profileLogoUploadFailed: 'تعذر رفع الشعار. حاول مجددًا.',
    profileCoverUploadFailed: 'تعذر رفع صورة الغلاف. حاول مجددًا.',
    profileUnsupportedImageType: 'نوع الصورة غير مدعوم. استخدم JPEG أو PNG أو WebP.',
    profileImageTooLarge: 'حجم الصورة كبير جدًا. الحد الأقصى 5 ميجابايت.',
    profileInvalidAccentColor: 'لون Accent غير صالح. استخدم صيغة مثل #B8663F.',
    profileUnsavedBrandingPreview: 'معاينة الهوية غير محفوظة — اضغط حفظ ملف المطعم للاحتفاظ بالتغييرات.',
    profileReloadFailed: 'تم الحفظ لكن تعذر إعادة تحميل الملف. حاول تحديث الصفحة.',
    profileSaveOrderingSettings: 'حفظ إعدادات التوصيل والطلبات',
    profileRestaurantSaved: 'تم حفظ ملف المطعم بنجاح.',
    profileValidationNonNegative: 'يجب أن تكون القيمة صفرًا أو أكثر.',
    profileValidationTaxRate: 'نسبة الضريبة يجب أن تكون بين 0 و100.',
    profileValidationCurrency: 'أدخل رمز عملة من 3 أحرف (مثل SAR).',
    profileCurrencyCodeHelp:
      'أدخل رمز العملة المعياري من 3 أحرف مثل USD أو SYP. ستظهر الأسعار بالرمز المناسب تلقائيًا عند توفره.',
    profileValidationCurrencySymbol: 'استخدم رمز عملة من 3 أحرف إنجليزية فقط (مثل USD)، وليس رمزًا مثل $.',
    previewTitle: 'معاينة مباشرة',
    fullPreview: 'معاينة كاملة',
    profilePreviewLoadingMenu: 'جاري تحميل معاينة القائمة…',
    profilePreviewEmptyMenu:
      'لم تضف وجبات إلى قائمتك بعد. أضف تصنيفًا ووجبة من صفحة إدارة القائمة لتظهر هنا.',
    profilePreviewErrorMenu: 'تعذر تحميل معاينة القائمة. حاول مجددًا.',
    profilePreviewRetry: 'إعادة المحاولة',
    profilePreviewRefresh: 'تحديث المعاينة',
    profilePreviewRealMenu: 'معاينة القائمة الفعلية',
    profilePreviewDemoMode: 'وضع معاينة تجريبي — بيانات قائمة تجريبية فقط',
    publicMenuNotFound: 'تعذر العثور على المطعم أو القائمة غير متاحة.',
    publicMenuUnavailable: 'تعذر تحميل القائمة حاليًا. حاول مجددًا.',
    publicMenuEmpty: 'لا توجد وجبات متاحة حالياً.',
    closePreview: 'إغلاق',
    closePreviewAria: 'إغلاق المعاينة',
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
    adminNavOrders: 'إدارة الطلبات',
    adminNavMenu: 'إدارة القائمة',
    adminNavStaff: 'إدارة الموظفين',
    adminPageStaff: 'إدارة الموظفين',
    adminPageOrders: 'إدارة الطلبات',
    adminPageMenu: 'إدارة القائمة',
    adminLogout: 'تسجيل الخروج',
    adminOpenSidebar: 'فتح القائمة الجانبية',
    adminCloseSidebar: 'إغلاق القائمة الجانبية',
    adminPageDashboard: 'لوحة التحكم',
    adminPageRestaurantProfile: 'ملف المطعم',
    adminRoleOwner: 'مالك المطعم',
    adminRoleManager: 'مدير المطعم',
    adminRestaurantLogoAlt: 'شعار المطعم',
    adminLanguageGroup: 'اختيار اللغة',
    adminSwitchToEnglish: 'تبديل لغة الواجهة إلى الإنجليزية',
    adminSwitchToArabic: 'تبديل لغة الواجهة إلى العربية',
    adminDashboardEyebrow: 'لوحة التحكم',
    adminDashboardWelcome: 'مرحبًا بك في لوحة إدارة المطعم',
    adminDashboardLead:
      'هيكل لوحة التحكم جاهز. ابدأ بإعداد ملف المطعم، وستُضاف بقية الأقسام تدريجيًا.',
    adminDashboardRoleLabel: 'دورك الحالي:',
    adminDashboardDemoNotice: 'بيانات تجريبية لمعاينة لوحة التحكم',
    adminDashboardStatMenuItems: 'الوجبات',
    adminDashboardStatOrders: 'الطلبات',
    adminDashboardStatStaff: 'الموظفون',
    adminDashboardReadyTitle: 'لوحة التحكم جاهزة',
    adminDashboardReadyDescription:
      'يمكنك الآن التنقل بين الأقسام المتاحة. ابدأ بملف المطعم لضبط الهوية والمعاينة.',
    adminDashboardGoToProfile: 'الانتقال إلى ملف المطعم',
    adminDashboardGoToOrders: 'الانتقال إلى إدارة الطلبات',
    adminDashboardGoToMenu: 'الانتقال إلى إدارة القائمة',
    adminDashboardComingSoonLabel: 'أقسام قادمة',
    adminDashboardMenuTitle: 'إدارة القائمة',
    adminDashboardMenuDescription: 'أدر التصنيفات والوجبات وصور الأطباق من صفحة واحدة.',
    adminDashboardOrdersTitle: 'الطلبات',
    adminDashboardOrdersDescription: 'تابع الطلبات وحدّث حالتها من صفحة إدارة الطلبات.',
    adminDashboardStaffTitle: 'الموظفون',
    adminDashboardStaffDescription: 'ستظهر إدارة الموظفين هنا لاحقًا.',
    staffPageTitle: 'إدارة الموظفين',
    staffPageLead: 'اعرض موظفي المطعم، وأضف حسابات جديدة، وحدّث أدوارهم بسهولة.',
    staffAddMember: 'إضافة موظف',
    staffAddFirstMember: 'إضافة أول موظف',
    staffListErrorTitle: 'تعذر تحميل الموظفين',
    staffListError: 'حدث خطأ أثناء تحميل قائمة الموظفين. حاول مرة أخرى.',
    staffRetry: 'إعادة المحاولة',
    staffEmptyTitle: 'لا يوجد موظفون مضافون حتى الآن.',
    staffEmptyDescription: 'ابدأ بإضافة مدير مطعم أو مدير مطبخ لمساعدتك في التشغيل.',
    staffEmptyFiltered: 'لا توجد نتائج مطابقة لعملية البحث أو التصفية المحددة.',
    staffSearchPlaceholder: 'ابحث بالاسم أو البريد أو الهاتف...',
    staffFilterAllRoles: 'كل الأدوار',
    staffFilterAllStatuses: 'كل الحالات',
    staffStatTotal: 'إجمالي الموظفين',
    staffStatActive: 'الحسابات النشطة',
    staffStatRoles: 'الأدوار الحالية',
    staffShowingCount: 'عرض {shown} من أصل {total} موظفين',
    staffAccountLabel: 'حساب إداري',
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
    staffCreateTitle: 'إضافة موظف جديد',
    staffCreateSubmit: 'حفظ الموظف',
    staffCreateSuccess: 'تم إنشاء الموظف بنجاح.',
    staffChangeRoleTitle: 'تغيير دور الموظف',
    staffChangeRoleSubmit: 'حفظ التغيير',
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
    kitchenFieldDeliveryFee: 'رسوم التوصيل',
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
    adminOrdersEyebrow: 'الطلبات',
    adminOrdersTitle: 'إدارة الطلبات',
    adminOrdersLead: 'اعرض طلبات المطعم وحدّث حالتها من مكان واحد.',
    adminOrdersRefresh: 'تحديث',
    adminOrdersRefreshing: 'جاري التحديث…',
    adminOrdersRetry: 'إعادة المحاولة',
    adminOrdersLoading: 'جاري تحميل الطلبات…',
    adminOrdersListErrorTitle: 'تعذر تحميل الطلبات',
    adminOrdersListError: 'حدث خطأ أثناء تحميل الطلبات. حاول مرة أخرى.',
    adminOrdersLoadMoreError: 'تعذر تحميل المزيد من الطلبات.',
    adminOrdersEmptyTitle: 'لا توجد طلبات',
    adminOrdersEmptyDescription: 'لا توجد طلبات مطابقة للتصفية الحالية.',
    adminOrdersFiltersLabel: 'تصفية حسب الحالة',
    adminOrdersFilterAll: 'الكل',
    adminOrdersStatusNew: 'جديد',
    adminOrdersStatusPreparing: 'قيد التحضير',
    adminOrdersStatusReady: 'جاهز',
    adminOrdersStatusCompleted: 'مكتمل',
    adminOrdersStatusCancelled: 'ملغى',
    adminOrdersTypePickup: 'استلام',
    adminOrdersTypeDelivery: 'توصيل',
    adminOrdersColNumber: 'رقم الطلب',
    adminOrdersColCreatedAt: 'وقت الإنشاء',
    adminOrdersColType: 'نوع الطلب',
    adminOrdersColGuest: 'اسم الضيف',
    adminOrdersColPhone: 'هاتف الضيف',
    adminOrdersColStatus: 'الحالة',
    adminOrdersColTotal: 'الإجمالي',
    adminOrdersColActions: 'إجراءات',
    adminOrdersViewDetails: 'عرض التفاصيل',
    adminOrdersActionStartPreparing: 'بدء التحضير',
    adminOrdersActionMarkReady: 'تعليم كجاهز',
    adminOrdersActionComplete: 'تعليم كمكتمل',
    adminOrdersActionCancel: 'إلغاء',
    adminOrdersCancelConfirmTitle: 'تأكيد الإلغاء',
    adminOrdersCancelConfirmMessage: 'هل تريد إلغاء هذا الطلب؟',
    adminOrdersCancelConfirmDismiss: 'تراجع',
    adminOrdersDetailsTitle: 'تفاصيل الطلب',
    adminOrdersCloseDetails: 'إغلاق التفاصيل',
    adminOrdersDetailsLoading: 'جاري تحميل التفاصيل…',
    adminOrdersDetailsError: 'تعذر تحميل تفاصيل الطلب.',
    adminOrdersItemsHeading: 'البنود',
    adminOrdersFieldUpdatedAt: 'آخر تحديث',
    adminOrdersFieldDeliveryAddress: 'عنوان التوصيل',
    adminOrdersFieldNotes: 'ملاحظات الطلب',
    adminOrdersFieldSubtotal: 'المجموع الفرعي',
    adminOrdersFieldDiscount: 'الخصم',
    adminOrdersFieldTax: 'الضريبة',
    adminOrdersFieldDeliveryFee: 'رسوم التوصيل',
    adminOrdersFieldTotal: 'الإجمالي',
    adminOrdersStatusUpdateSuccess: 'تم تحديث حالة الطلب.',
    adminOrdersErrorConflict: 'تغيّرت حالة الطلب أو لم يعد الانتقال صالحًا. تم تحديث القائمة.',
    adminOrdersErrorForbidden: 'ليست لديك صلاحية لتنفيذ هذا الإجراء.',
    adminOrdersErrorNotFound: 'الطلب لم يعد متاحًا. تم تحديث القائمة.',
    adminOrdersErrorTooManyRequests: 'عدد المحاولات كبير جدًا. حاول لاحقًا.',
    adminOrdersErrorGeneric: 'تعذر إكمال العملية. حاول مرة أخرى.',
    adminOrdersMissingContextTitle: 'سياق المطعم غير متوفر',
    adminOrdersMissingContextDescription:
      'لا يمكن إدارة الطلبات بدون معرف مطعم في الجلسة الحالية.',
    adminOrdersLoadMore: 'تحميل المزيد',
    adminMenuPageTitle: 'إدارة القائمة',
    adminMenuPageLead: 'أدر التصنيفات والوجبات وصور الأطباق لمطعمك بلمسة عصرية.',
    adminMenuAddItem: 'إضافة وجبة',
    adminMenuAddCategory: 'إضافة تصنيف',
    adminMenuAllItems: 'كل الوجبات',
    adminMenuCategoriesHeading: 'التصنيفات',
    adminMenuItemsHeading: 'الوجبات',
    adminMenuEdit: 'تعديل',
    adminMenuDelete: 'حذف',
    adminMenuActive: 'نشط',
    adminMenuInactive: 'غير نشط',
    adminMenuAvailable: 'متاح',
    adminMenuUnavailable: 'غير متاح',
    adminMenuLoading: 'جاري تحميل الوجبات…',
    adminMenuRetry: 'إعادة المحاولة',
    adminMenuEmptyItemsTitle: 'لا توجد وجبات',
    adminMenuEmptyItemsDescription: 'ابدأ بإضافة أول وجبة لهذا التصنيف.',
    adminMenuListErrorTitle: 'تعذر تحميل البيانات',
    adminMenuListError: 'حدث خطأ أثناء تحميل بيانات القائمة. حاول مرة أخرى.',
    adminMenuMissingContextTitle: 'سياق المطعم غير متوفر',
    adminMenuMissingContextDescription: 'تعذر تحديد المطعم الحالي. أعد تسجيل الدخول ثم حاول مجددًا.',
    adminMenuCreateCategoryTitle: 'إضافة تصنيف',
    adminMenuEditCategoryTitle: 'تعديل تصنيف',
    adminMenuCreateItemTitle: 'إضافة وجبة',
    adminMenuEditItemTitle: 'تعديل وجبة',
    adminMenuFormNameAr: 'الاسم بالعربية',
    adminMenuFormNameEn: 'الاسم بالإنجليزية (اختياري)',
    adminMenuFormDescriptionAr: 'الوصف بالعربية (اختياري)',
    adminMenuFormDescriptionEn: 'الوصف بالإنجليزية (اختياري)',
    adminMenuFormDisplayOrder: 'ترتيب العرض',
    adminMenuFormIsActive: 'تصنيف نشط',
    adminMenuFormCategory: 'التصنيف',
    adminMenuFormPrice: 'السعر',
    adminMenuFormDiscountPrice: 'سعر الخصم (اختياري)',
    adminMenuFormIsAvailable: 'متاح للطلب',
    adminMenuFormImage: 'صورة الوجبة (اختياري)',
    adminMenuSave: 'حفظ',
    adminMenuSaving: 'جاري الحفظ…',
    adminMenuDeleting: 'جاري الحذف…',
    adminMenuCancel: 'إلغاء',
    adminMenuCloseModal: 'إغلاق النافذة',
    adminMenuCategoryCreateSuccess: 'تم إنشاء التصنيف بنجاح.',
    adminMenuCategoryUpdateSuccess: 'تم تحديث التصنيف بنجاح.',
    adminMenuCategoryDeleteSuccess: 'تم حذف التصنيف.',
    adminMenuItemCreateSuccess: 'تم إنشاء الوجبة بنجاح.',
    adminMenuItemUpdateSuccess: 'تم تحديث الوجبة بنجاح.',
    adminMenuItemDeleteSuccess: 'تم حذف الوجبة.',
    adminMenuDeleteCategoryTitle: 'حذف التصنيف',
    adminMenuDeleteCategoryMessage: 'هل تريد حذف هذا التصنيف؟',
    adminMenuDeleteCategoryWarning:
      'يحتوي هذا التصنيف على وجبات. قد تختفي من القائمة العامة بعد الحذف.',
    adminMenuDeleteItemTitle: 'حذف الوجبة',
    adminMenuDeleteItemMessage: 'هل تريد حذف هذه الوجبة؟',
    adminMenuConfirmDelete: 'تأكيد الحذف',
    adminMenuDismissDelete: 'تراجع',
    adminMenuDiscountLabel: 'خصم:',
    adminMenuDiscountInvalid: 'سعر الخصم يجب أن يكون أكبر من أو يساوي صفرًا ولا يتجاوز السعر.',
    adminMenuImageInvalidType: 'نوع الصورة غير مدعوم. استخدم JPEG أو PNG أو WebP.',
    adminMenuImageInvalidSize: 'حجم الصورة يتجاوز الحد المسموح (5MB).',
    adminMenuImageInvalidEmpty: 'الملف المختار فارغ.',
    adminMenuImageHelp: 'JPEG أو PNG أو WebP حتى 5MB. تُرفع الصورة عند الحفظ فقط.',
    adminMenuImagePreviewAlt: 'معاينة صورة الوجبة',
    adminMenuImageFallbackAlt: 'لا توجد صورة',
    adminMenuErrorForbidden: 'ليست لديك صلاحية لتنفيذ هذا الإجراء.',
    adminMenuErrorNotFound: 'العنصر لم يعد متاحًا. تم تحديث القائمة.',
    adminMenuErrorConflict: 'تعارض في البيانات. راجع القيم وحاول مرة أخرى.',
    adminMenuErrorTooManyRequests: 'عدد المحاولات كبير جدًا. حاول لاحقًا.',
    adminMenuErrorGeneric: 'حدث خطأ غير متوقع. حاول مرة أخرى.',
    adminMenuErrorValidation: 'تحقق من الحقول المطلوبة ثم حاول مرة أخرى.',
    adminMenuToggleAvailable: 'تبديل التوفر',
    adminMenuToggleAvailableBusy: 'جاري التحديث…',
    adminMenuSelectCategory: 'اختر تصنيفًا',
    adminMenuSearchLabel: 'بحث الوجبات',
    adminMenuSearchPlaceholder: 'ابحث عن وجبة…',
    adminMenuShowingCount: 'عرض {shown} من أصل {total}',
    adminMenuEmptyFiltered: 'لا توجد وجبات مطابقة لعملية البحث أو التصنيف المحدد.',
    adminMenuAddNewMealTitle: 'إضافة وجبة جديدة',
    adminMenuAddNewMealDescription: 'أنشئ طبقًا جديدًا وأضف صورته وتفاصيله.',
    adminMenuAvailableNow: 'متاح الآن',
    adminMenuAddCategoryAria: 'إضافة تصنيف',
    publicCartTitle: 'سلة الطلب',
    publicCartEmpty: 'سلتك فارغة. أضف وجبات من القائمة.',
    publicCartRemove: 'إزالة',
    publicCartClear: 'إفراغ السلة',
    publicCartClearConfirm: 'هل تريد إفراغ السلة؟',
    publicCartQuantity: 'الكمية',
    publicCartItemNotes: 'ملاحظات على الوجبة',
    publicCartContinueCheckout: 'متابعة إلى الدفع',
    publicCartClose: 'إغلاق',
    publicCartOpenAria: 'فتح سلة الطلب',
    publicCartCloseAria: 'إغلاق النافذة',
    publicCartSubtotal: 'المجموع الفرعي',
    publicCheckoutTitle: 'إتمام الطلب',
    publicCheckoutPickup: 'استلام من المطعم',
    publicCheckoutDelivery: 'توصيل',
    publicCheckoutGuestName: 'الاسم',
    publicCheckoutGuestPhone: 'رقم الجوال',
    publicCheckoutDeliveryAddress: 'عنوان التوصيل',
    publicCheckoutOrderNotes: 'ملاحظات على الطلب (اختياري)',
    publicCheckoutEstimatedTax: 'الضريبة التقديرية',
    publicCheckoutDeliveryFee: 'رسوم التوصيل',
    publicCheckoutEstimatedTotal: 'الإجمالي التقديري',
    publicCheckoutEstimatedDisclaimer:
      'الإجمالي التقديري — يتم تأكيد المبلغ النهائي عند إرسال الطلب',
    publicCheckoutMinimumOrder: 'الحد الأدنى للطلب غير محقق.',
    publicCheckoutServiceDisabled: 'هذه الخدمة غير متاحة حاليًا.',
    publicCheckoutAllServicesDisabled: 'الطلب غير متاح حاليًا لهذا المطعم.',
    publicCheckoutPreviewMode:
      'وضع المعاينة — استخدم رابط مطعم فعلي لإرسال الطلب',
    publicCheckoutSubmit: 'إرسال الطلب',
    publicCheckoutSubmitting: 'جاري إرسال الطلب…',
    publicCheckoutSuccess: 'تم استلام طلبك بنجاح.',
    publicOrderErrorValidation: 'تحقق من البيانات المدخلة ثم حاول مرة أخرى.',
    publicOrderErrorNotFound:
      'المطعم أو إحدى الوجبات لم تعد متاحة. راجع القائمة والسلة.',
    publicOrderErrorConflict: 'تعذر إتمام الطلب. راجع الخدمة أو الحد الأدنى.',
    publicOrderErrorTooManyRequests: 'عدد الطلبات كبير. حاول لاحقًا.',
    publicOrderErrorGeneric: 'تعذر إرسال الطلب. حاول مرة أخرى.',
    publicOrderErrorReviewCart: 'راجع السلة ثم حاول مرة أخرى.',
    publicConfirmationTitle: 'تأكيد الطلب',
    publicConfirmationOrderNumber: 'رقم الطلب',
    publicConfirmationOrderType: 'نوع الطلب',
    publicConfirmationStatus: 'الحالة',
    publicConfirmationCreatedAt: 'وقت الطلب',
    publicConfirmationItems: 'تفاصيل الوجبات',
    publicConfirmationSubtotal: 'المجموع الفرعي',
    publicConfirmationDiscount: 'الخصم',
    publicConfirmationTax: 'الضريبة',
    publicConfirmationDeliveryFee: 'رسوم التوصيل',
    publicConfirmationTotal: 'الإجمالي',
    publicConfirmationPickupInstructions: 'سيتم تجهيز طلبك للاستلام من المطعم.',
    publicConfirmationDeliveryInstructions:
      'سيتم تجهيز طلبك للتوصيل إلى العنوان المحدد.',
    publicConfirmationClose: 'إغلاق',
    publicConfirmationReturnMenu: 'العودة إلى المنيو',
    publicConfirmationCloseAria: 'إغلاق تأكيد الطلب',
    publicOrderTypePickup: 'استلام',
    publicOrderTypeDelivery: 'توصيل',
    publicOrderStatusNew: 'جديد',
    publicStaffLogin: 'دخول الإدارة',
    publicConfirmationSuccessTitle: 'تأكيد الطلب',
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
    adminConsoleTitle: 'Admin Console',
    profileNavProfileSetup: 'Profile Setup',
    profileNavMenuBuilder: 'Menu Builder',
    profileNavOrderDashboard: 'Order Dashboard',
    profileIdentitySectionDesc: "Define your brand's digital presence and appearance.",
    profileLocalizationSectionDesc: 'Manage region-specific settings and operational defaults.',
    profileContactSectionDesc: 'How customers can reach you and where to find you.',
    profileDeliverySectionDesc: 'Configure your service availability and ordering rules.',
    profileSaveIdentityChanges: 'Save identity changes',
    profileSaveLocalization: 'Save localization',
    profileSaveContactInfo: 'Save contact info',
    profileLiveSync: 'Live sync',
    profilePreviewLang: 'Preview lang',
    profilePreviewDeviceLabel: 'Device',
    profileWorkspaceSubtitle:
      'Customize your restaurant identity, settings, and customer experience.',
    profileTabIdentity: 'Restaurant identity',
    profileTabLocalization: 'Localization & settings',
    profileTabContact: 'Contact details',
    profileTabDelivery: 'Delivery & ordering',
    profilePublishLive: 'Publish live',
    profilePublishUnavailable:
      'Live publishing will be available after publishing-service integration. Saved changes currently appear through the public restaurant link.',
    profilePreviewSynced: 'Preview synced',
    profileUnsavedChanges: 'Unsaved changes',
    profilePreviewStudio: 'Preview studio',
    saveProfile: 'Save settings',
    profileDeliverySettingsTitle: 'Delivery and ordering settings',
    profileEnablePickup: 'Enable pickup',
    profileEnableDelivery: 'Enable delivery',
    profileDeliveryFee: 'Delivery fee',
    profileMinimumOrder: 'Minimum order amount',
    profileTaxRate: 'Tax rate',
    profileCurrencyCode: 'Currency code',
    profileOrderingMethodRequired: 'At least one ordering method must be enabled.',
    profileSettingsLoadError: 'Could not load restaurant settings.',
    profileSettingsRetry: 'Retry',
    profileSettingsSaved: 'Delivery and ordering settings saved successfully.',
    profileSaveRestaurant: 'Save restaurant profile',
    profileSavingRestaurant: 'Saving restaurant profile…',
    profileUploadingLogo: 'Uploading logo…',
    profileUploadingCoverImage: 'Uploading cover image…',
    profileLogoUploadFailed: 'The logo could not be uploaded. Please try again.',
    profileCoverUploadFailed: 'The cover image could not be uploaded. Please try again.',
    profileUnsupportedImageType: 'Unsupported image type. Use JPEG, PNG, or WebP.',
    profileImageTooLarge: 'The image is too large. Maximum size is 5 MB.',
    profileInvalidAccentColor: 'Invalid accent color. Use a value like #B8663F.',
    profileUnsavedBrandingPreview:
      'Branding preview is unsaved — click Save restaurant profile to keep your changes.',
    profileReloadFailed: 'Saved, but the profile could not be reloaded. Try refreshing the page.',
    profileSaveOrderingSettings: 'Save delivery and ordering settings',
    profileRestaurantSaved: 'Restaurant profile saved successfully.',
    profileValidationNonNegative: 'Value must be zero or greater.',
    profileValidationTaxRate: 'Tax rate must be between 0 and 100.',
    profileValidationCurrency: 'Enter a 3-letter currency code (e.g. SAR).',
    profileCurrencyCodeHelp:
      'Enter a 3-letter ISO currency code such as USD or SYP. Prices use the appropriate symbol automatically when available.',
    profileValidationCurrencySymbol:
      'Use a 3-letter ISO currency code (e.g. USD), not a symbol such as $.',
    previewTitle: 'Live preview',
    fullPreview: 'Open full preview',
    profilePreviewLoadingMenu: 'Loading menu preview…',
    profilePreviewEmptyMenu:
      'Your menu does not have any items yet. Add a category and a menu item from Menu Management to preview them here.',
    profilePreviewErrorMenu: 'Failed to load the menu preview. Please try again.',
    profilePreviewRetry: 'Retry',
    profilePreviewRefresh: 'Refresh preview',
    profilePreviewRealMenu: 'Real menu preview',
    profilePreviewDemoMode: 'Demo preview mode — sample menu data only',
    publicMenuNotFound: 'The restaurant could not be found or its menu is unavailable.',
    publicMenuUnavailable: 'The menu could not be loaded right now. Please try again.',
    publicMenuEmpty: 'No menu items are currently available.',
    closePreview: 'Close',
    closePreviewAria: 'Close preview',
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
    adminNavOrders: 'Orders management',
    adminNavMenu: 'Menu management',
    adminNavStaff: 'Staff management',
    adminPageStaff: 'Staff management',
    adminPageOrders: 'Orders management',
    adminPageMenu: 'Menu management',
    adminLogout: 'Log out',
    adminOpenSidebar: 'Open sidebar menu',
    adminCloseSidebar: 'Close sidebar menu',
    adminPageDashboard: 'Dashboard',
    adminPageRestaurantProfile: 'Restaurant profile',
    adminRoleOwner: 'Restaurant owner',
    adminRoleManager: 'Restaurant manager',
    adminRestaurantLogoAlt: 'Restaurant logo',
    adminLanguageGroup: 'Language selection',
    adminSwitchToEnglish: 'Switch interface language to English',
    adminSwitchToArabic: 'Switch interface language to Arabic',
    adminDashboardEyebrow: 'Dashboard',
    adminDashboardWelcome: 'Welcome to your restaurant dashboard',
    adminDashboardLead:
      'Your admin shell is ready. Start with the restaurant profile; more sections will arrive in later steps.',
    adminDashboardRoleLabel: 'Your role:',
    adminDashboardDemoNotice: 'Demo data for dashboard preview',
    adminDashboardStatMenuItems: 'Menu items',
    adminDashboardStatOrders: 'Orders',
    adminDashboardStatStaff: 'Staff',
    adminDashboardReadyTitle: 'Dashboard shell is ready',
    adminDashboardReadyDescription:
      'You can move between the available sections now. Begin with the restaurant profile to set branding and preview.',
    adminDashboardGoToProfile: 'Go to restaurant profile',
    adminDashboardGoToOrders: 'Go to orders management',
    adminDashboardGoToMenu: 'Go to menu management',
    adminDashboardComingSoonLabel: 'Coming soon',
    adminDashboardMenuTitle: 'Menu management',
    adminDashboardMenuDescription: 'Manage categories, menu items, and dish photos from one page.',
    adminDashboardOrdersTitle: 'Orders',
    adminDashboardOrdersDescription: 'Track orders and update their status from the orders management page.',
    adminDashboardStaffTitle: 'Staff',
    adminDashboardStaffDescription: 'Staff management will appear here in a later step.',
    staffPageTitle: 'Employees Management',
    staffPageLead: 'View restaurant employees, create new accounts, and update their roles with ease.',
    staffAddMember: 'Add Employee',
    staffAddFirstMember: 'Add first employee',
    staffListErrorTitle: 'Unable to load staff',
    staffListError: 'Something went wrong while loading staff. Please try again.',
    staffRetry: 'Retry',
    staffEmptyTitle: 'No employees have been added yet.',
    staffEmptyDescription:
      'Start by adding a restaurant manager or kitchen manager to help run operations.',
    staffEmptyFiltered: 'No employees match the current search or selected filters.',
    staffSearchPlaceholder: 'Search by name, email, or phone...',
    staffFilterAllRoles: 'All Roles',
    staffFilterAllStatuses: 'All Statuses',
    staffStatTotal: 'Total Employees',
    staffStatActive: 'Active Accounts',
    staffStatRoles: 'Current Roles',
    staffShowingCount: 'Showing {shown} of {total} employees',
    staffAccountLabel: 'Admin account',
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
    staffCreateTitle: 'Add New Employee',
    staffCreateSubmit: 'Save Employee',
    staffCreateSuccess: 'Staff member created successfully.',
    staffChangeRoleTitle: 'Change staff role',
    staffChangeRoleSubmit: 'Save Change',
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
    kitchenFieldDeliveryFee: 'Delivery fee',
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
    adminOrdersEyebrow: 'Orders',
    adminOrdersTitle: 'Orders management',
    adminOrdersLead: 'Review restaurant orders and update their status from one place.',
    adminOrdersRefresh: 'Refresh',
    adminOrdersRefreshing: 'Refreshing…',
    adminOrdersRetry: 'Retry',
    adminOrdersLoading: 'Loading orders…',
    adminOrdersListErrorTitle: 'Unable to load orders',
    adminOrdersListError: 'Something went wrong while loading orders. Please try again.',
    adminOrdersLoadMoreError: 'Unable to load more orders.',
    adminOrdersEmptyTitle: 'No orders found',
    adminOrdersEmptyDescription: 'There are no orders for the current filter.',
    adminOrdersFiltersLabel: 'Filter by status',
    adminOrdersFilterAll: 'All',
    adminOrdersStatusNew: 'New',
    adminOrdersStatusPreparing: 'Preparing',
    adminOrdersStatusReady: 'Ready',
    adminOrdersStatusCompleted: 'Completed',
    adminOrdersStatusCancelled: 'Cancelled',
    adminOrdersTypePickup: 'Pickup',
    adminOrdersTypeDelivery: 'Delivery',
    adminOrdersColNumber: 'Order number',
    adminOrdersColCreatedAt: 'Created at',
    adminOrdersColType: 'Order type',
    adminOrdersColGuest: 'Guest name',
    adminOrdersColPhone: 'Guest phone',
    adminOrdersColStatus: 'Status',
    adminOrdersColTotal: 'Total',
    adminOrdersColActions: 'Actions',
    adminOrdersViewDetails: 'View details',
    adminOrdersActionStartPreparing: 'Start preparing',
    adminOrdersActionMarkReady: 'Mark as ready',
    adminOrdersActionComplete: 'Mark as completed',
    adminOrdersActionCancel: 'Cancel',
    adminOrdersCancelConfirmTitle: 'Confirm cancellation',
    adminOrdersCancelConfirmMessage: 'Do you want to cancel this order?',
    adminOrdersCancelConfirmDismiss: 'Keep order',
    adminOrdersDetailsTitle: 'Order details',
    adminOrdersCloseDetails: 'Close details',
    adminOrdersDetailsLoading: 'Loading details…',
    adminOrdersDetailsError: 'Unable to load order details.',
    adminOrdersItemsHeading: 'Items',
    adminOrdersFieldUpdatedAt: 'Updated at',
    adminOrdersFieldDeliveryAddress: 'Delivery address',
    adminOrdersFieldNotes: 'Order notes',
    adminOrdersFieldSubtotal: 'Subtotal',
    adminOrdersFieldDiscount: 'Discount',
    adminOrdersFieldTax: 'Tax',
    adminOrdersFieldDeliveryFee: 'Delivery fee',
    adminOrdersFieldTotal: 'Total',
    adminOrdersStatusUpdateSuccess: 'Order status updated.',
    adminOrdersErrorConflict:
      'The order status changed or this transition is no longer valid. List refreshed.',
    adminOrdersErrorForbidden: 'You are not allowed to perform this action.',
    adminOrdersErrorNotFound: 'This order is no longer available. List refreshed.',
    adminOrdersErrorTooManyRequests: 'Too many requests. Please try again later.',
    adminOrdersErrorGeneric: 'Unable to complete the request. Please try again.',
    adminOrdersMissingContextTitle: 'Restaurant context unavailable',
    adminOrdersMissingContextDescription:
      'Orders management requires a restaurant id in the current session.',
    adminOrdersLoadMore: 'Load more',
    adminMenuPageTitle: 'Menu management',
    adminMenuPageLead:
      'Manage categories, meals, and dish images for your restaurant with a modern experience.',
    adminMenuAddItem: 'Add menu item',
    adminMenuAddCategory: 'Add category',
    adminMenuAllItems: 'All items',
    adminMenuCategoriesHeading: 'Categories',
    adminMenuItemsHeading: 'Menu items',
    adminMenuEdit: 'Edit',
    adminMenuDelete: 'Delete',
    adminMenuActive: 'Active',
    adminMenuInactive: 'Inactive',
    adminMenuAvailable: 'Available',
    adminMenuUnavailable: 'Unavailable',
    adminMenuLoading: 'Loading menu items…',
    adminMenuRetry: 'Retry',
    adminMenuEmptyItemsTitle: 'No menu items yet',
    adminMenuEmptyItemsDescription: 'Start by adding the first item for this category.',
    adminMenuListErrorTitle: 'Unable to load menu data',
    adminMenuListError: 'Something went wrong while loading menu data. Please try again.',
    adminMenuMissingContextTitle: 'Restaurant context unavailable',
    adminMenuMissingContextDescription:
      'The current restaurant could not be resolved. Sign in again and retry.',
    adminMenuCreateCategoryTitle: 'Add category',
    adminMenuEditCategoryTitle: 'Edit category',
    adminMenuCreateItemTitle: 'Add menu item',
    adminMenuEditItemTitle: 'Edit menu item',
    adminMenuFormNameAr: 'Arabic name',
    adminMenuFormNameEn: 'English name (optional)',
    adminMenuFormDescriptionAr: 'Arabic description (optional)',
    adminMenuFormDescriptionEn: 'English description (optional)',
    adminMenuFormDisplayOrder: 'Display order',
    adminMenuFormIsActive: 'Active category',
    adminMenuFormCategory: 'Category',
    adminMenuFormPrice: 'Price',
    adminMenuFormDiscountPrice: 'Discount price (optional)',
    adminMenuFormIsAvailable: 'Available for ordering',
    adminMenuFormImage: 'Item image (optional)',
    adminMenuSave: 'Save',
    adminMenuSaving: 'Saving…',
    adminMenuDeleting: 'Deleting…',
    adminMenuCancel: 'Cancel',
    adminMenuCloseModal: 'Close dialog',
    adminMenuCategoryCreateSuccess: 'Category created successfully.',
    adminMenuCategoryUpdateSuccess: 'Category updated successfully.',
    adminMenuCategoryDeleteSuccess: 'Category deleted.',
    adminMenuItemCreateSuccess: 'Menu item created successfully.',
    adminMenuItemUpdateSuccess: 'Menu item updated successfully.',
    adminMenuItemDeleteSuccess: 'Menu item deleted.',
    adminMenuDeleteCategoryTitle: 'Delete category',
    adminMenuDeleteCategoryMessage: 'Do you want to delete this category?',
    adminMenuDeleteCategoryWarning:
      'This category contains menu items. They may disappear from the public menu after deletion.',
    adminMenuDeleteItemTitle: 'Delete menu item',
    adminMenuDeleteItemMessage: 'Do you want to delete this menu item?',
    adminMenuConfirmDelete: 'Confirm delete',
    adminMenuDismissDelete: 'Keep item',
    adminMenuDiscountLabel: 'Discount:',
    adminMenuDiscountInvalid: 'Discount must be zero or greater and must not exceed price.',
    adminMenuImageInvalidType: 'Unsupported image type. Use JPEG, PNG, or WebP.',
    adminMenuImageInvalidSize: 'Image exceeds the 5MB limit.',
    adminMenuImageInvalidEmpty: 'The selected file is empty.',
    adminMenuImageHelp: 'JPEG, PNG, or WebP up to 5MB. Upload happens on save only.',
    adminMenuImagePreviewAlt: 'Menu item image preview',
    adminMenuImageFallbackAlt: 'No image',
    adminMenuErrorForbidden: 'You do not have permission to perform this action.',
    adminMenuErrorNotFound: 'The item is no longer available. The list was refreshed.',
    adminMenuErrorConflict: 'A data conflict occurred. Review the values and try again.',
    adminMenuErrorTooManyRequests: 'Too many attempts. Please try again later.',
    adminMenuErrorGeneric: 'Something went wrong. Please try again.',
    adminMenuErrorValidation: 'Check the required fields and try again.',
    adminMenuToggleAvailable: 'Toggle availability',
    adminMenuToggleAvailableBusy: 'Updating…',
    adminMenuSelectCategory: 'Select a category',
    adminMenuSearchLabel: 'Search meals',
    adminMenuSearchPlaceholder: 'Search for a meal…',
    adminMenuShowingCount: 'Showing {shown} of {total}',
    adminMenuEmptyFiltered: 'No meals match the current search or selected category.',
    adminMenuAddNewMealTitle: 'Add new meal',
    adminMenuAddNewMealDescription: 'Create a new dish and add its image and details.',
    adminMenuAvailableNow: 'Available now',
    adminMenuAddCategoryAria: 'Add category',
    publicCartTitle: 'Your cart',
    publicCartEmpty: 'Your cart is empty. Add dishes from the menu.',
    publicCartRemove: 'Remove',
    publicCartClear: 'Clear cart',
    publicCartClearConfirm: 'Clear all items from your cart?',
    publicCartQuantity: 'Quantity',
    publicCartItemNotes: 'Item notes',
    publicCartContinueCheckout: 'Continue to checkout',
    publicCartClose: 'Close',
    publicCartOpenAria: 'Open cart',
    publicCartCloseAria: 'Close dialog',
    publicCartSubtotal: 'Subtotal',
    publicCheckoutTitle: 'Checkout',
    publicCheckoutPickup: 'Pickup',
    publicCheckoutDelivery: 'Delivery',
    publicCheckoutGuestName: 'Your name',
    publicCheckoutGuestPhone: 'Phone number',
    publicCheckoutDeliveryAddress: 'Delivery address',
    publicCheckoutOrderNotes: 'Order notes (optional)',
    publicCheckoutEstimatedTax: 'Estimated tax',
    publicCheckoutDeliveryFee: 'Delivery fee',
    publicCheckoutEstimatedTotal: 'Estimated total',
    publicCheckoutEstimatedDisclaimer:
      'Estimated total — the final amount is confirmed when the order is submitted',
    publicCheckoutMinimumOrder: 'Minimum order amount is not met.',
    publicCheckoutServiceDisabled: 'This service is not available right now.',
    publicCheckoutAllServicesDisabled: 'Ordering is not available for this restaurant.',
    publicCheckoutPreviewMode:
      'Preview mode — use a real restaurant link to place an order',
    publicCheckoutSubmit: 'Place order',
    publicCheckoutSubmitting: 'Placing order…',
    publicCheckoutSuccess: 'Your order was received successfully.',
    publicOrderErrorValidation: 'Check your details and try again.',
    publicOrderErrorNotFound:
      'The restaurant or a menu item is no longer available. Review the menu and your cart.',
    publicOrderErrorConflict: 'Unable to place the order. Check service or minimum amount.',
    publicOrderErrorTooManyRequests: 'Too many requests. Please try again later.',
    publicOrderErrorGeneric: 'Unable to place the order. Please try again.',
    publicOrderErrorReviewCart: 'Review your cart and try again.',
    publicConfirmationTitle: 'Order confirmation',
    publicConfirmationOrderNumber: 'Order number',
    publicConfirmationOrderType: 'Order type',
    publicConfirmationStatus: 'Status',
    publicConfirmationCreatedAt: 'Placed at',
    publicConfirmationItems: 'Items',
    publicConfirmationSubtotal: 'Subtotal',
    publicConfirmationDiscount: 'Discount',
    publicConfirmationTax: 'Tax',
    publicConfirmationDeliveryFee: 'Delivery fee',
    publicConfirmationTotal: 'Total',
    publicConfirmationPickupInstructions:
      'Your order will be prepared for pickup.',
    publicConfirmationDeliveryInstructions:
      'Your order will be prepared for delivery to the provided address.',
    publicConfirmationClose: 'Close',
    publicConfirmationReturnMenu: 'Back to menu',
    publicConfirmationCloseAria: 'Close order confirmation',
    publicOrderTypePickup: 'Pickup',
    publicOrderTypeDelivery: 'Delivery',
    publicOrderStatusNew: 'New',
    publicStaffLogin: 'Staff login',
    publicConfirmationSuccessTitle: 'Order confirmed',
    languageArabic: 'العربية',
    languageEnglish: 'EN',
  },
};

/** @deprecated Use LocaleService */
export { LocaleService as Locale };

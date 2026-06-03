import type { SupportedLocale } from '../../localization/locale';

/** Placeholder until restaurant name is loaded from the API in a later step. */
export const ADMIN_SHELL_MOCK = {
  systemName: {
    ar: 'إدارة المطعم',
    en: 'Restaurant Admin',
  } as Record<SupportedLocale, string>,
  restaurantName: {
    ar: 'مطعمي',
    en: 'My Restaurant',
  } as Record<SupportedLocale, string>,
};

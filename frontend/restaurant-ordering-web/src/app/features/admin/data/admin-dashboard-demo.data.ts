export const ADMIN_DASHBOARD_DEMO_STATS = {
  menuItems: 24,
  orders: 8,
  staff: 3,
} as const;

export type AdminDashboardDemoStatId = keyof typeof ADMIN_DASHBOARD_DEMO_STATS;

export const ADMIN_DASHBOARD_DEMO_STAT_ORDER: readonly AdminDashboardDemoStatId[] = [
  'menuItems',
  'orders',
  'staff',
];

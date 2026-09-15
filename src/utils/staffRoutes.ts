import type { UserRole } from '../types';

export type DashboardRole = 'office' | 'manager' | 'admin';

export type StaffCapability =
  | 'create_booking'
  | 'create_customer'
  | 'receive_payment'
  | 'edit_booking'
  | 'manage_event_day'
  | 'approve_requests'
  | 'manage_expenses'
  | 'view_reports'
  | 'manage_users'
  | 'manage_settings'
  | 'view_audit';

/** Routes mirrored under /manager and /admin for read-only oversight pages. */
export const SHARED_STAFF_SEGMENTS = [
  'bookings',
  'calendar',
  'customers',
  'payments',
] as const;

const DASHBOARD_PREFIX: Record<DashboardRole, string> = {
  office: '/office',
  manager: '/manager',
  admin: '/admin',
};

const CAPABILITIES: Record<UserRole, ReadonlySet<StaffCapability>> = {
  booking_office: new Set([
    'create_booking',
    'create_customer',
    'receive_payment',
    'edit_booking',
    'manage_event_day',
  ]),
  manager: new Set(['approve_requests', 'manage_expenses', 'view_reports']),
  super_admin: new Set([
    'manage_users',
    'manage_settings',
    'view_audit',
    'view_reports',
  ]),
};

export function dashboardPrefix(dashboard: DashboardRole): string {
  return DASHBOARD_PREFIX[dashboard];
}

export function staffPath(dashboard: DashboardRole, segment: string): string {
  const normalized = segment.startsWith('/') ? segment : `/${segment}`;
  return `${dashboardPrefix(dashboard)}${normalized}`;
}

export function hasCapability(role: UserRole, capability: StaffCapability): boolean {
  return CAPABILITIES[role]?.has(capability) ?? false;
}

export function canAccessDashboard(role: UserRole, dashboard: DashboardRole): boolean {
  if (dashboard === 'office') return role === 'booking_office';
  if (dashboard === 'manager') return role === 'manager' || role === 'super_admin';
  return role === 'super_admin';
}

export function dashboardPathForRole(role: UserRole): string {
  if (role === 'super_admin') return '/admin';
  if (role === 'manager') return '/manager';
  return '/office';
}

export function dashboardRoleFromPath(pathname: string): DashboardRole | null {
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/manager')) return 'manager';
  if (pathname.startsWith('/office')) return 'office';
  return null;
}

/** Rewrite stored notification/deep links to the active dashboard prefix. */
export function resolveStaffLink(link: string, dashboard: DashboardRole): string {
  if (link.startsWith('/manager/reports') && dashboard === 'admin') {
    return '/admin/reports';
  }

  if (link.startsWith('/office/')) {
    const suffix = link.slice('/office'.length);
    const rootSegment = suffix.split('/').filter(Boolean)[0];
    if (
      dashboard !== 'office' &&
      SHARED_STAFF_SEGMENTS.includes(rootSegment as (typeof SHARED_STAFF_SEGMENTS)[number])
    ) {
      return staffPath(dashboard, suffix);
    }
  }

  return link;
}

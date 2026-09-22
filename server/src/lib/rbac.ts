export type UserRole = 'booking_office' | 'inventory_staff' | 'manager' | 'super_admin';

export type DashboardKind = 'office' | 'inventory' | 'manager' | 'admin';

const ROLE_RANK: Record<UserRole, number> = {
  booking_office: 1,
  inventory_staff: 1,
  manager: 2,
  super_admin: 3,
};

export function isUserRole(value: string): value is UserRole {
  return (
    value === 'booking_office' ||
    value === 'inventory_staff' ||
    value === 'manager' ||
    value === 'super_admin'
  );
}

export function hasMinRole(userRole: UserRole, required: UserRole): boolean {
  return ROLE_RANK[userRole] >= ROLE_RANK[required];
}

export function canAccessDashboard(userRole: UserRole, dashboard: DashboardKind): boolean {
  if (dashboard === 'office') return userRole === 'booking_office';
  if (dashboard === 'inventory') return userRole === 'inventory_staff';
  if (dashboard === 'manager') return userRole === 'manager' || userRole === 'super_admin';
  return userRole === 'super_admin';
}

export function isStaffRole(role: UserRole): boolean {
  return role === 'booking_office' || role === 'inventory_staff' || role === 'manager' || role === 'super_admin';
}

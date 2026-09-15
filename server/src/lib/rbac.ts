export type UserRole = 'booking_office' | 'manager' | 'super_admin';

const ROLE_RANK: Record<UserRole, number> = {
  booking_office: 1,
  manager: 2,
  super_admin: 3,
};

export function isUserRole(value: string): value is UserRole {
  return value === 'booking_office' || value === 'manager' || value === 'super_admin';
}

export function hasMinRole(userRole: UserRole, required: UserRole): boolean {
  return ROLE_RANK[userRole] >= ROLE_RANK[required];
}

export function canAccessDashboard(userRole: UserRole, dashboard: 'office' | 'manager' | 'admin'): boolean {
  if (dashboard === 'office') return userRole === 'booking_office';
  if (dashboard === 'manager') return userRole === 'manager' || userRole === 'super_admin';
  return userRole === 'super_admin';
}

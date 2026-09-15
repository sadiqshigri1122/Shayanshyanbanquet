import { describe, expect, it } from 'vitest';
import {
  canAccessDashboard,
  dashboardPathForRole,
  hasCapability,
  resolveStaffLink,
  staffPath,
} from './staffRoutes';

describe('staffRoutes', () => {
  it('scopes dashboards by role per product requirements', () => {
    expect(canAccessDashboard('booking_office', 'office')).toBe(true);
    expect(canAccessDashboard('booking_office', 'manager')).toBe(false);
    expect(canAccessDashboard('booking_office', 'admin')).toBe(false);

    expect(canAccessDashboard('manager', 'office')).toBe(false);
    expect(canAccessDashboard('manager', 'manager')).toBe(true);
    expect(canAccessDashboard('manager', 'admin')).toBe(false);

    expect(canAccessDashboard('super_admin', 'office')).toBe(false);
    expect(canAccessDashboard('super_admin', 'manager')).toBe(true);
    expect(canAccessDashboard('super_admin', 'admin')).toBe(true);
  });

  it('maps default home paths', () => {
    expect(dashboardPathForRole('booking_office')).toBe('/office');
    expect(dashboardPathForRole('manager')).toBe('/manager');
    expect(dashboardPathForRole('super_admin')).toBe('/admin');
  });

  it('builds role-scoped staff paths', () => {
    expect(staffPath('manager', '/bookings')).toBe('/manager/bookings');
    expect(staffPath('admin', '/reports')).toBe('/admin/reports');
  });

  it('rewrites cross-dashboard links to the active layout', () => {
    expect(resolveStaffLink('/office/bookings', 'manager')).toBe('/manager/bookings');
    expect(resolveStaffLink('/office/customers', 'manager')).toBe('/manager/customers');
    expect(resolveStaffLink('/manager/reports', 'admin')).toBe('/admin/reports');
    expect(resolveStaffLink('/manager/approvals', 'manager')).toBe('/manager/approvals');
    expect(resolveStaffLink('/office/event-day', 'manager')).toBe('/office/event-day');
  });

  it('limits write capabilities to booking office', () => {
    expect(hasCapability('booking_office', 'create_booking')).toBe(true);
    expect(hasCapability('manager', 'create_booking')).toBe(false);
    expect(hasCapability('manager', 'view_reports')).toBe(true);
    expect(hasCapability('super_admin', 'manage_users')).toBe(true);
    expect(hasCapability('super_admin', 'create_customer')).toBe(false);
  });
});

import type { User, UserRole } from '../types';
import {
  canAccessDashboard,
  dashboardPathForRole,
  type DashboardRole,
} from './staffRoutes';

export const DEMO_PASSWORD = 'shayan123';
const AUTH_STORAGE_KEY = 'shayan-auth';

export interface StoredAuth {
  userId: string;
  email: string;
  token?: string;
}

export function roleCanAccessDashboard(role: UserRole, dashboard: DashboardRole): boolean {
  return canAccessDashboard(role, dashboard);
}

export { dashboardPathForRole };

export function loadStoredAuth(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredAuth;
  } catch {
    return null;
  }
}

export function saveStoredAuth(auth: StoredAuth): void {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
}

export function clearStoredAuth(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function authenticateUser(
  users: User[],
  email: string,
  password: string,
): { ok: true; user: User } | { ok: false; error: string } {
  const normalizedEmail = email.trim().toLowerCase();
  const user = users.find((u) => u.email.toLowerCase() === normalizedEmail);

  if (!user) {
    return { ok: false, error: 'No account found with that email address.' };
  }

  if (!user.isActive) {
    return { ok: false, error: 'This account has been deactivated. Contact your administrator.' };
  }

  if (password !== DEMO_PASSWORD) {
    return { ok: false, error: 'Incorrect password. Please try again.' };
  }

  return { ok: true, user };
}

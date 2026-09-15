import { randomBytes } from 'crypto';
import { prisma } from '../lib/prisma.js';
import { isUserRole, type UserRole } from '../lib/rbac.js';
import { ApiError } from './bookingService.js';

const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? 'shayan123';
const SESSION_TTL_MS = Number(process.env.SESSION_TTL_MS ?? 8 * 60 * 60 * 1000);
const REMEMBER_TTL_MS = Number(process.env.REMEMBER_TTL_MS ?? 30 * 24 * 60 * 60 * 1000);

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface SessionRecord {
  user: SessionUser;
  expiresAt: number;
}

const sessions = new Map<string, SessionRecord>();

function purgeExpiredSessions(): void {
  const now = Date.now();
  for (const [token, session] of sessions) {
    if (session.expiresAt <= now) sessions.delete(token);
  }
}

export function createSession(user: SessionUser, remember = false): string {
  purgeExpiredSessions();
  const token = randomBytes(32).toString('hex');
  const ttl = remember ? REMEMBER_TTL_MS : SESSION_TTL_MS;
  sessions.set(token, { user, expiresAt: Date.now() + ttl });
  return token;
}

export function getSession(token: string | undefined): SessionUser | null {
  if (!token) return null;
  purgeExpiredSessions();
  const session = sessions.get(token);
  if (!session || session.expiresAt <= Date.now()) {
    sessions.delete(token);
    return null;
  }
  return session.user;
}

export function destroySession(token: string | undefined): void {
  if (token) sessions.delete(token);
}

export async function login(
  email: string,
  password: string,
  remember = false,
): Promise<{ token: string; user: SessionUser }> {
  const normalizedEmail = email.trim().toLowerCase();
  const row = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (!row) throw new ApiError('No account found with that email address.', 401);
  if (!row.isActive) throw new ApiError('This account has been deactivated. Contact your administrator.', 403);
  if (password !== DEMO_PASSWORD) throw new ApiError('Incorrect password. Please try again.', 401);
  if (!isUserRole(row.role)) throw new ApiError('Invalid user role configuration.', 500);

  const user: SessionUser = {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
  };

  return { token: createSession(user, remember), user };
}

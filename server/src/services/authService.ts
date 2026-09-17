import { randomBytes } from 'crypto';
import { prisma } from '../lib/prisma.js';
import { verifyPassword } from '../lib/password.js';
import { isUserRole, type UserRole } from '../lib/rbac.js';
import { ApiError } from './bookingService.js';
const SESSION_TTL_MS = Number(process.env.SESSION_TTL_MS ?? 8 * 60 * 60 * 1000);
const REMEMBER_TTL_MS = Number(process.env.REMEMBER_TTL_MS ?? 30 * 24 * 60 * 60 * 1000);

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

function sessionUserFromRow(row: {
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
}): SessionUser | null {
  if (!isUserRole(row.userRole)) return null;
  return {
    id: row.userId,
    name: row.userName,
    email: row.userEmail,
    role: row.userRole,
  };
}

export async function purgeExpiredSessions(): Promise<void> {
  await prisma.authSession.deleteMany({
    where: { expiresAt: { lte: new Date() } },
  });
}

export async function createSession(user: SessionUser, remember = false): Promise<string> {
  const token = randomBytes(32).toString('hex');
  const ttl = remember ? REMEMBER_TTL_MS : SESSION_TTL_MS;
  await prisma.authSession.create({
    data: {
      token,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      userRole: user.role,
      expiresAt: new Date(Date.now() + ttl),
    },
  });
  return token;
}

export async function getSession(token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null;

  const row = await prisma.authSession.findUnique({ where: { token } });
  if (!row) return null;

  if (row.expiresAt <= new Date()) {
    await prisma.authSession.delete({ where: { token } }).catch(() => undefined);
    return null;
  }

  return sessionUserFromRow(row);
}

export async function destroySession(token: string | undefined): Promise<void> {
  if (!token) return;
  await prisma.authSession.deleteMany({ where: { token } });
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
  if (!row.passwordHash) {
    throw new ApiError('Account password not configured. Contact your administrator.', 403);
  }

  const valid = await verifyPassword(password, row.passwordHash);
  if (!valid) throw new ApiError('Incorrect password. Please try again.', 401);
  if (!isUserRole(row.role)) throw new ApiError('Invalid user role configuration.', 500);

  const user: SessionUser = {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
  };

  return { token: await createSession(user, remember), user };
}

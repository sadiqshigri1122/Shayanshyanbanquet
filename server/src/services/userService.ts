import { prisma } from '../lib/prisma.js';
import { mapUser } from '../lib/mappers.js';
import { assertPasswordStrength, hashPassword, verifyPassword } from '../lib/password.js';
import { isUserRole, type UserRole } from '../lib/rbac.js';
import { ApiError } from './bookingService.js';

export async function backfillMissingPasswordHashes(): Promise<number> {
  const users = await prisma.user.findMany({ where: { passwordHash: null }, select: { id: true } });
  if (!users.length) return 0;

  const defaultPassword = process.env.DEMO_PASSWORD ?? 'shayan123';
  const passwordHash = await hashPassword(defaultPassword);
  await prisma.user.updateMany({ where: { passwordHash: null }, data: { passwordHash } });
  return users.length;
}

function validatePassword(newPassword: string): void {
  try {
    assertPasswordStrength(newPassword);
  } catch (err) {
    throw new ApiError(err instanceof Error ? err.message : 'Invalid password.', 400);
  }
}

function parseRole(role: string): UserRole {
  if (!isUserRole(role)) throw new ApiError('Invalid role.', 400);
  return role;
}

async function getUserOrThrow(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError('User not found.', 404);
  return user;
}

async function assertCanRemoveAdmin(userId: string): Promise<void> {
  const user = await getUserOrThrow(userId);
  if (user.role !== 'super_admin') return;

  const activeAdmins = await prisma.user.count({
    where: { role: 'super_admin', isActive: true, NOT: { id: userId } },
  });
  if (activeAdmins === 0) {
    throw new ApiError('Cannot remove or deactivate the last active administrator.', 400);
  }
}

export async function createUser(input: {
  name: string;
  email: string;
  role: string;
  phone?: string;
  password: string;
  isActive?: boolean;
}) {
  validatePassword(input.password);
  const role = parseRole(input.role);
  const email = input.email.trim().toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new ApiError('A user with this email already exists.', 409);

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      id: `u${Date.now()}`,
      name: input.name.trim(),
      email,
      role,
      phone: input.phone?.trim() || null,
      passwordHash,
      isActive: input.isActive ?? true,
      createdAt: new Date().toISOString().split('T')[0],
    },
  });

  return mapUser(user);
}

export async function updateUser(
  userId: string,
  input: {
    name?: string;
    email?: string;
    role?: string;
    phone?: string | null;
    isActive?: boolean;
  },
  actorUserId: string,
) {
  const user = await getUserOrThrow(userId);
  const data: {
    name?: string;
    email?: string;
    role?: string;
    phone?: string | null;
    isActive?: boolean;
  } = {};

  if (input.name !== undefined) data.name = input.name.trim();
  if (input.phone !== undefined) data.phone = input.phone?.trim() || null;
  if (input.isActive !== undefined) data.isActive = input.isActive;

  if (input.email !== undefined) {
    const email = input.email.trim().toLowerCase();
    const existing = await prisma.user.findFirst({ where: { email, NOT: { id: userId } } });
    if (existing) throw new ApiError('A user with this email already exists.', 409);
    data.email = email;
  }

  if (input.role !== undefined) {
    const role = parseRole(input.role);
    if (user.role === 'super_admin' && role !== 'super_admin') {
      await assertCanRemoveAdmin(userId);
    }
    data.role = role;
  }

  if (input.isActive === false && userId === actorUserId) {
    throw new ApiError('You cannot deactivate your own account.', 400);
  }

  if (input.isActive === false && user.role === 'super_admin') {
    await assertCanRemoveAdmin(userId);
  }

  const updated = await prisma.user.update({ where: { id: userId }, data });

  if (input.isActive === false || input.role !== undefined) {
    await prisma.authSession.deleteMany({ where: { userId } });
  }

  return mapUser(updated);
}

export async function deleteUser(userId: string, actorUserId: string): Promise<void> {
  if (userId === actorUserId) {
    throw new ApiError('You cannot delete your own account.', 400);
  }

  await assertCanRemoveAdmin(userId);
  await prisma.authSession.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } });
}

export async function setUserPassword(userId: string, newPassword: string): Promise<void> {
  validatePassword(newPassword);
  await getUserOrThrow(userId);

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  await prisma.authSession.deleteMany({ where: { userId } });
}

export async function changeOwnPassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  validatePassword(newPassword);

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, passwordHash: true } });
  if (!user?.passwordHash) {
    throw new ApiError('Account password not configured. Contact your administrator.', 403);
  }

  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) throw new ApiError('Current password is incorrect.', 401);

  await setUserPassword(userId, newPassword);
}

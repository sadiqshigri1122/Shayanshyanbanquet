import { prisma } from '../lib/prisma.js';
import { assertPasswordStrength, hashPassword, verifyPassword } from '../lib/password.js';
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

export async function setUserPassword(userId: string, newPassword: string): Promise<void> {
  validatePassword(newPassword);

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) throw new ApiError('User not found.', 404);

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

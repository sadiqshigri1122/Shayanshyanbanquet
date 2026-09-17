import type { Request, Response, NextFunction } from 'express';
import { hasMinRole, type UserRole } from '../lib/rbac.js';
import { getSession, type SessionUser } from '../services/authService.js';
declare global {
  namespace Express {
    interface Request {
      user?: SessionUser;
    }
  }
}

function extractToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7).trim();
  const cookie = req.headers.cookie;
  if (cookie) {
    const match = cookie.match(/(?:^|;\s*)shayan_token=([^;]+)/);
    if (match) return decodeURIComponent(match[1]);
  }
  return undefined;
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    req.user = (await getSession(extractToken(req))) ?? undefined;
    next();
  } catch (err) {
    next(err);
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await getSession(extractToken(req));
    if (!user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(...allowed: UserRole[]) {
  const minRequired = allowed.reduce<UserRole>((min, role) => {
    const order = ['booking_office', 'manager', 'super_admin'] as const;
    return order.indexOf(role) < order.indexOf(min) ? role : min;
  }, allowed[0]);

  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    if (!hasMinRole(req.user.role, minRequired)) {
      res.status(403).json({ error: 'You do not have permission to perform this action.' });
      return;
    }
    next();
  };
}

/** Restrict to booking office staff only — managers/admins may read but not mutate operational records. */
export function requireOfficeRole() {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    if (req.user.role !== 'booking_office') {
      res.status(403).json({ error: 'This action is limited to booking office staff.' });
      return;
    }
    next();
  };
}

export function actorName(req: Request, fallback = 'System'): string {
  return req.user?.name ?? fallback;
}

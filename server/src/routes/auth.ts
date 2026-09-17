import { Router } from 'express';
import { z } from 'zod';
import { rateLimit } from '../middleware/rateLimit.js';
import { requireAuth } from '../middleware/auth.js';
import { destroySession, login } from '../services/authService.js';
import { ApiError } from '../services/bookingService.js';

export const authRouter = Router();

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 15, keyPrefix: 'login' });

function extractToken(req: import('express').Request): string | undefined {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7).trim();
  return undefined;
}

function handle(handler: (req: import('express').Request) => Promise<unknown>) {
  return async (req: import('express').Request, res: import('express').Response) => {
    try {
      const result = await handler(req);
      res.json(result);
    } catch (err) {
      if (err instanceof ApiError) {
        res.status(err.status).json({ error: err.message });
        return;
      }
      if (err instanceof z.ZodError) {
        res.status(400).json({ error: err.issues[0]?.message ?? 'Invalid request data' });
        return;
      }
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

authRouter.post(
  '/login',
  loginLimiter,
  handle(async (req) => {
    const body = z
      .object({
        email: z.string().email(),
        password: z.string().min(1),
        remember: z.boolean().optional(),
      })
      .parse(req.body);
    return login(body.email, body.password, body.remember ?? false);
  }),
);

authRouter.post(
  '/logout',
  handle(async (req) => {
    await destroySession(extractToken(req));
    return { ok: true };
  }),
);

authRouter.get(
  '/me',
  requireAuth,
  handle(async (req) => ({ user: req.user })),
);

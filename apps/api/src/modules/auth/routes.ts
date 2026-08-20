import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { db } from '@bakery/database';
import { user, session } from '@bakery/database/schema';
import { loginSchema, type AuthUserDto } from '@bakery/shared-schemas';
import { env } from '../../config/env';
import {
  AUTH_COOKIE,
  randomToken,
  hashToken,
  setAuthCookies,
  clearAuthCookies,
  signAuthToken,
} from '../../lib/auth';
import { invalidCredentials, unimplemented } from '../../lib/errors';
import { zParseJson } from '../../lib/validate';
import { authenticate, type AppEnv } from '../../middleware/auth';
import { rateLimit } from '../../middleware/rate-limit';
import { getCookie } from 'hono/cookie';

// Modul auth: login (rate-limit ketat), logout, dan identitas user saat ini.

export const authRoutes = new Hono<AppEnv>();

function serializeUser(u: {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'staff';
  isActive: boolean;
  createdAt: Date;
}): AuthUserDto {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    isActive: u.isActive,
    createdAt: u.createdAt.toISOString(),
  };
}

authRoutes.post(
  '/login',
  rateLimit({ max: env.AUTH_RATE_LIMIT_MAX, windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS }),
  async (c) => {
    const { email, password } = await zParseJson(c.req.raw, loginSchema);
    const rows = await db
      .select()
      .from(user)
      .where(eq(user.email, email))
      .limit(1);
    const found = rows[0];
    if (!found) throw invalidCredentials();

    const ok = await bcrypt.compare(password, found.passwordHash);
    if (!ok) throw invalidCredentials();

    const token = await signAuthToken({ sub: found.id, email: found.email, role: found.role });
    const csrfToken = randomToken();
    await db.insert(session).values({
      userId: found.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + env.JWT_EXPIRES_IN_DAYS * 86_400_000),
    });
    setAuthCookies(c, token, csrfToken);

    return c.json({ user: serializeUser(found), csrfToken });
  },
);

authRoutes.post('/logout', async (c) => {
  // Revoke sesi di server (token mentah tidak disimpan - hanya hashnya).
  const token = getCookie(c, AUTH_COOKIE);
  if (token) {
    await db
      .update(session)
      .set({ revokedAt: new Date() })
      .where(eq(session.tokenHash, hashToken(token)));
  }
  clearAuthCookies(c);
  return c.json({ ok: true });
});

authRoutes.get('/me', authenticate, (c) => c.json({ user: c.get('account') }));

// Change-password disediakan sebagai stub untuk saat ini
authRoutes.post('/change-password', authenticate, (c) =>
  unimplemented('change-password belum diimplementasikan'),
);
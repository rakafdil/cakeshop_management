import type { MiddlewareHandler } from 'hono';
import { getCookie } from 'hono/cookie';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { db } from '@bakery/database';
import { user, session } from '@bakery/database/schema';
import { AUTH_COOKIE, hashToken, verifyAuthToken, type JwtPayload } from '../lib/auth';
import { ApiError, forbidden, unauthorized } from '../lib/errors';

export type UserRole = 'admin' | 'staff';

export type AppEnv = {
  Variables: {
    /** payload JWT hasil verifikasi */
    user: JwtPayload;
    /** akun segar dari DB (status aktif dicek ulang) */
    account: {
      id: string;
      name: string;
      email: string;
      role: UserRole;
      isActive: boolean;
    };
  };
};

/**
 * Verifikasi JWT dari httpOnly cookie lalu memuat akun via sesi aktif dari DB.
 *
 * Sesi menjadi sumber kebenaran: token yang sudah di-revoke saat logout otomatis
 * ditolak (server-side revocation). Status `is_active` dibaca ulang agar
 * penonaktifan admin langsung berlaku.
 */
export const authenticate: MiddlewareHandler<AppEnv> = async (c, next) => {
  const token = getCookie(c, AUTH_COOKIE);
  if (!token) throw unauthorized();

  let payload: JwtPayload;
  try {
    payload = await verifyAuthToken(token);
  } catch {
    throw unauthorized('Sesi tidak valid atau kedaluwarsa');
  }

  const rows = await db
    .select({
      sessionId: session.id,
      userId: session.userId,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    })
    .from(session)
    .innerJoin(user, eq(session.userId, user.id))
    .where(
      and(
        eq(session.tokenHash, hashToken(token)),
        isNull(session.revokedAt),
        gt(session.expiresAt, new Date()),
      ),
    )
    .limit(1);

  const account = rows[0];
  if (!account) throw unauthorized('Sesi tidak valid atau kedaluwarsa');
  if (!account.isActive) {
    throw new ApiError(403, 'INACTIVE_ACCOUNT', 'Akun dinonaktifkan - hubungi admin');
  }

  // Sentuh aktivitas terakhir (fondasi session timeout karena inaktivitas - NFR-SEC-04).
  await db
    .update(session)
    .set({ lastActivityAt: new Date() })
    .where(eq(session.id, account.sessionId));

  c.set('user', payload);
  c.set('account', {
    id: account.userId,
    name: account.name,
    email: account.email,
    role: account.role,
    isActive: account.isActive,
  });
  await next();
};

/** Batasi akses ke role tertentu. Harus dijalankan setelah `authenticate`. */
export function requireRole(...roles: UserRole[]): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    await authenticate(c, () => Promise.resolve());
    const account = c.get('account');
    if (!roles.includes(account.role)) throw forbidden();
    await next();
  };
}
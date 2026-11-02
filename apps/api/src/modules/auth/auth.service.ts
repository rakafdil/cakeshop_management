import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { db } from '@bakery/database';
import { user, session } from '@bakery/database/schema';
import type { AuthUserDto } from '@bakery/shared-schemas';
import { env } from '../../config/env';
import { randomToken, hashToken, signAuthToken } from '../../lib/auth';
import { invalidCredentials } from '../../lib/errors';

export function serializeUser(u: {
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

export async function loginService({ email, password }: { email: string; password: string }) {
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

  return { token, csrfToken, user: serializeUser(found) };
}

export async function logoutService(token: string) {
  await db
    .update(session)
    .set({ revokedAt: new Date() })
    .where(eq(session.tokenHash, hashToken(token)));
}

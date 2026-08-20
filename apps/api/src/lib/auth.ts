import { randomBytes, createHash } from 'node:crypto';
import type { Context } from 'hono';
import { setCookie, deleteCookie } from 'hono/cookie';
import { sign, verify } from 'hono/jwt';
import { env } from '../config/env';
import type { AppEnv } from '../middleware/auth';

// Nama cookie
export const AUTH_COOKIE = 'ck_token';
export const CSRF_COOKIE = 'ck_csrf';

export type JwtPayload = {
  sub: string; // user id
  email: string;
  role: 'admin' | 'staff';
  jti: string; // nonce unik per sesi (mencegah token identik & dipakai sbg id sesi)
  iat: number;
  exp: number;
};

export function randomToken(bytes = 24): string {
  return randomBytes(bytes).toString('hex');
}

/** Hash token sesi (SHA-256) - token mentah tidak pernah disimpan di DB. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function signAuthToken(payload: {
  sub: string;
  email: string;
  role: 'admin' | 'staff';
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return sign(
    {
      ...payload,
      jti: randomToken(16),
      iat: now,
      exp: now + env.JWT_EXPIRES_IN_DAYS * 86_400,
    },
    env.JWT_SECRET,
    'HS256',
  );
}

export function verifyAuthToken(token: string): Promise<JwtPayload> {
  return verify(token, env.JWT_SECRET, 'HS256') as unknown as Promise<JwtPayload>;
}

/**
 * Set kedua cookie sesi:
 * - AUTH_COOKIE  (httpOnly)  → JWT, tidak bisa dibaca JS
 * - CSRF_COOKIE  (non-httpOnly) → token double-submit, dibaca JS & di-echo ke header
 */
export function setAuthCookies(c: Context<AppEnv>, token: string, csrfToken: string): void {
  const base = {
    path: '/',
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: 'Lax' as const,
    maxAge: env.JWT_EXPIRES_IN_DAYS * 86_400,
  };
  setCookie(c, AUTH_COOKIE, token, base);
  setCookie(c, CSRF_COOKIE, csrfToken, { ...base, httpOnly: false });
}

export function clearAuthCookies(c: Context<AppEnv>): void {
  deleteCookie(c, AUTH_COOKIE, { path: '/' });
  deleteCookie(c, CSRF_COOKIE, { path: '/' });
}
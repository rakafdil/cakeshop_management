import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { loginSchema } from '@bakery/shared-schemas';
import { env } from '../../config/env';
import { AUTH_COOKIE, setAuthCookies, clearAuthCookies } from '../../lib/auth';
import { unimplemented } from '../../lib/errors';
import { authenticate, type AppEnv } from '../../middleware/auth';
import { rateLimit } from '../../middleware/rate-limit';
import { getCookie } from 'hono/cookie';
import { loginService, logoutService } from './services';

// Modul auth: login (rate-limit ketat), logout, dan identitas user saat ini.

export const authRoutes = new OpenAPIHono<AppEnv>();

authRoutes.use(
  '/login',
  rateLimit({ max: env.AUTH_RATE_LIMIT_MAX, windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS })
);

const loginRoute = createRoute({
  method: 'post',
  path: '/login',
  tags: ['auth'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: loginSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Login successful',
      content: {
        'application/json': {
          schema: z.any(),
        },
      },
    },
  },
});

authRoutes.openapi(loginRoute, async (c) => {
  const { email, password } = c.req.valid('json');
  const { token, csrfToken, user } = await loginService({ email, password });
  
  setAuthCookies(c, token, csrfToken);

  return c.json({ user, csrfToken });
});

const logoutRoute = createRoute({
  method: 'post',
  path: '/logout',
  tags: ['auth'],
  responses: {
    200: {
      description: 'Logout successful',
      content: {
        'application/json': {
          schema: z.object({ ok: z.boolean() }),
        },
      },
    },
  },
});

authRoutes.openapi(logoutRoute, async (c) => {
  const token = getCookie(c, AUTH_COOKIE);
  if (token) {
    await logoutService(token);
  }
  clearAuthCookies(c);
  return c.json({ ok: true });
});

authRoutes.use('/me', authenticate);
authRoutes.use('/change-password', authenticate);

const meRoute = createRoute({
  method: 'get',
  path: '/me',
  tags: ['auth'],
  responses: {
    200: {
      description: 'Current user',
      content: {
        'application/json': {
          schema: z.any(),
        },
      },
    },
  },
});

authRoutes.openapi(meRoute, (c) => c.json({ user: c.get('account') }));

const changePasswordRoute = createRoute({
  method: 'post',
  path: '/change-password',
  tags: ['auth'],
  responses: {
    200: { description: 'Password changed' },
  },
});

authRoutes.openapi(changePasswordRoute, (c) =>
  unimplemented('change-password belum diimplementasikan'),
);
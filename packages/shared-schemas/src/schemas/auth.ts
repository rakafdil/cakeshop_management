import { z } from 'zod';

// Authentication contract: login payload and the public user shape returned by the API.

export const loginSchema = z.object({
  email: z.string().trim().email('Email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
});

export type LoginDto = z.infer<typeof loginSchema>;

export const authUserSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  role: z.enum(['admin', 'staff']),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
});

export type AuthUserDto = z.infer<typeof authUserSchema>;

export const loginResponseSchema = z.object({
  user: authUserSchema,
});

export type LoginResponseDto = z.infer<typeof loginResponseSchema>;

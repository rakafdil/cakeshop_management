import { z } from 'zod';

// Reusable low-level primitives + pagination contract shared by every list endpoint.

export const uuidSchema = z.uuid();

export const idParamSchema = z.object({
  id: z.uuid('id harus berupa UUID yang valid'),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().optional(),
});

export type Pagination = z.infer<typeof paginationSchema>;

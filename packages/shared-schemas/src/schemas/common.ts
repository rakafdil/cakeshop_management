import { z } from "zod";

// Reusable low-level primitives + pagination contract shared by every list endpoint.

export const uuidSchema = z.uuid();

export const idParamSchema = z.object({
  id: z.uuid("id harus berupa UUID yang valid"),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().optional(),
});

export type Pagination = z.infer<typeof paginationSchema>;

// UUID dengan pesan error berlabel, mis. uuidField('Product ID').
export const uuidField = (label: string) =>
  z.uuid(`${label} harus berupa UUID yang valid`);

// Decimal PostgreSQL (uang, quantity) selalu string untuk menjaga presisi,
// mis. "12500" atau "12500.50" (api-mapping.md, aturan lintas resource no. 3).
export const decimalString = (label: string) =>
  z
    .string()
    .trim()
    .regex(/^\d+(\.\d+)?$/, `${label} harus berupa angka desimal non-negatif`);

export const positiveDecimalString = (label: string) =>
  decimalString(label).refine(
    (v) => Number(v) > 0,
    `${label} harus lebih dari 0`,
  );

// Tanggal tanpa waktu, format YYYY-MM-DD.
export const dateOnlySchema = (label: string) =>
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, `Format ${label} harus YYYY-MM-DD`);

// Meta pagination di response: query memakai `pageSize`, response memakai `limit`.
export const paginationMetaSchema = z.object({
  page: z.number().int(),
  limit: z.number().int(),
  total: z.number().int(),
});

export type PaginationMeta = z.infer<typeof paginationMetaSchema>;

// Envelope response: { data } untuk detail/create/update, { data[], pagination } untuk list.
export const itemResponse = <T extends z.ZodType>(schema: T) =>
  z.object({ data: schema });

export const listResponse = <T extends z.ZodType>(schema: T) =>
  z.object({ data: z.array(schema), pagination: paginationMetaSchema });

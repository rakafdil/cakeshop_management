import type { ZodType } from 'zod';
import { ApiError } from './errors';

// Parse & validasi payload — pengganti validation pipe di framework lain.
// Melempar 400 terstruktur saat data tidak sesuai schema.

export function zParse<T>(schema: ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'Validasi gagal',
      result.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      })),
    );
  }
  return result.data;
}

export async function zParseJson<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ApiError(400, 'INVALID_JSON', 'Body harus berupa JSON valid');
  }
  return zParse(schema, body);
}
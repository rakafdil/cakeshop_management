import type { ApiErrorCode } from '@bakery/shared-schemas';

// Error terstruktur — diserialisasi oleh errorHandler menjadi { error: { code, message, details } }.

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ApiErrorCode,
    message?: string,
    public readonly details?: unknown,
  ) {
    super(message ?? code);
    this.name = 'ApiError';
  }
}

export const badRequest = (msg = 'Permintaan tidak valid') =>
  new ApiError(400, 'VALIDATION_ERROR', msg);

export const unauthorized = (msg = 'Silakan login terlebih dahulu') =>
  new ApiError(401, 'UNAUTHORIZED', msg);

export const invalidCredentials = (msg = 'Email atau password salah') =>
  new ApiError(401, 'INVALID_CREDENTIALS', msg);

export const forbidden = (msg = 'Anda tidak memiliki akses') =>
  new ApiError(403, 'FORBIDDEN', msg);

export const notFound = (msg = 'Data tidak ditemukan') =>
  new ApiError(404, 'NOT_FOUND', msg);

export const conflict = (msg = 'Data sudah ada') =>
  new ApiError(409, 'CONFLICT', msg);

export const notImplemented = (msg = 'Endpoint belum diimplementasikan') =>
  new ApiError(501, 'NOT_IMPLEMENTED', msg);

/** Sama seperti notImplemented, tapi langsung melempar — cocok untuk body handler. */
export const unimplemented = (msg = 'Endpoint belum diimplementasikan'): never => {
  throw notImplemented(msg);
};
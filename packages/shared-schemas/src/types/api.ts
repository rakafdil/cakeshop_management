// Contract types for the bakery API envelope + pagination.

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

/** Canonical error codes returned by the API. */
export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'INVALID_JSON'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'INACTIVE_ACCOUNT'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'CSRF_FAILED'
  | 'INVALID_CREDENTIALS'
  | 'NOT_IMPLEMENTED'
  | 'INTERNAL_ERROR'
  | 'HTTP_ERROR';

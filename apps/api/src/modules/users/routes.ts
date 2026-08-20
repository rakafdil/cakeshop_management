import { crud } from '../../lib/crud';
import { requireRole } from '../../middleware/auth';

// Manajemen user internal (admin & staff). Hanya role admin yang boleh mengubah user lain.

export const usersRoutes = crud('users', requireRole('admin'));
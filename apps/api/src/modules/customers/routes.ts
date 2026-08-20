import { crud } from '../../lib/crud';
import { authenticate } from '../../middleware/auth';

// Data pelanggan (buyer) — dipakai oleh modul order.

export const customersRoutes = crud('customers', authenticate);
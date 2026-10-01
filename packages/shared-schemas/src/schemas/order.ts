import { z } from 'zod';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { customerOrder } from '@bakery/database/schema';

// Order DTOs derived directly from the Drizzle schema (single source of truth).
// Server-managed fields (id, orderNumber, trackingToken, timestamps) are omitted from Create*.

export const CreateOrderSchema = createInsertSchema(customerOrder).omit({
  id: true,
  orderNumber: true,
  trackingToken: true,
  status: true,
  createdAt: true,
  updatedAt: true,
});

export const OrderSchema = createSelectSchema(customerOrder);

export type CreateOrderDto = typeof CreateOrderSchema.type;
export type OrderDto = typeof OrderSchema.type;

// Relaxed UUID regex supporting both RFC 4122 and database-compatible UUIDs
const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

// Domain DTOs for Order Intake & Down Payment
export const decorationTypeEnum = z.enum(['fondant', 'print', 'buttercream', 'painted', 'none']);
export const sizePortionEnum = z.enum(['small', 'medium', 'large']);
export const paymentStatusInputEnum = z.enum(['pending', 'verified', 'rejected']);

export const CreateOrderItemInputSchema = z.object({
  productId: z.string().regex(uuidRegex, 'Product ID harus berupa UUID yang valid'),
  quantity: z.coerce.number().positive('Jumlah item harus lebih dari 0'),
  uomId: z.string().regex(uuidRegex, 'UOM ID harus berupa UUID yang valid'),
  unitPrice: z.coerce.number().nonnegative('Harga satuan tidak boleh negatif'),
  statedBudget: z.coerce.number().nonnegative('Budget tidak boleh negatif').optional().nullable(),
  customization: z.string().trim().optional().nullable(),
  decorationType: decorationTypeEnum.default('none'),
  complexityScore: z.number().int().min(1).max(5).optional().nullable(),
  sizePortion: sizePortionEnum.optional().nullable(),
  tierCount: z.coerce.number().int().min(1, 'Jumlah tingkat minimal 1').default(1),
});

export const CustomerInlineInputSchema = z.object({
  id: z.string().regex(uuidRegex, 'Customer ID harus berupa UUID yang valid').optional(),
  name: z.string().trim().min(1, 'Nama customer wajib diisi'),
  phone: z.string().trim().min(1, 'Nomor telepon customer wajib diisi'),
  email: z.string().email('Format email tidak valid').optional().nullable().or(z.literal('')),
  address: z.string().trim().optional().nullable(),
});

export const CreateOrderWithCustomerInputSchema = z
  .object({
    customerId: z.string().regex(uuidRegex, 'Customer ID harus berupa UUID yang valid').optional(),
    customer: CustomerInlineInputSchema.optional(),
    sourceChannel: z.string().trim().min(1, 'Source channel tidak boleh kosong').default('whatsapp'),
    fulfillmentDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal fulfillment harus YYYY-MM-DD')
      .optional()
      .nullable(),
    fulfillmentTime: z.string().trim().optional().nullable(),
    deliveryAddress: z.string().trim().optional().nullable(),
    items: z.array(CreateOrderItemInputSchema).min(1, 'Minimal 1 item pesanan'),
  })
  .refine(
    (data) => Boolean(data.customerId) || (Boolean(data.customer) && Boolean(data.customer?.name) && Boolean(data.customer?.phone)),
    {
      message: 'Informasi customer (nama dan telepon) atau customerId wajib diisi',
      path: ['customer'],
    }
  );

export const OrderPaymentInputSchema = z.object({
  amount: z.coerce.number().positive('Jumlah pembayaran harus lebih dari 0'),
  paymentMethod: z.string().trim().min(1, 'Metode pembayaran wajib diisi').max(50),
  proofUrl: z.string().trim().optional().nullable(),
  status: paymentStatusInputEnum.default('pending'),
});

export type CreateOrderItemInput = z.infer<typeof CreateOrderItemInputSchema>;
export type CustomerInlineInput = z.infer<typeof CustomerInlineInputSchema>;
export type CreateOrderWithCustomerInput = z.infer<typeof CreateOrderWithCustomerInputSchema>;
export type OrderPaymentInput = z.infer<typeof OrderPaymentInputSchema>;

// Re-export receipt schemas for ergonomic access
export * from './receipt';

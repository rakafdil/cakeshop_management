import { z } from 'zod';

export const OrderReceiptItemSchema = z.object({
  productName: z.string().min(1, 'Nama produk wajib diisi'),
  quantity: z.number().positive('Jumlah produk harus lebih dari 0'),
  unitPrice: z.number().nonnegative('Harga satuan tidak boleh negatif'),
  subtotal: z.number().nonnegative('Subtotal item tidak boleh negatif'),
  details: z.string().optional().nullable(),
});

export const OrderReceiptSchema = z.object({
  storeName: z.string().optional().default('Bakery Delight'),
  storePhone: z.string().optional().nullable(),
  storeAddress: z.string().optional().nullable(),
  orderNumber: z.string().min(1, 'Nomor pesanan wajib diisi'),
  orderDate: z.string().min(1, 'Tanggal pesanan wajib diisi'),
  customerName: z.string().min(1, 'Nama pelanggan wajib diisi'),
  customerPhone: z.string().min(1, 'Nomor telepon pelanggan wajib diisi'),
  deliveryAddress: z.string().optional().nullable(),
  sourceChannel: z.string().min(1, 'Saluran pesanan wajib diisi'),
  fulfillmentDate: z.string().optional().nullable(),
  fulfillmentTime: z.string().optional().nullable(),
  items: z.array(OrderReceiptItemSchema).min(1, 'Minimal 1 item pada nota pesanan'),
  subtotal: z.number().nonnegative('Subtotal tidak boleh negatif'),
  total: z.number().nonnegative('Total tidak boleh negatif'),
  totalPaid: z.number().nonnegative('Total pembayaran tidak boleh negatif').default(0),
  balanceDue: z.number({ message: 'Sisa tagihan wajib diisi' }),
  paymentStatus: z.string().min(1, 'Status pembayaran wajib diisi'),
  trackingUrl: z.string().min(1, 'URL pelacakan wajib diisi'),
});

export type OrderReceiptItem = z.infer<typeof OrderReceiptItemSchema>;
export type OrderReceipt = z.infer<typeof OrderReceiptSchema>;

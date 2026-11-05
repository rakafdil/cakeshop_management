export interface ListOrdersQuery {
  page?: number;
  pageSize?: number;
  status?: string;
  sourceChannel?: string;
  customerId?: string;
}

export interface RecordPaymentInput {
  amount: number;
  paymentMethod: string;
  proofUrl?: string;
  status?: 'pending' | 'verified' | 'rejected';
}

export const VALID_ORDER_STATUSES = [
  'received',
  'confirmed',
  'requires_review',
  'in_production',
  'ready',
  'out_for_delivery',
  'completed',
  'cancelled_no_response',
  'cancelled_other',
] as const;

export type ValidOrderStatus = (typeof VALID_ORDER_STATUSES)[number];

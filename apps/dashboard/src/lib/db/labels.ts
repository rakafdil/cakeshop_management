import type { ContentStatus, DecorationType, FulfillmentType, MarketSegment, OrderStatus, PaymentStatus, ProductionStatus, ProductionType, SizePortion, StockTransactionType } from "./types";

export const orderStatusLabel: Record<OrderStatus, string> = {
  received: "Diterima", confirmed: "Dikonfirmasi", requires_review: "Perlu Review", in_production: "Diproduksi",
  ready: "Siap", out_for_delivery: "Dikirim", completed: "Selesai", cancelled_no_response: "Batal (tak respons)", cancelled_other: "Batal",
};
export const orderStatusTone: Record<OrderStatus, string> = {
  received: "bg-muted text-muted-foreground", confirmed: "bg-secondary text-secondary-foreground",
  requires_review: "bg-destructive/15 text-destructive", in_production: "bg-warning/25 text-foreground",
  ready: "bg-success/15 text-success", out_for_delivery: "bg-accent/15 text-accent", completed: "bg-primary text-primary-foreground",
  cancelled_no_response: "bg-muted text-muted-foreground line-through", cancelled_other: "bg-muted text-muted-foreground line-through",
};
export const productionStatusLabel: Record<ProductionStatus, string> = { planned: "Direncanakan", in_progress: "Berjalan", completed: "Selesai", cancelled: "Batal" };
export const productionStatusTone: Record<ProductionStatus, string> = {
  planned: "bg-muted text-muted-foreground", in_progress: "bg-warning/25 text-foreground", completed: "bg-success/15 text-success", cancelled: "bg-muted text-muted-foreground line-through",
};
export const productionTypeLabel: Record<ProductionType, string> = { batch: "Batch", unit: "Unit/Custom" };
export const fulfillmentLabel: Record<FulfillmentType, string> = { pre_order: "Pre-Order", ready_stock: "Ready Stock", hybrid: "Hybrid" };
export const segmentLabel: Record<MarketSegment, string> = { premium_artisan: "Premium Artisan", everyday_budget: "Everyday" };
export const stockTxLabel: Record<StockTransactionType, string> = { in: "Masuk", out: "Keluar", adjustment: "Penyesuaian", waste: "Terbuang" };
export const paymentStatusLabel: Record<PaymentStatus, string> = { pending: "Menunggu verifikasi", verified: "Terverifikasi", rejected: "Ditolak" };
export const contentStatusLabel: Record<ContentStatus, string> = { planned: "Terjadwal", posted: "Terposting", skipped: "Dilewati" };
export const decorationLabel: Record<DecorationType, string> = { none: "Tanpa", buttercream: "Buttercream", fondant: "Fondant", print: "Print", painted: "Painted" };
export const sizeLabel: Record<SizePortion, string> = { small: "Kecil", medium: "Sedang", large: "Besar" };
export const financeCategoryLabel: Record<string, string> = { sales: "Penjualan", ingredients: "Bahan", tools: "Alat", marketing: "Marketing", labor: "Tenaga kerja", other: "Lainnya" };
export const SOURCE_CHANNELS = ["WhatsApp", "Instagram", "Walk-in", "TikTok", "Lainnya"];

export const rupiah = (n: number) => "Rp" + Math.round(n).toLocaleString("id-ID");
export const qtyFmt = (n: number) => (Math.round(n * 1000) / 1000).toLocaleString("id-ID");
export const dateFmt = (iso: string | null, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) =>
  iso ? new Date(iso.length === 10 ? iso + "T00:00:00" : iso).toLocaleDateString("id-ID", opts) : "-";
export const dateTimeFmt = (iso: string) =>
  new Date(iso).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

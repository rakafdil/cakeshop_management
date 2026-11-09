// Mirrors "Cakeshop Management.sql" (snake_case columns -> camelCase fields).

export type UserRole = "admin" | "staff";
export type ProductionType = "batch" | "unit";
export type FulfillmentType = "pre_order" | "ready_stock" | "hybrid";
export type MarketSegment = "premium_artisan" | "everyday_budget";
export type ProductionStatus = "planned" | "in_progress" | "completed" | "cancelled";
export type StockTransactionType = "in" | "out" | "adjustment" | "waste";
export type OrderStatus =
  | "received" | "confirmed" | "requires_review" | "in_production"
  | "ready" | "out_for_delivery" | "completed"
  | "cancelled_no_response" | "cancelled_other";
export type OrderReviewStatus = "pending" | "approved" | "rejected";
export type PaymentStatus = "pending" | "verified" | "rejected";
export type FinancialTransactionType = "income" | "expense";
export type ContentStatus = "planned" | "posted" | "skipped";
export type NegotiationStatus = "accepted" | "negotiated_down" | "negotiated_no_change" | "cancelled_due_to_price";
export type DecorationType = "fondant" | "print" | "buttercream" | "painted" | "none";
export type SizePortion = "small" | "medium" | "large";

export type User = { id: string; name: string; email: string; password: string; role: UserRole; isActive: boolean; createdAt: string };
export type Customer = { id: string; name: string; email: string | null; phone: string | null; address: string | null; createdAt: string };
export type ProductCategory = { id: string; name: string; description: string | null };
export type Product = {
  id: string; name: string; description: string | null; productionType: ProductionType; fulfillmentType: FulfillmentType;
  marketSegment: MarketSegment; basePrice: number; isActive: boolean; categoryIds: string[]; createdAt: string;
};
export type Uom = { id: string; name: string; symbol: string; type: "weight" | "volume" | "count" };
export type UomConversion = { id: string; fromUomId: string; toUomId: string; conversionFactor: number };
export type Tool = { id: string; name: string; purchaseCost: number; usefulLife: number };
export type LaborRate = { id: string; ratePerHour: number; effectiveDate: string };
export type Ingredient = { id: string; name: string; purchaseUomId: string; currentStock: number; minimumStock: number; isActive: boolean; createdAt: string };
export type IngredientPriceHistory = { id: string; ingredientId: string; price: number; previousPrice: number | null; changedAt: string };
export type Recipe = {
  id: string; productId: string; version: string; preparationSteps: string; difficultyLevel: number;
  estimatedLaborMinutes: number; isComplete: boolean; createdAt: string; updatedAt: string;
};
export type RecipeIngredient = { id: string; recipeId: string; ingredientId: string; quantity: number; uomId: string; notes: string | null };
export type RecipeTool = { id: string; recipeId: string; toolId: string; quantity: number };
export type Production = { id: string; productId: string; recipeId: string; quantity: number; status: ProductionStatus; productionDate: string; createdAt: string };
export type StockTransaction = {
  id: string; ingredientId: string; transactionType: StockTransactionType; quantity: number;
  stockBefore: number; stockAfter: number; productionId: string | null; orderId: string | null; createdAt: string;
};
export type StockAlert = { id: string; ingredientId: string; stockLevel: number; threshold: number; isResolved: boolean; createdAt: string };
export type CustomerOrder = {
  id: string; customerId: string; orderNumber: string; sourceChannel: string; status: OrderStatus;
  fulfillmentDate: string | null; fulfillmentTime: string | null; deliveryAddress: string | null;
  quotedTotal: number | null; subtotal: number; total: number; negotiationStatus: NegotiationStatus | null;
  trackingToken: string; createdAt: string;
};
export type OrderItem = {
  id: string; orderId: string; productId: string; quantity: number; uomId: string; unitPrice: number; subtotal: number;
  statedBudget: number | null; customization: string | null; decorationType: DecorationType;
  complexityScore: number | null; sizePortion: SizePortion | null; tierCount: number | null;
};
export type OrderStatusHistory = { id: string; orderId: string; oldStatus: OrderStatus | null; newStatus: OrderStatus; changedAt: string; changedBy: string | null };
export type OrderReview = { id: string; orderId: string; reason: string; status: OrderReviewStatus; reviewedBy: string | null; reviewedAt: string | null; notes: string | null };
export type Payment = { id: string; orderId: string; amount: number; paymentMethod: string; status: PaymentStatus; paidAt: string | null; createdAt: string };
export type FinancialTransaction = {
  id: string; orderId: string | null; type: FinancialTransactionType; category: string; amount: number;
  transactionDate: string; description: string | null; createdAt: string;
};
export type PricingRule = { id: string; productId: string | null; targetMarginPercentage: number };
export type SalesForecast = { id: string; productId: string; forecastDate: string; recommendedQuantity: number; confidenceScore: number; method: string };
export type Content = { id: string; title: string; content: string; platform: string; status: ContentStatus; scheduledDate: string | null; createdAt: string };

// Calendar-only plans are separate from upstream inventory transactions.
export type CalendarActivity = { id: string; title: string; date: string; time: string; kind: "restock" | "other"; notes: string; status: "planned" | "completed" | "cancelled"; createdBy: string };

export type Db = {
  calendarActivity?: CalendarActivity[];
  session: { userId: string } | null;
  riskBufferPercentage: number; // global failure/risk buffer (0..1) used for product_cost
  user: User[];
  customer: Customer[];
  productCategory: ProductCategory[];
  product: Product[];
  uom: Uom[];
  uomConversion: UomConversion[];
  tool: Tool[];
  laborRate: LaborRate[];
  ingredient: Ingredient[];
  ingredientPriceHistory: IngredientPriceHistory[];
  recipe: Recipe[];
  recipeIngredient: RecipeIngredient[];
  recipeTool: RecipeTool[];
  production: Production[];
  stockTransaction: StockTransaction[];
  stockAlert: StockAlert[];
  customerOrder: CustomerOrder[];
  orderItem: OrderItem[];
  orderStatusHistory: OrderStatusHistory[];
  orderReview: OrderReview[];
  payment: Payment[];
  financialTransaction: FinancialTransaction[];
  pricingRule: PricingRule[];
  salesForecast: SalesForecast[];
  content: Content[];
};

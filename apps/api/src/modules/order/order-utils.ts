import { randomBytes } from "node:crypto";

/**
 * Generates a unique order number in the format ORD-YYYYMMDD-XXXX.
 * @param date - Optional date to use for the date portion. Defaults to now.
 * @returns Order number string, e.g. "ORD-20261001-A8F2"
 */
export function generateOrderNumber(date?: Date): string {
	const d = date ?? new Date();
	const year = d.getUTCFullYear();
	const month = String(d.getUTCMonth() + 1).padStart(2, "0");
	const day = String(d.getUTCDate()).padStart(2, "0");
	const datePart = `${year}${month}${day}`;
	const suffix = randomBytes(2).toString("hex").toUpperCase();
	return `ORD-${datePart}-${suffix}`;
}

/**
 * Calculates the subtotal and total for a list of order items.
 * @param items - Array of items with quantity and unitPrice.
 * @returns Object with subtotal and total, each rounded to 2 decimal places.
 */
export function calculateOrderTotals(
	items: Array<{ quantity: number; unitPrice: number }>,
): { subtotal: number; total: number } {
	const raw = items.reduce(
		(acc, item) => acc + item.quantity * item.unitPrice,
		0,
	);
	const subtotal = Math.round(raw * 100) / 100;
	return { subtotal, total: subtotal };
}

/**
 * Evaluates whether an order item requires manual review.
 * Triggers review when statedBudget is below the estimated price (unitPrice * quantity).
 */
export function evaluateScreeningRule(item: {
	decorationType: string;
	statedBudget?: number;
	unitPrice: number;
	quantity: number;
}): { requiresReview: boolean; reason?: string } {
	if (item.statedBudget != null) {
		const estimatedPrice = item.unitPrice * item.quantity;
		if (item.statedBudget < estimatedPrice) {
			return {
				requiresReview: true,
				reason: `Budget stated (${item.statedBudget}) is below estimated price (${estimatedPrice})`,
			};
		}
	}
	return { requiresReview: false };
}

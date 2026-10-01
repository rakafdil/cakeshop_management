import { describe, expect, test } from "bun:test";
import {
	calculateOrderTotals,
	evaluateScreeningRule,
	generateOrderNumber,
} from "./order-utils";

describe("Order Utilities", () => {
	describe("generateOrderNumber", () => {
		test("generates order number matching pattern with provided date", () => {
			const num = generateOrderNumber(new Date("2026-10-01T10:00:00Z"));
			expect(num).toMatch(/^ORD-20261001-[A-Z0-9]{4}$/);
		});

		test("generates order number with default date matching standard pattern", () => {
			const num = generateOrderNumber();
			expect(num).toMatch(/^ORD-\d{8}-[A-Z0-9]{4}$/);
		});

		test("generates random suffix for uniqueness across calls", () => {
			const date = new Date("2026-10-01T10:00:00Z");
			const num1 = generateOrderNumber(date);
			const num2 = generateOrderNumber(date);
			const num3 = generateOrderNumber(date);

			// Given 16-bit entropy (65,536 combinations), at least 2 of 3 will almost certainly be distinct
			const set = new Set([num1, num2, num3]);
			expect(set.size).toBeGreaterThanOrEqual(2);
		});
	});

	describe("calculateOrderTotals", () => {
		test("calculates subtotal and total accurately for integer values", () => {
			const items = [
				{ quantity: 2, unitPrice: 150000 },
				{ quantity: 1, unitPrice: 75000 },
			];
			const { subtotal, total } = calculateOrderTotals(items);
			expect(subtotal).toBe(375000);
			expect(total).toBe(375000);
		});

		test("handles empty items list", () => {
			const { subtotal, total } = calculateOrderTotals([]);
			expect(subtotal).toBe(0);
			expect(total).toBe(0);
		});

		test("rounds decimals to 2 decimal places", () => {
			const items = [
				{ quantity: 3, unitPrice: 10.333 },
				{ quantity: 1, unitPrice: 5.555 },
			];
			// 3 * 10.333 + 5.555 = 30.999 + 5.555 = 36.554 -> rounds to 36.55
			const { subtotal, total } = calculateOrderTotals(items);
			expect(subtotal).toBe(36.55);
			expect(total).toBe(36.55);
		});
	});

	describe("evaluateScreeningRule", () => {
		test("flags order item for review if statedBudget is below estimated price", () => {
			const check1 = evaluateScreeningRule({
				decorationType: "fondant",
				statedBudget: 150000,
				unitPrice: 250000,
				quantity: 1,
			});
			expect(check1.requiresReview).toBe(true);
			expect(check1.reason).toContain(
				"Budget stated (150000) is below estimated price (250000)",
			);

			const check2 = evaluateScreeningRule({
				decorationType: "none",
				statedBudget: 300000,
				unitPrice: 250000,
				quantity: 1,
			});
			expect(check2.requiresReview).toBe(false);
			expect(check2.reason).toBeUndefined();
		});

		test("does not require review when statedBudget is not provided", () => {
			const check = evaluateScreeningRule({
				decorationType: "custom",
				unitPrice: 300000,
				quantity: 1,
			});
			expect(check.requiresReview).toBe(false);
			expect(check.reason).toBeUndefined();
		});

		test("flags fondant decoration when statedBudget is below unit price even with quantity edge cases", () => {
			const check = evaluateScreeningRule({
				decorationType: "fondant",
				statedBudget: 100000,
				unitPrice: 200000,
				quantity: 2,
			});
			expect(check.requiresReview).toBe(true);
			expect(check.reason).toBeDefined();
		});

		test("allows order when statedBudget equals or exceeds estimated price", () => {
			const check = evaluateScreeningRule({
				decorationType: "fondant",
				statedBudget: 500000,
				unitPrice: 250000,
				quantity: 2,
			});
			expect(check.requiresReview).toBe(false);
			expect(check.reason).toBeUndefined();
		});
	});
});

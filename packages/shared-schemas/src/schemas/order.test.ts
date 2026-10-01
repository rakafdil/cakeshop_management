import { describe, expect, test } from "bun:test";
import {
  CreateOrderItemInputSchema,
  CreateOrderWithCustomerInputSchema,
  OrderReceiptSchema,
  OrderPaymentInputSchema,
} from "./order";

describe("Order & Receipt Schemas", () => {
  test("validates valid order intake payload with inline customer", () => {
    const validPayload = {
      customer: {
        name: "Siti Rahma",
        phone: "081234567890",
        email: "siti@example.com",
        address: "Jl. Melati No. 12, Bandung",
      },
      sourceChannel: "whatsapp",
      fulfillmentDate: "2026-10-15",
      fulfillmentTime: "14:00:00",
      deliveryAddress: "Jl. Melati No. 12, Bandung",
      items: [
        {
          productId: "a0000000-0000-0000-0000-000000000001",
          quantity: 1,
          uomId: "b0000000-0000-0000-0000-000000000001",
          unitPrice: 250000,
          customization: "Tulisan: Selamat Ulang Tahun Ayah",
          decorationType: "fondant",
          sizePortion: "medium",
          tierCount: 1,
        },
      ],
    };

    const parsed = CreateOrderWithCustomerInputSchema.safeParse(validPayload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.sourceChannel).toBe("whatsapp");
      expect(parsed.data.items[0]?.decorationType).toBe("fondant");
      expect(parsed.data.items[0]?.tierCount).toBe(1);
    }
  });

  test("validates single order item input schema", () => {
    const validItem = {
      productId: "a0000000-0000-0000-0000-000000000001",
      quantity: 2,
      uomId: "b0000000-0000-0000-0000-000000000001",
      unitPrice: 150000,
      statedBudget: 300000,
      customization: "Less sugar, no nuts",
      decorationType: "buttercream",
      sizePortion: "large",
      tierCount: 2,
    };

    const parsed = CreateOrderItemInputSchema.safeParse(validItem);
    expect(parsed.success).toBe(true);
  });

  test("rejects order intake payload when items is empty", () => {
    const invalidPayload = {
      customer: { name: "Budi", phone: "08111" },
      sourceChannel: "whatsapp",
      items: [],
    };
    const parsed = CreateOrderWithCustomerInputSchema.safeParse(invalidPayload);
    expect(parsed.success).toBe(false);
  });

  test("rejects order intake payload without customer name or phone", () => {
    const invalidNoName = {
      customer: { phone: "0812345678" },
      sourceChannel: "whatsapp",
      items: [
        {
          productId: "a0000000-0000-0000-0000-000000000001",
          quantity: 1,
          uomId: "b0000000-0000-0000-0000-000000000001",
          unitPrice: 100000,
        },
      ],
    };
    const parsed1 = CreateOrderWithCustomerInputSchema.safeParse(invalidNoName);
    expect(parsed1.success).toBe(false);

    const invalidNoPhone = {
      customer: { name: "Budi" },
      sourceChannel: "whatsapp",
      items: [
        {
          productId: "a0000000-0000-0000-0000-000000000001",
          quantity: 1,
          uomId: "b0000000-0000-0000-0000-000000000001",
          unitPrice: 100000,
        },
      ],
    };
    const parsed2 = CreateOrderWithCustomerInputSchema.safeParse(invalidNoPhone);
    expect(parsed2.success).toBe(false);

    const invalidNoCustomer = {
      sourceChannel: "whatsapp",
      items: [
        {
          productId: "a0000000-0000-0000-0000-000000000001",
          quantity: 1,
          uomId: "b0000000-0000-0000-0000-000000000001",
          unitPrice: 100000,
        },
      ],
    };
    const parsed3 = CreateOrderWithCustomerInputSchema.safeParse(invalidNoCustomer);
    expect(parsed3.success).toBe(false);
  });

  test("rejects order intake payload with empty sourceChannel", () => {
    const invalidPayload = {
      customer: { name: "Budi", phone: "0812345678" },
      sourceChannel: "",
      items: [
        {
          productId: "a0000000-0000-0000-0000-000000000001",
          quantity: 1,
          uomId: "b0000000-0000-0000-0000-000000000001",
          unitPrice: 100000,
        },
      ],
    };
    const parsed = CreateOrderWithCustomerInputSchema.safeParse(invalidPayload);
    expect(parsed.success).toBe(false);
  });

  test("validates OrderReceiptSchema with essential receipt fields", () => {
    const validReceipt = {
      storeName: "Bakery Delight",
      storePhone: "08123456789",
      storeAddress: "Jl. Dago No. 100, Bandung",
      orderNumber: "ORD-20261001-ABCD",
      orderDate: "01/10/2026",
      customerName: "Siti Rahma",
      customerPhone: "081234567890",
      deliveryAddress: "Jl. Melati No. 12, Bandung",
      sourceChannel: "whatsapp",
      fulfillmentDate: "15/10/2026",
      fulfillmentTime: "14:00 WIB",
      items: [
        {
          productName: "Kue Tart Ulang Tahun",
          quantity: 1,
          unitPrice: 250000,
          subtotal: 250000,
          details: "Fondant, Ukuran Medium, 1 Tingkat. Catatan: Selamat Ulang Tahun",
        },
      ],
      subtotal: 250000,
      total: 250000,
      totalPaid: 100000,
      balanceDue: 150000,
      paymentStatus: "DP Dibayar",
      trackingUrl: "https://cakeshop.local/track/abc123token",
    };

    const parsed = OrderReceiptSchema.safeParse(validReceipt);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.orderNumber).toBe("ORD-20261001-ABCD");
      expect(parsed.data.total).toBe(250000);
      expect(parsed.data.balanceDue).toBe(150000);
      expect(parsed.data.trackingUrl).toBe("https://cakeshop.local/track/abc123token");
    }

    const invalidReceipt = {
      ...validReceipt,
      orderNumber: "",
    };
    const parsedInvalid = OrderReceiptSchema.safeParse(invalidReceipt);
    expect(parsedInvalid.success).toBe(false);
  });

  test("validates OrderPaymentInputSchema", () => {
    const validPayment = {
      amount: 250000,
      paymentMethod: "transfer_bca",
      proofUrl: "https://storage.local/proofs/123.jpg",
      status: "verified" as const,
    };
    const parsed = OrderPaymentInputSchema.safeParse(validPayment);
    expect(parsed.success).toBe(true);

    const invalidPayment = {
      amount: -5000,
      paymentMethod: "",
    };
    const parsedInvalid = OrderPaymentInputSchema.safeParse(invalidPayment);
    expect(parsedInvalid.success).toBe(false);
  });
});

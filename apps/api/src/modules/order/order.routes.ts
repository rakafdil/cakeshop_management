import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import {
  CreateOrderWithCustomerInputSchema,
  idParamSchema,
  paginationSchema,
} from "@bakery/shared-schemas";

import { unimplemented } from "../../lib/errors";
import { authenticate, type AppEnv } from "../../middleware/auth";

import {
  createOrderWithItems,
  getOrderById,
  getOrderPaymentsSummary,
  getOrderStatusHistory,
  listOrders,
  recordOrderPayment,
  updateOrderStatus,
} from "./index";

// --------------------------------------------------
// Schemas
// --------------------------------------------------

const listOrderQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().optional(),
  sourceChannel: z.string().optional(),
  customerId: z.string().optional(),
});

const updateOrderStatusSchema = z.object({
  status: z.enum([
    "received",
    "confirmed",
    "requires_review",
    "in_production",
    "ready",
    "out_for_delivery",
    "completed",
    "cancelled_no_response",
    "cancelled_other",
  ]),
});

const paymentBodySchema = z.object({
  amount: z.number().positive({
    message: "Amount harus lebih dari 0",
  }),
  paymentMethod: z.string().min(1),
  proofUrl: z.string().optional(),
  status: z.enum(["pending", "verified", "rejected"]).optional(),
});

// Placeholder response schemas.
// Ganti z.unknown() dengan schema response asli jika tersedia.
const dataResponseSchema = z.object({
  data: z.unknown(),
});

const errorResponseSchema = z.object({
  error: z.string(),
});

const orderTags = ["Orders"];
const paymentTags = ["Order Payments"];
const historyTags = ["Order Status History"];
const itemTags = ["Order Items"];
const reviewTags = ["Order Reviews"];
const reminderTags = ["Order Reminders"];
const slotTags = ["Order Production Slots"];

// --------------------------------------------------
// Core order routes
// --------------------------------------------------

export const orderRoutes = new OpenAPIHono<AppEnv>();

orderRoutes.use("*", authenticate);

const createOrderRoute = createRoute({
  method: "post",
  path: "/",
  tags: orderTags,
  summary: "Create an order",
  description: "Membuat pesanan beserta data customer dan item.",
  request: {
    headers: z.object({
      "x-csrf-token": z.string().min(1),
    }),
    body: {
      content: {
        "application/json": {
          schema: CreateOrderWithCustomerInputSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Order berhasil dibuat",
      content: {
        "application/json": {
          schema: dataResponseSchema,
        },
      },
    },
  },
});

orderRoutes.openapi(createOrderRoute, async (c) => {
  const body = c.req.valid("json");
  const userId = c.get("account")?.id ?? c.get("user")?.sub;

  const createdOrder = await createOrderWithItems(body, userId);

  return c.json({ data: createdOrder }, 201);
});

const listOrdersRoute = createRoute({
  method: "get",
  path: "/",
  tags: orderTags,
  summary: "List orders",
  description: "Mengambil daftar pesanan dengan filter dan pagination.",
  request: {
    query: listOrderQuerySchema,
  },
  responses: {
    200: {
      description: "Daftar order berhasil diambil",
      content: {
        "application/json": {
          schema: z.unknown(),
        },
      },
    },
  },
});

orderRoutes.openapi(listOrdersRoute, async (c) => {
  const query = c.req.valid("query");
  const result = await listOrders(query);

  return c.json(result, 200);
});

const getOrderRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: orderTags,
  summary: "Get order by ID",
  request: {
    params: idParamSchema,
  },
  responses: {
    200: {
      description: "Detail order berhasil diambil",
      content: {
        "application/json": {
          schema: dataResponseSchema,
        },
      },
    },
  },
});

orderRoutes.openapi(getOrderRoute, async (c) => {
  const { id } = c.req.valid("param");
  const order = await getOrderById(id);

  return c.json({ data: order }, 200);
});

const updateOrderStatusRoute = createRoute({
  method: "patch",
  path: "/{id}/status",
  tags: orderTags,
  summary: "Update order status",
  request: {
    params: idParamSchema,
    headers: z.object({
      "x-csrf-token": z.string().min(1),
    }),
    body: {
      content: {
        "application/json": {
          schema: updateOrderStatusSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Status order berhasil diperbarui",
      content: {
        "application/json": {
          schema: dataResponseSchema,
        },
      },
    },
  },
});

orderRoutes.openapi(updateOrderStatusRoute, async (c) => {
  const { id } = c.req.valid("param");
  const { status } = c.req.valid("json");
  const userId = c.get("account")?.id ?? c.get("user")?.sub;

  const updated = await updateOrderStatus(id, status, userId);

  return c.json({ data: updated }, 200);
});

// --------------------------------------------------
// Order status history
// --------------------------------------------------

export const orderStatusHistoryRoutes = new OpenAPIHono<AppEnv>();

orderStatusHistoryRoutes.use("*", authenticate);

const getOrderStatusHistoryRoute = createRoute({
  method: "get",
  path: "/{id}/status-history",
  tags: historyTags,
  summary: "Get order status history",
  request: {
    params: idParamSchema,
  },
  responses: {
    200: {
      description: "Riwayat status order berhasil diambil",
      content: {
        "application/json": {
          schema: dataResponseSchema,
        },
      },
    },
  },
});

orderStatusHistoryRoutes.openapi(getOrderStatusHistoryRoute, async (c) => {
  const { id } = c.req.valid("param");
  const history = await getOrderStatusHistory(id);

  return c.json({ data: history }, 200);
});

// --------------------------------------------------
// Order items
// --------------------------------------------------

export const orderItemRoutes = new OpenAPIHono<AppEnv>();

orderItemRoutes.use("*", authenticate);

const getOrderItemsRoute = createRoute({
  method: "get",
  path: "/{id}/items",
  tags: itemTags,
  summary: "List order items",
  request: {
    params: idParamSchema,
    query: paginationSchema,
  },
  responses: {
    200: {
      description: "Daftar item order",
      content: {
        "application/json": {
          schema: z.unknown(),
        },
      },
    },
    501: {
      description: "Fitur belum diimplementasikan",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

orderItemRoutes.openapi(getOrderItemsRoute, (c) =>
  unimplemented("order items belum diimplementasikan"),
);

const addOrderItemRoute = createRoute({
  method: "post",
  path: "/{id}/items",
  tags: itemTags,
  summary: "Add order item",
  request: {
    headers: z.object({
      "x-csrf-token": z.string().min(1),
    }),
    params: idParamSchema,
  },
  responses: {
    201: {
      description: "Item order berhasil ditambahkan",
      content: {
        "application/json": {
          schema: dataResponseSchema,
        },
      },
    },
    501: {
      description: "Fitur belum diimplementasikan",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

orderItemRoutes.openapi(addOrderItemRoute, (c) =>
  unimplemented("add order item belum diimplementasikan"),
);

// --------------------------------------------------
// Order reviews
// --------------------------------------------------

export const orderReviewRoutes = new OpenAPIHono<AppEnv>();

orderReviewRoutes.use("*", authenticate);

const getOrderReviewsRoute = createRoute({
  method: "get",
  path: "/{id}/reviews",
  tags: reviewTags,
  summary: "List order reviews",
  request: {
    params: idParamSchema,
  },
  responses: {
    200: {
      description: "Daftar review order",
      content: {
        "application/json": {
          schema: z.unknown(),
        },
      },
    },
    501: {
      description: "Fitur belum diimplementasikan",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

orderReviewRoutes.openapi(getOrderReviewsRoute, (c) =>
  unimplemented("order reviews belum diimplementasikan"),
);

const createOrderReviewRoute = createRoute({
  method: "post",
  path: "/{id}/reviews",
  tags: reviewTags,
  summary: "Create order review",
  request: {
    headers: z.object({
      "x-csrf-token": z.string().min(1),
    }),
    params: idParamSchema,
  },
  responses: {
    201: {
      description: "Review berhasil dibuat",
      content: {
        "application/json": {
          schema: dataResponseSchema,
        },
      },
    },
    501: {
      description: "Fitur belum diimplementasikan",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

orderReviewRoutes.openapi(createOrderReviewRoute, (c) =>
  unimplemented("create order review belum diimplementasikan"),
);

// --------------------------------------------------
// Order reminders
// --------------------------------------------------

export const orderReminderRoutes = new OpenAPIHono<AppEnv>();

orderReminderRoutes.use("*", authenticate);

const getOrderRemindersRoute = createRoute({
  method: "get",
  path: "/{id}/reminders",
  tags: reminderTags,
  summary: "List order reminders",
  request: {
    params: idParamSchema,
  },
  responses: {
    200: {
      description: "Daftar reminder order",
      content: {
        "application/json": {
          schema: z.unknown(),
        },
      },
    },
    501: {
      description: "Fitur belum diimplementasikan",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

orderReminderRoutes.openapi(getOrderRemindersRoute, (c) =>
  unimplemented("order reminders belum diimplementasikan"),
);

const createOrderReminderRoute = createRoute({
  method: "post",
  path: "/{id}/reminders",
  tags: reminderTags,
  summary: "Schedule order reminder",
  request: {
    headers: z.object({
      "x-csrf-token": z.string().min(1),
    }),
    params: idParamSchema,
  },
  responses: {
    201: {
      description: "Reminder berhasil dijadwalkan",
      content: {
        "application/json": {
          schema: dataResponseSchema,
        },
      },
    },
    501: {
      description: "Fitur belum diimplementasikan",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

orderReminderRoutes.openapi(createOrderReminderRoute, (c) =>
  unimplemented("schedule order reminder belum diimplementasikan"),
);

// --------------------------------------------------
// Order payments
// --------------------------------------------------

export const orderPaymentRoutes = new OpenAPIHono<AppEnv>();

orderPaymentRoutes.use("*", authenticate);

const getOrderPaymentsRoute = createRoute({
  method: "get",
  path: "/{id}/payments",
  tags: paymentTags,
  summary: "Get order payment summary",
  request: {
    params: idParamSchema,
  },
  responses: {
    200: {
      description: "Ringkasan pembayaran order",
      content: {
        "application/json": {
          schema: z.unknown(),
        },
      },
    },
  },
});

orderPaymentRoutes.openapi(getOrderPaymentsRoute, async (c) => {
  const { id } = c.req.valid("param");
  const result = await getOrderPaymentsSummary(id);

  return c.json(result, 200);
});

const createOrderPaymentRoute = createRoute({
  method: "post",
  path: "/{id}/payments",
  tags: paymentTags,
  summary: "Record order payment",
  request: {
    params: idParamSchema,
    headers: z.object({
      "x-csrf-token": z.string().min(1),
    }),
    body: {
      content: {
        "application/json": {
          schema: paymentBodySchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Pembayaran berhasil dicatat",
      content: {
        "application/json": {
          schema: dataResponseSchema,
        },
      },
    },
  },
});

orderPaymentRoutes.openapi(createOrderPaymentRoute, async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");

  const newPayment = await recordOrderPayment(id, body);

  return c.json({ data: newPayment }, 201);
});

// --------------------------------------------------
// Order production slots
// --------------------------------------------------

export const orderProductionSlotRoutes = new OpenAPIHono<AppEnv>();

orderProductionSlotRoutes.use("*", authenticate);

const getOrderProductionSlotsRoute = createRoute({
  method: "get",
  path: "/{id}/production-slots",
  tags: slotTags,
  summary: "Get order production slots",
  request: {
    params: idParamSchema,
  },
  responses: {
    200: {
      description: "Daftar slot produksi order",
      content: {
        "application/json": {
          schema: z.unknown(),
        },
      },
    },
    501: {
      description: "Fitur belum diimplementasikan",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

orderProductionSlotRoutes.openapi(getOrderProductionSlotsRoute, (c) =>
  unimplemented("order production slots belum diimplementasikan"),
);

const reserveOrderProductionSlotsRoute = createRoute({
  method: "put",
  path: "/{id}/production-slots",
  tags: slotTags,
  summary: "Reserve order production slots",
  request: {
    headers: z.object({
      "x-csrf-token": z.string().min(1),
    }),
    params: idParamSchema,
  },
  responses: {
    200: {
      description: "Slot produksi berhasil diperbarui",
      content: {
        "application/json": {
          schema: dataResponseSchema,
        },
      },
    },
    501: {
      description: "Fitur belum diimplementasikan",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

orderProductionSlotRoutes.openapi(reserveOrderProductionSlotsRoute, (c) =>
  unimplemented("reserve order production slots belum diimplementasikan"),
);

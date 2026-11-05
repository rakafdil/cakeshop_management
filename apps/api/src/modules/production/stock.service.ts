import {
  ingredient,
  orderItem,
  recipe,
  recipeIngredient,
  stockAlert,
  stockTransaction,
  uomConversion,
} from "@bakery/database/schema";
import { and, eq } from "drizzle-orm";
import { badRequest, conflict } from "../../lib/errors";
import type { OrderTransaction } from "../order/order-customer";

type StockTransaction = OrderTransaction;

function toQuantity(value: string | number) {
  return Number(value);
}

async function convertToPurchaseUom(
  tx: StockTransaction,
  quantity: number,
  fromUomId: string,
  toUomId: string,
) {
  if (fromUomId === toUomId) return quantity;

  const [conversion] = await tx
    .select({ factor: uomConversion.conversionFactor })
    .from(uomConversion)
    .where(
      and(
        eq(uomConversion.fromUomId, fromUomId),
        eq(uomConversion.toUomId, toUomId),
      ),
    )
    .limit(1);

  if (!conversion) {
    throw badRequest(
      `Konversi UOM tidak ditemukan untuk ${fromUomId} ke ${toUomId}`,
    );
  }

  return quantity * toQuantity(conversion.factor);
}

export async function consumeOrderIngredients(
  tx: StockTransaction,
  orderId: string,
) {
  const existingConsumption = await tx
    .select({ id: stockTransaction.id })
    .from(stockTransaction)
    .where(
      and(
        eq(stockTransaction.orderId, orderId),
        eq(stockTransaction.transactionType, "out"),
      ),
    )
    .limit(1);

  if (existingConsumption.length > 0) return;

  const items = await tx
    .select()
    .from(orderItem)
    .where(eq(orderItem.orderId, orderId));

  const requiredByIngredient = new Map<string, number>();

  for (const item of items) {
    const [itemRecipe] = await tx
      .select()
      .from(recipe)
      .where(eq(recipe.productId, item.productId))
      .orderBy(recipe.createdAt)
      .limit(1);

    if (!itemRecipe) {
      throw badRequest(`Resep produk ${item.productId} tidak ditemukan`);
    }

    const recipeRows = await tx
      .select()
      .from(recipeIngredient)
      .where(eq(recipeIngredient.recipeId, itemRecipe.id));

    for (const row of recipeRows) {
      const ingredientRow = await tx
        .select({
          purchaseUomId: ingredient.purchaseUomId,
        })
        .from(ingredient)
        .where(eq(ingredient.id, row.ingredientId))
        .limit(1);

      if (!ingredientRow[0]) {
        throw badRequest(`Ingredient ${row.ingredientId} tidak ditemukan`);
      }

      const quantity = await convertToPurchaseUom(
        tx,
        toQuantity(row.quantity) * toQuantity(item.quantity),
        row.uomId,
        ingredientRow[0].purchaseUomId,
      );
      requiredByIngredient.set(
        row.ingredientId,
        (requiredByIngredient.get(row.ingredientId) ?? 0) + quantity,
      );
    }
  }

  for (const [ingredientId, requiredQuantity] of requiredByIngredient) {
    const [ingredientRow] = await tx
      .select()
      .from(ingredient)
      .where(eq(ingredient.id, ingredientId))
      .for("update");

    if (!ingredientRow) {
      throw badRequest(`Ingredient ${ingredientId} tidak ditemukan`);
    }

    const stockBefore = toQuantity(ingredientRow.currentStock);
    const stockAfter = stockBefore - requiredQuantity;
    if (stockAfter < 0) {
      throw conflict(
        `Stok ingredient ${ingredientId} tidak mencukupi untuk produksi order`,
      );
    }

    await tx
      .update(ingredient)
      .set({ currentStock: stockAfter.toFixed(3), updatedAt: new Date() })
      .where(eq(ingredient.id, ingredientId));

    await tx.insert(stockTransaction).values({
      ingredientId,
      transactionType: "out",
      quantity: requiredQuantity.toFixed(3),
      stockBefore: stockBefore.toFixed(3),
      stockAfter: stockAfter.toFixed(3),
      orderId,
    });

    if (stockAfter <= toQuantity(ingredientRow.minimumStock)) {
      const [unresolvedAlert] = await tx
        .select({ id: stockAlert.id })
        .from(stockAlert)
        .where(
          and(
            eq(stockAlert.ingredientId, ingredientId),
            eq(stockAlert.isResolved, false),
          ),
        )
        .limit(1);

      if (!unresolvedAlert) {
        await tx.insert(stockAlert).values({
          ingredientId,
          stockLevel: stockAfter.toFixed(3),
          threshold: ingredientRow.minimumStock,
        });
      }
    }
  }
}

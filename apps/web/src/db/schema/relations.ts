import { relations } from "drizzle-orm";

import { categories } from "./category";
import { products } from "./product";
import { productBenefits } from "./product-benefit";
import { productMedia } from "./product-media";
import { productPrices } from "./product-price";
import { productVariants } from "./product-variant";

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),

  benefits: many(productBenefits),
  media: many(productMedia),
  prices: many(productPrices),
  variants: many(productVariants),
}));

export const productBenefitsRelations = relations(
  productBenefits,
  ({ one }) => ({
    product: one(products, {
      fields: [productBenefits.productId],
      references: [products.id],
    }),
  }),
);

export const productMediaRelations = relations(productMedia, ({ one }) => ({
  product: one(products, {
    fields: [productMedia.productId],
    references: [products.id],
  }),
}));

export const productPricesRelations = relations(productPrices, ({ one }) => ({
  product: one(products, {
    fields: [productPrices.productId],
    references: [products.id],
  }),
}));

export const productVariantsRelations = relations(
  productVariants,
  ({ one }) => ({
    product: one(products, {
      fields: [productVariants.productId],
      references: [products.id],
    }),
  }),
);

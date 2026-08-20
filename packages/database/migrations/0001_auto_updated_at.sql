-- Auto-update `updated_at` on row change (matches Cakeshop Management.sql utility section)
--> statement-breakpoint
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER trg_user_updated_at BEFORE UPDATE ON "user"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER trg_customer_updated_at BEFORE UPDATE ON customer
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER trg_product_updated_at BEFORE UPDATE ON product
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER trg_ingredient_updated_at BEFORE UPDATE ON ingredient
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER trg_recipe_updated_at BEFORE UPDATE ON recipe
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER trg_customer_order_updated_at BEFORE UPDATE ON customer_order
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER trg_pricing_rule_updated_at BEFORE UPDATE ON pricing_rule
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER trg_content_updated_at BEFORE UPDATE ON content
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

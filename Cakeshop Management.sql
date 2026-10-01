-- ==========================================================
-- Bakery Business Management Platform — PostgreSQL Schema
-- Version: 2.1 (pricing research extension)
--
-- Changes vs. v1.0 ERD:
--   - Added NOTIFICATION_LOG (order status notifications, FR-OCS-04)
--   - Added LABOR_RATE + RECIPE.estimated_labor_minutes (feeds HPP labor_cost)
--   - Added ORDER_ITEM.stated_budget (feeds budget-vs-tier screening, FR-OCS-06)
--   - PRICING_RULE now supports per-product override (product_id nullable)
--   - Composite primary keys on junction tables
--   - Explicit ENUM types instead of generic `enum`
--   - TIMESTAMPTZ instead of TIMESTAMP (timezone-safe)
--   - Indexes on all FK columns + query-pattern-specific indexes
--   - CHECK constraints for data integrity
--   - Automatic updated_at triggers
--
-- Changes vs. v2.0 (pricing recommendation thesis support):
--   - CUSTOMER_ORDER.quoted_total + negotiation_status (initial offer vs.
--     final agreed price — ground truth for price-acceptance validation)
--   - ORDER_ITEM.uom_id, decoration_type, complexity_score, size_portion,
--     tier_count (per-order attributes; complexity can vary per order even
--     for the same product/recipe, unlike RECIPE.difficulty_level)
--   - Added PRICE_RECOMMENDATION (logs model inputs/output per order item,
--     for both the fuzzy model and the existing cost-plus baseline, so the
--     two can be evaluated against actual negotiation outcomes)
--   - NOTE: production_type ('batch' | 'unit') already distinguishes
--     regular-batch vs. custom/decor items — no new enum needed for that.
-- ==========================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================================
-- ENUM TYPES
-- ==========================================================

CREATE TYPE user_role AS ENUM ('admin', 'staff');
CREATE TYPE production_type AS ENUM ('batch', 'unit');
CREATE TYPE fulfillment_type AS ENUM ('pre_order', 'ready_stock', 'hybrid');
CREATE TYPE market_segment AS ENUM ('premium_artisan', 'everyday_budget');
CREATE TYPE production_status AS ENUM ('planned', 'in_progress', 'completed', 'cancelled');
CREATE TYPE stock_transaction_type AS ENUM ('in', 'out', 'adjustment', 'waste');
CREATE TYPE order_status AS ENUM (
  'received', 'confirmed', 'requires_review', 'in_production',
  'ready', 'out_for_delivery', 'completed',
  'cancelled_no_response', 'cancelled_other'
);
CREATE TYPE order_review_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE reminder_status AS ENUM ('scheduled', 'sent', 'failed', 'cancelled');
CREATE TYPE payment_status AS ENUM ('pending', 'verified', 'rejected');
CREATE TYPE financial_transaction_type AS ENUM ('income', 'expense');
CREATE TYPE content_status AS ENUM ('planned', 'posted', 'skipped');
CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'failed', 'retrying');
CREATE TYPE negotiation_status AS ENUM ('accepted', 'negotiated_down', 'negotiated_no_change', 'cancelled_due_to_price');
CREATE TYPE decoration_type AS ENUM ('fondant', 'print', 'buttercream', 'painted', 'none');
CREATE TYPE size_portion AS ENUM ('small', 'medium', 'large');

-- ==========================================================
-- UTILITY: auto-update `updated_at` on row change
-- ==========================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==========================================================
-- CORE ENTITIES
-- ==========================================================

CREATE TABLE "user" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(150) NOT NULL,
  email varchar(255) NOT NULL UNIQUE,
  password_hash varchar(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'staff',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_user_role ON "user" (role) WHERE is_active = true;
CREATE TRIGGER trg_user_updated_at BEFORE UPDATE ON "user"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE customer (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(150) NOT NULL,
  email varchar(255),
  phone varchar(30),
  address text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_customer_phone ON customer (phone);
CREATE INDEX idx_customer_email ON customer (email);
CREATE TRIGGER trg_customer_updated_at BEFORE UPDATE ON customer
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE product_category (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(150) NOT NULL,
  description text
);

CREATE TABLE product (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(200) NOT NULL,
  description text,
  production_type production_type NOT NULL,
  fulfillment_type fulfillment_type NOT NULL DEFAULT 'hybrid',
  market_segment market_segment NOT NULL,
  base_price decimal(14,2) NOT NULL CHECK (base_price >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_product_active ON product (is_active) WHERE is_active = true;
CREATE INDEX idx_product_market_segment ON product (market_segment);
CREATE TRIGGER trg_product_updated_at BEFORE UPDATE ON product
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE product_category_map (
  product_id uuid NOT NULL REFERENCES product (id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES product_category (id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, category_id)
);
CREATE INDEX idx_pcm_category ON product_category_map (category_id);

-- ==========================================================
-- RECIPE & INGREDIENT MANAGEMENT
-- ==========================================================

CREATE TABLE uom (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(50) NOT NULL,
  symbol varchar(10) NOT NULL UNIQUE,
  type varchar(20) NOT NULL -- 'weight', 'volume', 'count'
);

CREATE TABLE uom_conversion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_uom_id uuid NOT NULL REFERENCES uom (id) ON DELETE RESTRICT,
  to_uom_id uuid NOT NULL REFERENCES uom (id) ON DELETE RESTRICT,
  conversion_factor decimal(18,8) NOT NULL CHECK (conversion_factor > 0),
  UNIQUE (from_uom_id, to_uom_id)
);
CREATE INDEX idx_uom_conversion_to ON uom_conversion (to_uom_id);

CREATE TABLE tool (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(150) NOT NULL,
  purchase_cost decimal(14,2) NOT NULL CHECK (purchase_cost >= 0),
  useful_life decimal(14,2) NOT NULL CHECK (useful_life > 0), -- total expected uses
  cost_per_use decimal(14,4) GENERATED ALWAYS AS (purchase_cost / useful_life) STORED
);

CREATE TABLE labor_rate (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_per_hour decimal(14,2) NOT NULL CHECK (rate_per_hour >= 0),
  effective_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_labor_rate_effective_date ON labor_rate (effective_date DESC);

CREATE TABLE ingredient (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(150) NOT NULL,
  purchase_uom_id uuid NOT NULL REFERENCES uom (id) ON DELETE RESTRICT,
  current_stock decimal(14,3) NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
  minimum_stock decimal(14,3) NOT NULL DEFAULT 0 CHECK (minimum_stock >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ingredient_low_stock ON ingredient (current_stock)
  WHERE is_active = true;
CREATE TRIGGER trg_ingredient_updated_at BEFORE UPDATE ON ingredient
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE ingredient_price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id uuid NOT NULL REFERENCES ingredient (id) ON DELETE CASCADE,
  price decimal(14,2) NOT NULL CHECK (price >= 0),
  previous_price decimal(14,2),
  changed_at timestamptz NOT NULL DEFAULT now()
);
-- Fast lookup of "current price as of date X" per ingredient
CREATE INDEX idx_iph_ingredient_date ON ingredient_price_history (ingredient_id, changed_at DESC);

CREATE TABLE recipe (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES product (id) ON DELETE CASCADE,
  version varchar(20) NOT NULL DEFAULT '1.0',
  preparation_steps text NOT NULL,
  difficulty_level int NOT NULL CHECK (difficulty_level BETWEEN 1 AND 5),
  estimated_labor_minutes decimal(10,2) NOT NULL CHECK (estimated_labor_minutes >= 0),
  is_complete boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_recipe_product ON recipe (product_id);
CREATE UNIQUE INDEX idx_recipe_product_version ON recipe (product_id, version);
CREATE TRIGGER trg_recipe_updated_at BEFORE UPDATE ON recipe
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE recipe_ingredient (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES recipe (id) ON DELETE CASCADE,
  ingredient_id uuid NOT NULL REFERENCES ingredient (id) ON DELETE RESTRICT,
  quantity decimal(14,3) NOT NULL CHECK (quantity > 0),
  uom_id uuid NOT NULL REFERENCES uom (id) ON DELETE RESTRICT,
  notes text
);
CREATE INDEX idx_recipe_ingredient_recipe ON recipe_ingredient (recipe_id);
CREATE INDEX idx_recipe_ingredient_ingredient ON recipe_ingredient (ingredient_id);

CREATE TABLE recipe_tool (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES recipe (id) ON DELETE CASCADE,
  tool_id uuid NOT NULL REFERENCES tool (id) ON DELETE RESTRICT,
  quantity int NOT NULL DEFAULT 1 CHECK (quantity > 0)
);
CREATE INDEX idx_recipe_tool_recipe ON recipe_tool (recipe_id);
CREATE INDEX idx_recipe_tool_tool ON recipe_tool (tool_id);

CREATE TABLE recipe_image (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES recipe (id) ON DELETE CASCADE,
  image_url text NOT NULL,
  caption varchar(255)
);
CREATE INDEX idx_recipe_image_recipe ON recipe_image (recipe_id);

-- ==========================================================
-- PRODUCTION & INVENTORY
-- ==========================================================

CREATE TABLE production_slot (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  capacity int NOT NULL CHECK (capacity > 0),
  reserved_capacity int NOT NULL DEFAULT 0 CHECK (reserved_capacity >= 0),
  is_available boolean NOT NULL DEFAULT true,
  CHECK (reserved_capacity <= capacity),
  CHECK (end_time > start_time)
);
CREATE INDEX idx_production_slot_date ON production_slot (slot_date) WHERE is_available = true;

CREATE TABLE production (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES product (id) ON DELETE RESTRICT,
  recipe_id uuid NOT NULL REFERENCES recipe (id) ON DELETE RESTRICT,
  quantity decimal(14,3) NOT NULL CHECK (quantity > 0),
  status production_status NOT NULL DEFAULT 'planned',
  production_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_production_product_date ON production (product_id, production_date);
CREATE INDEX idx_production_status ON production (status) WHERE status IN ('planned', 'in_progress');

CREATE TABLE stock_transaction (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id uuid NOT NULL REFERENCES ingredient (id) ON DELETE RESTRICT,
  transaction_type stock_transaction_type NOT NULL,
  quantity decimal(14,3) NOT NULL,
  stock_before decimal(14,3) NOT NULL,
  stock_after decimal(14,3) NOT NULL,
  production_id uuid REFERENCES production (id) ON DELETE SET NULL,
  order_id uuid, -- FK added after customer_order is defined
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_stock_transaction_ingredient_date ON stock_transaction (ingredient_id, created_at DESC);
CREATE INDEX idx_stock_transaction_production ON stock_transaction (production_id);

CREATE TABLE stock_alert (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id uuid NOT NULL REFERENCES ingredient (id) ON DELETE CASCADE,
  stock_level decimal(14,3) NOT NULL,
  threshold decimal(14,3) NOT NULL,
  is_resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_stock_alert_unresolved ON stock_alert (ingredient_id) WHERE is_resolved = false;

-- ==========================================================
-- ORDER & FULFILLMENT
-- ==========================================================

CREATE TABLE price_list_snapshot (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version varchar(20) NOT NULL,
  snapshot_data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_price_list_snapshot_created ON price_list_snapshot (created_at DESC);

CREATE TABLE customer_order (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customer (id) ON DELETE RESTRICT,
  order_number varchar(30) NOT NULL UNIQUE,
  source_channel varchar(50) NOT NULL,
  status order_status NOT NULL DEFAULT 'received',
  fulfillment_date date,
  fulfillment_time time,
  delivery_address text,
  quoted_total decimal(14,2) CHECK (quoted_total >= 0), -- initial price offered, before negotiation
  subtotal decimal(14,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  total decimal(14,2) NOT NULL DEFAULT 0 CHECK (total >= 0), -- final agreed price: pricing model ground truth
  negotiation_status negotiation_status, -- set once price is settled; null while still in negotiation
  tracking_token varchar(64) NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  pricelist_snapshot_id uuid REFERENCES price_list_snapshot (id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_customer_order_customer ON customer_order (customer_id);
CREATE INDEX idx_customer_order_status ON customer_order (status);
CREATE INDEX idx_customer_order_fulfillment_date ON customer_order (fulfillment_date);
CREATE INDEX idx_customer_order_negotiation_status ON customer_order (negotiation_status) WHERE negotiation_status IS NOT NULL;
-- tracking_token already has a UNIQUE constraint -> indexed automatically
CREATE TRIGGER trg_customer_order_updated_at BEFORE UPDATE ON customer_order
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE stock_transaction
  ADD CONSTRAINT fk_stock_transaction_order
  FOREIGN KEY (order_id) REFERENCES customer_order (id) ON DELETE SET NULL;
CREATE INDEX idx_stock_transaction_order ON stock_transaction (order_id);

CREATE TABLE order_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES customer_order (id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES product (id) ON DELETE RESTRICT,
  quantity decimal(14,3) NOT NULL CHECK (quantity > 0),
  uom_id uuid NOT NULL REFERENCES uom (id) ON DELETE RESTRICT,
  unit_price decimal(14,2) NOT NULL CHECK (unit_price >= 0),
  subtotal decimal(14,2) NOT NULL CHECK (subtotal >= 0),
  stated_budget decimal(14,2), -- customer's declared budget, for screening (FR-OCS-06)
  customization text,
  decoration_type decoration_type NOT NULL DEFAULT 'none', -- meaningful for product_type = 'unit'
  complexity_score int CHECK (complexity_score BETWEEN 1 AND 5), -- per-order override of recipe.difficulty_level
  size_portion size_portion,
  tier_count int CHECK (tier_count > 0) -- nullable; multi-tier custom cakes only
);
CREATE INDEX idx_order_item_order ON order_item (order_id);
CREATE INDEX idx_order_item_product ON order_item (product_id);
CREATE INDEX idx_order_item_uom ON order_item (uom_id);

CREATE TABLE order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES customer_order (id) ON DELETE CASCADE,
  old_status order_status,
  new_status order_status NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  changed_by uuid REFERENCES "user" (id) ON DELETE SET NULL
);
CREATE INDEX idx_order_status_history_order ON order_status_history (order_id, changed_at DESC);

CREATE TABLE order_review (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES customer_order (id) ON DELETE CASCADE,
  reason varchar(255) NOT NULL,
  status order_review_status NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES "user" (id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  notes text
);
CREATE INDEX idx_order_review_order ON order_review (order_id);
CREATE INDEX idx_order_review_pending ON order_review (status) WHERE status = 'pending';

CREATE TABLE order_reminder (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES customer_order (id) ON DELETE CASCADE,
  reminder_number int NOT NULL CHECK (reminder_number > 0),
  channel varchar(30) NOT NULL,
  scheduled_at timestamptz NOT NULL,
  sent_at timestamptz,
  status reminder_status NOT NULL DEFAULT 'scheduled'
);
CREATE INDEX idx_order_reminder_order ON order_reminder (order_id);
CREATE INDEX idx_order_reminder_due ON order_reminder (scheduled_at) WHERE status = 'scheduled';

CREATE TABLE order_production_slot (
  order_id uuid NOT NULL REFERENCES customer_order (id) ON DELETE CASCADE,
  production_slot_id uuid NOT NULL REFERENCES production_slot (id) ON DELETE RESTRICT,
  PRIMARY KEY (order_id, production_slot_id)
);
CREATE INDEX idx_ops_slot ON order_production_slot (production_slot_id);

-- Notification log (FR-OCS-04, NFR-REL-03: retry tracking)
CREATE TABLE notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES customer_order (id) ON DELETE CASCADE,
  trigger_event varchar(100) NOT NULL, -- e.g. 'status_change:in_production'
  channel varchar(30) NOT NULL,
  status notification_status NOT NULL DEFAULT 'pending',
  sent_at timestamptz,
  retry_count int NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_notification_log_order ON notification_log (order_id);
CREATE INDEX idx_notification_log_pending ON notification_log (status) WHERE status IN ('pending', 'retrying');

-- ==========================================================
-- FINANCE & PRICING
-- ==========================================================

CREATE TABLE payment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES customer_order (id) ON DELETE CASCADE,
  amount decimal(14,2) NOT NULL CHECK (amount >= 0),
  payment_method varchar(50) NOT NULL,
  proof_url text,
  status payment_status NOT NULL DEFAULT 'pending',
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_payment_order ON payment (order_id);
CREATE INDEX idx_payment_status ON payment (status) WHERE status = 'pending';

CREATE TABLE financial_transaction (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES customer_order (id) ON DELETE SET NULL,
  type financial_transaction_type NOT NULL,
  category varchar(50) NOT NULL,
  amount decimal(14,2) NOT NULL CHECK (amount >= 0),
  transaction_date date NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- Core index for profit/loss reports filtered by date range + type
CREATE INDEX idx_financial_transaction_date_type ON financial_transaction (transaction_date, type);
CREATE INDEX idx_financial_transaction_category ON financial_transaction (category);
CREATE INDEX idx_financial_transaction_order ON financial_transaction (order_id);

CREATE TABLE product_cost (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES product (id) ON DELETE CASCADE,
  material_cost decimal(14,2) NOT NULL CHECK (material_cost >= 0),
  labor_cost decimal(14,2) NOT NULL CHECK (labor_cost >= 0),
  tool_depreciation decimal(14,2) NOT NULL CHECK (tool_depreciation >= 0),
  complexity_multiplier decimal(6,3) NOT NULL DEFAULT 1.0 CHECK (complexity_multiplier >= 1.0),
  risk_buffer_percentage decimal(5,4) NOT NULL DEFAULT 0 CHECK (risk_buffer_percentage >= 0 AND risk_buffer_percentage < 1),
  hpp decimal(14,2) NOT NULL CHECK (hpp >= 0),
  calculated_at timestamptz NOT NULL DEFAULT now()
);
-- "Latest HPP per product" is a very common lookup
CREATE INDEX idx_product_cost_product_calculated ON product_cost (product_id, calculated_at DESC);

CREATE TABLE pricing_rule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES product (id) ON DELETE CASCADE, -- NULL = global default rule
  target_margin_percentage decimal(5,4) NOT NULL CHECK (target_margin_percentage >= 0 AND target_margin_percentage < 1),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- Only one override rule per product
CREATE UNIQUE INDEX idx_pricing_rule_product ON pricing_rule (product_id) WHERE product_id IS NOT NULL;
-- Only one global default rule (product_id IS NULL)
CREATE UNIQUE INDEX idx_pricing_rule_single_default ON pricing_rule ((true)) WHERE product_id IS NULL;
CREATE TRIGGER trg_pricing_rule_updated_at BEFORE UPDATE ON pricing_rule
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE product_price (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES product (id) ON DELETE CASCADE,
  hpp decimal(14,2) NOT NULL CHECK (hpp >= 0),
  target_margin decimal(5,4) NOT NULL CHECK (target_margin >= 0 AND target_margin < 1),
  recommended_price decimal(14,2) NOT NULL CHECK (recommended_price >= 0),
  calculated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_product_price_product_calculated ON product_price (product_id, calculated_at DESC);

-- Per-order-item price recommendations, one row per model run. Distinct from
-- PRODUCT_PRICE (a product-level baseline recalculated when costs change):
-- this captures the order-specific inputs (complexity, scale, turnaround)
-- that the same product can have different values for across orders.
CREATE TABLE price_recommendation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id uuid NOT NULL REFERENCES order_item (id) ON DELETE CASCADE,
  complexity_input decimal(6,3) NOT NULL,
  material_cost_input decimal(14,2) NOT NULL CHECK (material_cost_input >= 0),
  scale_input decimal(14,3) NOT NULL,
  turnaround_input decimal(10,2) NOT NULL, -- e.g. hours or days until fulfillment_date
  recommended_price decimal(14,2) NOT NULL CHECK (recommended_price >= 0),
  method varchar(50) NOT NULL, -- e.g. 'fuzzy_tsukamoto_v1', 'cost_plus_baseline'
  calculated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_price_recommendation_item_calculated ON price_recommendation (order_item_id, calculated_at DESC);
CREATE INDEX idx_price_recommendation_method ON price_recommendation (method);

CREATE TABLE sales_forecast (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES product (id) ON DELETE CASCADE,
  forecast_date date NOT NULL,
  recommended_quantity decimal(14,3) NOT NULL CHECK (recommended_quantity >= 0),
  confidence_score decimal(5,4) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  method varchar(50) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, forecast_date)
);
CREATE INDEX idx_sales_forecast_date ON sales_forecast (forecast_date);

-- ==========================================================
-- MARKETING & CONTENT
-- ==========================================================

CREATE TABLE content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title varchar(255) NOT NULL,
  content text NOT NULL,
  platform varchar(50) NOT NULL,
  status content_status NOT NULL DEFAULT 'planned',
  scheduled_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_content_scheduled_date ON content (scheduled_date) WHERE status = 'planned';
CREATE TRIGGER trg_content_updated_at BEFORE UPDATE ON content
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE value_proposition_template (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title varchar(255) NOT NULL,
  content text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE product_value_proposition (
  product_id uuid NOT NULL REFERENCES product (id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES value_proposition_template (id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, template_id)
);
CREATE INDEX idx_pvp_template ON product_value_proposition (template_id);

CREATE TABLE portfolio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES product (id) ON DELETE CASCADE,
  description text,
  image_url text NOT NULL,
  work_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_portfolio_product_date ON portfolio (product_id, work_date DESC);

-- ==========================================================
-- END OF SCHEMA
-- ==========================================================
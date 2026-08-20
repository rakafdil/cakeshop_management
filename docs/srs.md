# Software Requirements Specification (SRS)
## Integrated Business Management Platform for a Home-Based Premium Artisan Bakery Business

**Version:** 1.0
**Date:** August 4, 2026
**Prepared by:** Business Analyst / Requirements Engineer

---

## 1. Project Overview & Scope

### 1.1 Purpose
This document specifies the requirements for a software platform intended to support a solo-operated (or micro-team) premium/artisan bakery business — specialized in custom cakes ("kue tart custom") and batch-produced baked goods — across four operational domains: production/inventory, finance/analytics, order/customer management, and marketing/positioning.

### 1.2 Business Context
The business is currently run by a single owner-operator who occasionally recruits temporary staff during high-demand periods. Operations are manual and fragmented: pricing is not adjusted systematically for ingredient cost fluctuation, recipes are undocumented, financial tracking is informal, order communication is scattered across personal chat channels, and marketing lacks a systematic value-communication strategy for premium positioning.

### 1.3 Scope
The system shall provide four integrated modules:
1. **Production & Inventory Management** — recipe standardization, ingredient cost tracking, batch-vs-unit production workflows.
2. **Financial & Business Analytics** — cash flow tracking, real HPP (COGS) calculation, pricing recommendations, demand forecasting support.
3. **Order Management & Customer Screening** — centralized order intake, self-service order tracking, budget/specification screening.
4. **Marketing & Value Communication** — content planning, value-proposition education material, market-segment targeting.

### 1.4 Primary Users
- **Owner/Admin** — full system access.
- **Temporary Staff** — restricted, role-based access (e.g., recipe execution view, production checklist) during peak periods.
- **Customer** — limited external access via order tracking link/portal; no login account required by default.

### 1.5 Out-of-Scope Summary
Tax/government accounting integration, payment gateway automation, third-party marketplace integration, and multi-branch support are excluded from this phase (see Section 5).

---

## 2. Functional Requirements

Each requirement is uniquely identified, testable, and expressed as a system obligation ("The system shall...").

### 2.1 Module A — Production & Inventory Management (PIM)

| ID | Requirement | Acceptance Criteria |
|---|---|---|
| FR-PIM-01 | The system shall allow the Admin to record and update raw material prices, with each update timestamped. | Given a price update is saved, the ingredient's price history log contains the new value, date, and previous value. |
| FR-PIM-02 | The system shall automatically recalculate the cost of every recipe using that ingredient whenever its price changes. | Given ingredient X's price changes, all recipes referencing X show updated cost within the same session without manual recalculation. |
| FR-PIM-03 | The system shall provide a digital recipe repository storing ingredients, quantities, preparation steps, required tools, difficulty level, and reference photos for each product. | A recipe cannot be marked "complete" unless all mandatory fields (ingredients, steps, quantities) are filled. |
| FR-PIM-04 | The system shall support role-based visibility of recipe data, allowing the Admin to hide cost/pricing fields from Temporary Staff accounts while showing preparation steps. | Given a Temporary Staff login, cost and price fields are not rendered or retrievable via any accessible view. |
| FR-PIM-05 | The system shall allow the Admin to designate each product as either "Batch Production" (fixed batch size, e.g., multiples of 12) or "Unit/Custom Production" (e.g., custom cakes). | A batch-type product cannot be ordered in a quantity that is not a multiple of its defined batch size without an explicit Admin override flag. |
| FR-PIM-06 | The system shall track raw material stock levels, decrementing stock automatically when a production run or order is confirmed. | Given a confirmed order consumes ingredient X, the recorded stock of X decreases by the exact recipe-defined quantity. |
| FR-PIM-07 | The system shall generate a low-stock alert when an ingredient's quantity falls below a configurable threshold. | Given stock of ingredient X falls below its threshold, an alert is visible on the Admin dashboard within 5 minutes of the stock update. |
| FR-PIM-08 | The system shall support unit conversion (e.g., grams ↔ kilograms, ml ↔ liters) when recipe units differ from purchase units. | Given a recipe requires 250g and the ingredient is purchased in kg, the system correctly deducts 0.25 kg from stock. |

### 2.2 Module B — Financial & Business Analytics (FBA)

| ID | Requirement | Acceptance Criteria |
|---|---|---|
| FR-FBA-01 | The system shall allow the Admin to record income and expense transactions, each categorized (e.g., ingredients, tools, marketing, labor). | Every recorded transaction requires a category, amount, and date before it can be saved. |
| FR-FBA-02 | The system shall calculate real Cost of Goods Sold (HPP) per product including: raw material cost, labor cost (time × rate), tool depreciation (allocated per use), a complexity multiplier, and a configurable failure/risk buffer percentage. | Given all five cost components are defined for a product, the system outputs a single HPP value equal to their sum, and this value is recalculated whenever any component changes. |
| FR-FBA-03 | The system shall generate a profit/loss report filterable by date range, product, and order. | Given a selected date range, the report total equals (sum of recorded income) minus (sum of recorded expenses and COGS) for that range, verifiable against underlying transactions. |
| FR-FBA-04 | The system shall recommend a minimum sell price per product based on HPP and a target margin percentage set by the Admin. | Given HPP = X and target margin = Y%, the recommended price equals X ÷ (1 − Y%), displayed whenever HPP or margin changes. |
| FR-FBA-05 | The system shall record and display historical order data (product, quantity, date) to support demand analysis. | Given at least 30 days of order history, the system displays a ranked list of best-selling products by quantity and by period. |
| FR-FBA-06 | The system shall provide a daily ready-stock quantity suggestion per product based on historical sales data, using a defined statistical method (e.g., moving average) with a visible confidence indicator. | Given historical sales data exists for a product, the system outputs a numeric suggested quantity and does not output a suggestion if fewer than a configurable minimum number of historical data points exist. |
| FR-FBA-07 | The system shall allow the Admin to flag each product as "Pre-Order Only," "Ready Stock," or "Hybrid," and enforce ordering rules accordingly. | A customer cannot place an order for a "Pre-Order Only" product without selecting a future fulfillment date beyond the configured lead time. |
| FR-FBA-08 | The system shall export financial reports (profit/loss, HPP breakdown, sales history) in PDF and Excel formats. | Given an export request, a file is generated containing all records matching the applied filter, downloadable within 10 seconds for datasets under 10,000 rows. |

### 2.3 Module C — Order Management & Customer Screening (OCS)

| ID | Requirement | Acceptance Criteria |
|---|---|---|
| FR-OCS-01 | The system shall provide a single order-intake interface where the Admin can log orders regardless of the originating communication channel (WhatsApp, Instagram, walk-in, etc.). | Every order record contains a mandatory "source channel" field, and all orders are retrievable from one unified order list. |
| FR-OCS-02 | The system shall assign each order a status from a defined set (e.g., Received, Confirmed, In Production, Ready, Out for Delivery, Completed, Cancelled) and log the timestamp of each status change. | Given a status change, the order's status history log gains one new entry with old status, new status, and timestamp. |
| FR-OCS-03 | The system shall generate a unique, shareable order-tracking link that displays the current order status to the customer without requiring login. | Given a valid tracking link, an unauthenticated user can view the current status and estimated completion date, and cannot view other customers' orders. |
| FR-OCS-04 | The system shall send an automated notification (e.g., WhatsApp message or email) to the customer whenever the order status changes. | Given a status change event, a notification is dispatched within 2 minutes and a delivery log entry is recorded. |
| FR-OCS-05 | The system shall maintain a customer profile storing contact information and complete order history. | Given a returning customer's phone number/email, the system retrieves all past orders linked to that identifier. |
| FR-OCS-06 | The system shall apply a configurable screening rule that flags an order for manual Admin review when the requested product specification tier (e.g., "Premium Custom") exceeds the customer's stated budget threshold. | Given a customer selects "Premium Custom" tier and enters a budget below the tier's defined minimum price, the order is automatically tagged "Requires Review" and cannot proceed to "Confirmed" status without Admin approval. |
| FR-OCS-07 | The system shall attach a timestamped, versioned snapshot of the pricelist that was active at the moment an order was created, and store it with the order record. | Given the pricelist is later updated, previously created orders continue to display the pricelist version in effect at their creation time. |
| FR-OCS-08 | The system shall send an automated reminder to a customer who has not responded within a configurable time window (e.g., 24 hours) prior to a required action (e.g., final confirmation or payment). | Given no customer response after the configured window, exactly one reminder notification is sent and logged. |
| FR-OCS-09 | The system shall allow the Admin to release a reserved production slot back to availability if a customer remains unresponsive after a second configurable deadline. | Given the second deadline passes without customer response, the order status changes to "Cancelled – No Response" and the associated production slot becomes bookable by other orders. |
| FR-OCS-10 | The system shall allow the Admin to schedule delivery or pickup date/time per order, checked against production capacity. | An order's delivery date cannot be saved if it falls before the minimum lead time defined for that product type. |

### 2.4 Module D — Marketing & Value Communication (MVC)

| ID | Requirement | Acceptance Criteria |
|---|---|---|
| FR-MVC-01 | The system shall provide a content calendar where the Admin can schedule marketing posts/tasks with date, platform, and status (Planned, Posted, Skipped). | Given a scheduled item's date arrives, it appears in a "Due Today" view on the dashboard. |
| FR-MVC-02 | The system shall provide a library of reusable value-proposition templates (text explaining premium ingredient sourcing, craftsmanship, and production time) that the Admin can attach to product listings or order confirmations. | Given a template is attached to a product, it is rendered on that product's customer-facing page. |
| FR-MVC-03 | The system shall allow products to be tagged by target market segment (e.g., "Premium/Artisan," "Everyday/Budget") for filtering and reporting. | Given a segment filter is applied to the catalog view, only products carrying that tag are displayed. |
| FR-MVC-04 | The system shall automatically attach the relevant value-proposition content to order confirmation messages for products tagged "Premium/Artisan." | Given an order for a Premium/Artisan-tagged product is confirmed, the confirmation notification includes the associated value-proposition text. |
| FR-MVC-05 | The system shall maintain a portfolio/catalog view of past work (photos, descriptions) filterable by product category and date. | Given a catalog filter by category, only matching portfolio entries are displayed, sorted by date descending by default. |

---

## 3. Non-Functional Requirements

### 3.1 Performance
- **NFR-PERF-01:** The system shall load the Admin dashboard within 3 seconds on a 4G mobile connection under normal load (≤ 5 concurrent users).
- **NFR-PERF-02:** HPP and pricing recalculations (FR-FBA-02, FR-FBA-04) shall complete and display within 2 seconds of a triggering input change.
- **NFR-PERF-03:** Customer-facing order-tracking pages (FR-OCS-03) shall load within 3 seconds on a standard 4G connection.

### 3.2 Security
- **NFR-SEC-01:** The system shall enforce role-based access control (Admin vs. Temporary Staff) on every module, with unauthorized access attempts logged and rejected (HTTP 403 or equivalent).
- **NFR-SEC-02:** Customer order-tracking links (FR-OCS-03) shall use non-sequential, non-guessable identifiers (minimum 128-bit entropy) to prevent unauthorized access to other customers' orders.
- **NFR-SEC-03:** All personally identifiable customer data (name, phone, address) shall be encrypted at rest (AES-256 or equivalent) and in transit (TLS 1.2+).
- **NFR-SEC-04:** The system shall require authentication (e.g., password or OTP) for all Admin and Temporary Staff accounts, with session timeout after 30 minutes of inactivity.

### 3.3 Scalability
- **NFR-SCA-01:** The system shall support at least 10 concurrent Temporary Staff accounts without degradation of response times defined in NFR-PERF-01.
- **NFR-SCA-02:** The system shall support a product/recipe catalog of at least 500 items and an order history of at least 50,000 records without query response times exceeding 3 seconds.

### 3.4 Reliability & Availability
- **NFR-REL-01:** The system shall maintain 99% uptime measured monthly, excluding scheduled maintenance windows communicated at least 24 hours in advance.
- **NFR-REL-02:** The system shall perform automated daily backups of all transactional and financial data, retained for a minimum of 30 days.
- **NFR-REL-03:** In the event of a failed automated notification (FR-OCS-04, FR-FBA/OCS reminders), the system shall retry delivery at least twice within 15 minutes and log final delivery status.

### 3.5 Usability
- **NFR-USA-01:** The Admin and Staff interfaces shall be optimized for mobile-first use (responsive design, minimum supported viewport width 360px).
- **NFR-USA-02:** The primary interface language shall be Bahasa Indonesia, with all currency values displayed in Indonesian Rupiah (IDR) and dates in DD/MM/YYYY format.
- **NFR-USA-03:** Core daily tasks (recording a transaction, updating an order status, checking stock) shall each be completable in no more than 3 user actions (taps/clicks) from the dashboard.

### 3.6 Maintainability
- **NFR-MAINT-01:** The system's pricing, screening threshold, and notification-timing rules (FR-FBA-04, FR-OCS-06, FR-OCS-08/09) shall be configurable by the Admin through settings screens, without requiring code changes or developer intervention.

### 3.7 Compliance
- **NFR-COMP-01:** The system shall handle customer personal data in accordance with Indonesia's Personal Data Protection Law (UU PDP No. 27/2022), including providing a mechanism for data deletion upon customer request.

---

## 4. Constraints & Assumptions

### 4.1 Constraints
- **C-01:** The business is operated by a single primary Admin; the system must not assume multiple concurrent decision-makers or approval chains.
- **C-02:** Custom cake ("kue tart custom") products are always unit-based and are exempt from batch-size enforcement (FR-PIM-05).
- **C-03:** Temporary Staff are added and removed on an ad hoc, short-term basis; account provisioning must be lightweight (no lengthy onboarding workflow required).
- **C-04:** All monetary values are handled exclusively in Indonesian Rupiah (IDR); multi-currency support is not required.

### 4.2 Assumptions
- **A-01:** Users (Admin, Staff, and Customers) have access to a smartphone with an internet connection; a native mobile app is not assumed to be required if a responsive web application is provided.
- **A-02:** WhatsApp is assumed to be the primary external notification channel; integration is assumed feasible via WhatsApp Business API or an equivalent third-party messaging gateway.
- **A-03:** Order payments are assumed to be handled outside the system (e.g., bank transfer with manual proof-of-payment upload) for this phase; no payment gateway is integrated (see Section 5).
- **A-04:** Historical sales data needed for demand forecasting (FR-FBA-06) will be accumulated within the system itself; no legacy data migration is assumed at launch, so forecasting features may be inactive during an initial data-collection period.
- **A-05:** The business operates in a single location/timezone (WIB, UTC+7); multi-branch or multi-timezone operation is not assumed.

---

## 5. Out of Scope

The following items are explicitly excluded from this phase of the system:

1. **Government tax/accounting integration** — e-filing, tax computation, or integration with government fiscal systems.
2. **Automated payment gateway processing** — the system will support manual payment proof upload only; real-time payment gateway (e.g., virtual account, e-wallet auto-verification) integration is excluded.
3. **Third-party marketplace integration** — no automated syncing with platforms such as GoFood, ShopeeFood, or Instagram Shop.
4. **Multi-branch / multi-tenant business support** — the system is designed for a single business location and single Admin ownership.
5. **AI-based image/design generation** — the system provides content-planning and template tools only; it does not replace professional graphic design or generate marketing visuals/videos.
6. **IoT-based inventory automation** — no integration with smart scales, barcode/RFID scanning hardware, or automated stock-counting devices.
7. **Full HR/payroll system** — Temporary Staff management is limited to task/recipe access and basic scheduling; payroll processing, tax withholding, and formal employment records are excluded.
8. **Native mobile applications (iOS/Android)** — the initial release is assumed to be a responsive web application; dedicated native apps are excluded from this phase.

---

*End of Document*
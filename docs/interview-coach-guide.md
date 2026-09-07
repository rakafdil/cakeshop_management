# Interview Coach & Technical Defense Handbook

> **Purpose**: A structured review and mock-interview system for each module of the Cakeshop Management platform.  
> **Target Roles**: Fullstack / Backend Software Engineer (Node/TypeScript/PostgreSQL/React)  
> **Methodology**: Technical audit, architectural defense, edge-case grilling, and STAR storytelling.

---

## 1. How to Trigger a Module Review

When you complete a module or phase, start a new chat turn or run:

```text
/coach review module [A | B | C | D | devsecops | deployment]
```
*(Or simply prompt: `Hey coach, I have completed Module A. Please inspect my code and grill me on my implementation.`)*

The AI will act as a **Senior Staff Engineer / Hiring Manager** and execute this 4-step protocol:
1. **Automated Code & Test Verification**: Inspect your code files, run `bun run test` on the module's test suite, and check `bun run typecheck`.
2. **Architectural Grilling (3–5 Questions)**: Challenge you on race conditions, design trade-offs, security vulnerabilities, and database schema decisions.
3. **Live Coding Challenge / Edge Case**: Present a surprise failure scenario (e.g. "The supplier doubled butter prices while an active order was in production—what happens?").
4. **Scorecard & Feedback**: Score your performance using the 5-dimensional rubric below.

---

## 2. 5-Dimensional Evaluation Rubric

Every review is graded on a scale of 1 to 5 across 5 core competencies:

| Dimension | 1 - Novice | 3 - Competent (Mid) | 5 - Staff / Senior |
| --- | --- | --- | --- |
| **1. Ponytail Architecture** | Cluttered with 5 unnecessary interface layers, bloated dependencies. | Clean separation; minimal boilerplate; direct Drizzle queries. | Zero speculative code; standard library first; minimal diff. |
| **2. Correctness & Concurrency** | Ignores race conditions; floating-point money bugs. | Handles basic transactions; schema constraints protect data. | Uses `FOR UPDATE` locks; atomic rollbacks; strict idempotent logic. |
| **3. DevSecOps & Security** | Raw IDs exposed; no RBAC; ignores CSRF/XSS. | Uses Zod validation; httpOnly cookies; basic RBAC check. | Zero IDOR risk; strict least privilege; timing-safe comparisons; audit trail. |
| **4. Modern Web Standards** | Bloated UI libraries; `<div>` soup; unoptimized images. | Semantic HTML; responsive Tailwind layout; basic forms. | Native `<dialog>`, `:user-valid` forms, View Transitions, CWV-optimized. |
| **5. Technical Defense & STAR** | Memorized definitions; cannot explain trade-offs. | Explains how the code works and basic decisions. | Articulates trade-offs with business impact; structured STAR stories. |

---

## 3. Module-by-Module Grill Banks

### Module A: Production & Inventory Management (PIM)
*Focus: Relational Schemas, Atomic Transactions, Unit Conversions, RBAC.*

1. **Concurrency & Race Conditions**:
   > *"If two customer orders for 10 custom cakes arrive at the exact same second and you only have 500g of butter left in stock, how does your implementation prevent negative inventory?"*
   - **Ideal Answer**: Emphasize PostgreSQL database transactions (`db.transaction`) with pessimistic locking (`SELECT ... FOR UPDATE`) or a check constraint (`CHECK (stock_quantity >= 0)`) rather than checking quantity in application memory.
2. **Immutable Audit Trails**:
   > *"Why did you create a dedicated `price_history` table instead of just an `updated_at` timestamp on the ingredients table?"*
   - **Ideal Answer**: Financial traceability. Recipes and orders need historical cost integrity. Updating in-place destroys auditability and corrupts past profit calculations.
3. **Floating-Point Precision**:
   > *"How do you prevent IEEE 754 floating-point errors (e.g. 0.1 + 0.2 = 0.30000000000000004) when converting grams to kilograms and multiplying by price?"*
   - **Ideal Answer**: Store monetary values as integers (cents/rupiah) or PostgreSQL `numeric/decimal`, and handle unit conversions with precise integer scaling.
4. **Security & Information Hiding (FR-PIM-04)**:
   > *"How do you prevent a temporary baker staff member from inspecting raw ingredient costs via DevTools or API responses?"*
   - **Ideal Answer**: Backend projection filtering. RBAC middleware scrubs financial fields before serialization. Never rely on CSS `display: none` on the frontend.

---

### Module C: Order Management & Customer Screening (OCS)
*Focus: State Machines, Unauthenticated Security, IDOR Defense, JSONB Snapshots.*

1. **Unauthenticated Access & Token Entropy (FR-OCS-03, NFR-SEC-02)**:
   > *"Your customer order tracking portal requires no login. How do you prevent an attacker from brute-forcing URLs to view all customer names and addresses?"*
   - **Ideal Answer**: Use cryptographically secure 24-byte random tokens (`gen_random_bytes(24)` / 192 bits of entropy), which makes enumeration mathematically impossible ($2^{192}$ keyspace). Never use sequential auto-increment IDs.
2. **IDOR (Insecure Direct Object Reference)**:
   > *"What data does `GET /api/tracking/:token` return? Could an attacker extract customer phone numbers or order history?"*
   - **Ideal Answer**: Public endpoints return a strict Public Order DTO (status, cake type, pickup date) and completely omit customer PII, addresses, or admin notes.
3. **Data Immutability via Pricelist Snapshots (FR-OCS-07)**:
   > *"If the bakery raises cake prices by 20% next month, what happens to existing unpaid or pending orders? How is this represented in PostgreSQL?"*
   - **Ideal Answer**: An order stores a versioned snapshot of the active pricelist at the moment of order intake (stored as immutable JSONB in `orders.pricelist_snapshot`).
4. **State Machine Integrity (FR-OCS-02)**:
   > *"Can an order jump directly from 'Received' to 'Completed'? How does your code enforce allowable state transitions?"*
   - **Ideal Answer**: A transition lookup map (`const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]>`) validates every state change. Invalid transitions throw a 400 Bad Request error.

---

### Module B: Financial & Business Analytics (FBA)
*Focus: Business Math, Cost of Goods Sold (COGS/HPP), Data Aggregations, Forecasting.*

1. **The Real HPP Formula (FR-FBA-02)**:
   > *"Most junior developers calculate food cost as just ingredient costs. Why is that flawed in an artisan bakery, and what did you include in your real HPP engine?"*
   - **Ideal Answer**: Artisan cakes have high labor and failure risk. Real HPP = Raw Materials + (Labor Time × Hourly Rate) + Tool Depreciation Allocation + Complexity Multiplier + Failure Buffer (e.g. 5-10% cake collapse risk).
2. **High-Performance Aggregations (FR-FBA-03)**:
   > *"When generating a 12-month Profit/Loss report, do you load all transactions into JavaScript memory to sum them, or do you do it in PostgreSQL? Why?"*
   - **Ideal Answer**: Push compute to PostgreSQL using `SUM()`, `date_trunc('month', date)`, and `GROUP BY`. Loading thousands of records into Node/Bun wastes memory and creates GC pauses.
3. **Statistical Forecasting (FR-FBA-06)**:
   > *"How does your daily stock suggestion algorithm work, and how do you prevent bad recommendations when historical data is sparse?"*
   - **Ideal Answer**: Weighted moving average of the last 30 days with a confidence threshold. If fewer than $N$ data points exist, the system gracefully withholds a suggestion and marks status as `Insufficient Data`.

---

### Module D: Marketing & Value Communication (MVC)
*Focus: Modern Frontend Engineering, Web Performance, Zero-Bloat UI.*

1. **Zero-Dependency Modern Web UI**:
   > *"Why did you use native HTML `<dialog>` and the Popover API instead of Radix UI or headless modal libraries?"*
   - **Ideal Answer**: Following the Ponytail and Modern Web Guidance principles: native `<dialog>` handles focus trapping, `Escape` key listeners, and backdrop rendering natively with zero JavaScript bundle overhead and 100% browser accessibility.
2. **Core Web Vitals & Image Optimization**:
   > *"How do you ensure the public cake portfolio loads in under 2 seconds on a slow 4G connection?"*
   - **Ideal Answer**: Next.js `<Image>` with responsive `sizes`, modern WebP/AVIF formats, `fetchpriority="high"` for the LCP candidate, and CSS `content-visibility: auto` for off-screen gallery items.

---

### DevSecOps & Cloud Architecture Defense
*Focus: Cloudflare Workers, Vercel, Neon PostgreSQL, CI/CD Security.*

1. **Serverless Architecture & Cold Starts**:
   > *"Why deploy the Hono API to Cloudflare Workers instead of a traditional VPS with Docker?"*
   - **Ideal Answer**: Cloudflare Workers run on V8 isolates at 300+ edge locations worldwide with near-zero cold starts (<5ms) compared to containerized Node.js (500ms–2s), and offer a generous free tier of 100,000 requests/day.
2. **Serverless Database Connection Pooling**:
   > *"Cloudflare Workers scale to hundreds of concurrent requests. How do you prevent exhausting PostgreSQL's max connections?"*
   - **Ideal Answer**: Neon Serverless PostgreSQL provides built-in connection pooling over WebSockets/HTTP using PgBouncer, preventing connection pool exhaustion from ephemeral edge isolates.
3. **CSRF Defense with JWTs**:
   > *"If you store JWTs in httpOnly cookies, how do you prevent Cross-Site Request Forgery?"*
   - **Ideal Answer**: Custom double-submit cookie / custom header pattern. State-changing requests (POST/PUT/DELETE) must supply a matching `x-csrf-token` header, which third-party sites cannot read due to the Same-Origin Policy.

---

## 4. STAR Storybank Template for Your Portfolio

Use this structure when asked behavioral or technical interview questions:

```markdown
### Story 1: Concurrency Bug & Race Condition in Ingredient Inventory
- **Situation**: During peak holiday pre-orders, two simultaneous custom cake orders claimed the same remaining 1kg of high-grade Belgian chocolate.
- **Task**: Prevent inventory from dipping into negative values and guarantee atomic consistency without degrading API throughput.
- **Action**: Implemented PostgreSQL row-level pessimistic locking (`SELECT ... FOR UPDATE`) inside a Drizzle ORM transaction. Added a concurrent stress test with Bun test asserting only one transaction succeeds while the other safely receives an 'Insufficient Stock' error.
- **Result**: Zero data inconsistency, eliminated inventory drift, and wrote an automated test proving concurrency safety.
```

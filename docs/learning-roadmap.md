# 6-Month Hand-Coding & Technical Interview Mastery Roadmap

> **Target Role**: Fullstack / Backend Software Engineer (Node/TypeScript/React)  
> **Weekly Cadence**: 7–10 hours/week (approx. 90 minutes/day, 5–6 days/week)  
> **Total Timeline**: 24 Weeks (4 Months Vertical Slices + 2 Months DevSecOps, Free Deployment & Interview Defense)  
> **Philosophy**: Ponytail Simplicity (anti-bloat, stdlib/native first) + Active Hand-Typing (zero autocomplete) + Modern Web Guidance

---

## 1. Core Operating Principles

### A. Active Hand-Coding Rule (No Autocomplete / No Ghost Text)
1. **Disable AI inline suggestions** (GitHub Copilot, Cursor Ghost text, or Tab-nine) for business logic, database queries, and route handlers.
2. **Type every character by hand**: imports, types, Zod schemas, SQL migrations, Drizzle operators (`eq`, `and`, `sql`), Hono routes, and React components.
3. **Compiler as the Teacher**: Rely on `bun run typecheck` (`tsc --noEmit`) and TypeScript error squiggles to understand structural typing, nullability, and generics.
4. **Active Documentation**: When a syntax error occurs, read the official TypeScript, Drizzle, or Hono docs before seeking AI explanations.

### B. The Ponytail Simplicity Filter
- **No speculative abstractions**: Do not write generic repository patterns or abstract service interfaces for a single PostgreSQL database.
- **Direct data flow**: `Hono Route Handler → Zod Validation (zValid) → Drizzle Query / Pure Domain Function → HTTP Response`.
- **Native Platform First**: Prefer native Web APIs (`fetch`, `crypto.randomUUID`, HTML5 `<dialog>`, `:user-valid`, Popover API) over npm bloat.

### C. DevSecOps From Day One
- Security is not an afterthought. Every module integrates input validation, least-privilege RBAC, parameterized queries against SQL injection, CSRF protection, and automated CI scans.

---

## 2. Daily 90-Minute Hand-Coding Routine

| Segment | Duration | Activity | Purpose |
| --- | --- | --- | --- |
| **Warm-up & Review** | 10 mins | Review previous day's git diff and read target SRS acceptance criteria (`docs/srs.md`). | Context switching & recall. |
| **Active Hand-Coding** | 50 mins | Hand-code tests (`bun test`) or implement domain logic/handlers. Zero copy-paste. | Syntax muscle memory & algorithmic thinking. |
| **Compiler & Test Validation** | 20 mins | Run `bun run typecheck` and `bun run test`. Debug compiler errors manually. | Deep structural understanding of types and edge cases. |
| **Log & Commit** | 10 mins | Write a 3-bullet entry in your study journal, commit with clean conventional commits. | Interview reflection & documentation habit. |

---

## 3. The 24-Week Detailed Syllabus

### Phase 1: Foundations & Module A — Production & Inventory Management (Weeks 1–4)
*Goal: Master relational schemas, transactional inventory balance, and unit conversions.*

* **Week 1: Drizzle ORM Syntax & Raw Material Tracking (FR-PIM-01, FR-PIM-08)**
  - *Hand-Coding Focus*: Drizzle schemas (`packages/database/schema.ts`), timestamped price history table, floating-point vs decimal precision for currency.
  - *Syntax Drill*: Unit conversion functions (`grams ↔ kg`, `ml ↔ L`) using TypeScript enums and record maps.
  - *DevSecOps*: Zod schema boundary validation on all numeric price inputs to reject negative or NaN numbers.
* **Week 2: Dynamic Cost Calculation & Batch Logic (FR-PIM-02, FR-PIM-03, FR-PIM-05)**
  - *Hand-Coding Focus*: Recursive recipe cost recalculation when an ingredient price changes. Implementing batch multiplier rules (`qty % batch_size === 0`).
  - *Syntax Drill*: Array methods (`.reduce()`, `.map()`, `Promise.all()`) for aggregating multi-ingredient recipe costs.
* **Week 3: Inventory Deductions & Low-Stock Alerts (FR-PIM-06, FR-PIM-07, FR-PIM-04)**
  - *Hand-Coding Focus*: Atomic inventory decrements inside PostgreSQL transactions (`db.transaction()`). Stock alert triggers.
  - *DevSecOps*: RBAC enforcement: Temporary Staff cannot view ingredient prices or recipe HPP fields (`NFR-SEC-01`).
* **Week 4: Next.js PIM Dashboard & Modern Web UI**
  - *Frontend Focus*: Native HTML tables, `<dialog>` modal for recipe creation, CSS `:user-invalid` for form validation.
  - *Interview Milestone*: **Module A Technical Review & Mock Interview** (See `docs/interview-coach-guide.md`).

---

### Phase 2: Module C — Order Management & Customer Screening (Weeks 5–8)
*Goal: State machines, unauthenticated public security, and automated screening algorithms.*

* **Week 5: Unified Order Intake & State Machine (FR-OCS-01, FR-OCS-02)**
  - *Hand-Coding Focus*: Order intake API supporting multiple channels (`WhatsApp`, `Instagram`, `Walk-in`). Deterministic state transitions (`Received` → `Confirmed` → `In Production` → `Ready` → `Completed` / `Cancelled`).
  - *Syntax Drill*: TypeScript discriminated unions for strict state transition guards.
* **Week 6: Unauthenticated Public Tracking Tokens (FR-OCS-03, FR-OCS-05)**
  - *Hand-Coding Focus*: Cryptographically secure token generation (`crypto.getRandomValues`) with ≥128-bit entropy (`NFR-SEC-02`).
  - *DevSecOps*: Prevent IDOR (Insecure Direct Object Reference). Public tracking page only exposes safe fields (status, delivery estimate); never exposes customer PII or pricing margins.
* **Week 7: Budget Screening Rules & Snapshot Pricelists (FR-OCS-06, FR-OCS-07, FR-OCS-10)**
  - *Hand-Coding Focus*: Rule-based screening flag: tag orders as `Requires Review` if customer budget < minimum tier price. Versioned snapshot pricelist stored as JSONB with each order.
  - *Syntax Drill*: Deep object cloning and JSONB immutability in Drizzle/Postgres.
* **Week 8: Next.js Order Intake & Live Customer Tracking Portal**
  - *Frontend Focus*: Responsive order tracking card, accessible status indicators with ARIA live regions, View Transitions API for state changes.
  - *Interview Milestone*: **Module C Technical Review & Mock Interview** (Handling public endpoints & IDOR protection).

---

### Phase 3: Module B — Financial & Business Analytics (Weeks 9–12)
*Goal: Complex business math, aggregation pipelines, and statistical forecasting.*

* **Week 9: Double-Entry Transaction Ledger (FR-FBA-01)**
  - *Hand-Coding Focus*: Cash-flow transaction ledger (`income` vs `expense`), categorized by ingredient, tools, marketing, and labor.
  - *Syntax Drill*: SQL aggregate functions with Drizzle: `SUM`, `COUNT`, `date_trunc` for daily/monthly grouping.
* **Week 10: Real HPP (COGS) Engine & Margin Pricing (FR-FBA-02, FR-FBA-04)**
  - *Hand-Coding Focus*: Pure TypeScript calculation engine implementing:  
    $$\text{HPP} = \text{Raw Materials} + (\text{Labor Time} \times \text{Rate}) + \text{Tool Depreciation} + \text{Complexity Multiplier} + \text{Risk Buffer}$$
    Recommended price calculation: $\text{Price} = \frac{\text{HPP}}{1 - \text{Target Margin}}$.
* **Week 11: Profit/Loss Engine & Ready-Stock Forecasting (FR-FBA-03, FR-FBA-05, FR-FBA-06)**
  - *Hand-Coding Focus*: Moving-average demand forecasting with configurable confidence intervals based on historical 30-day order trends.
* **Week 12: Next.js Financial Analytics Dashboard & CSV Export (FR-FBA-08)**
  - *Frontend Focus*: Lightweight SVG / CSS charts (no bloated chart libraries), streaming CSV export response.
  - *Interview Milestone*: **Module B Technical Review & Mock Interview** (Floating-point precision, aggregations, and business logic testing).

---

### Phase 4: Module D — Marketing & Value Communication & Integration (Weeks 13–16)
*Goal: Content workflows, end-to-end integration, and portfolio showcases.*

* **Week 13: Content Calendar & Task Scheduling (FR-MVC-01)**
  - *Hand-Coding Focus*: Scheduled post registry, daily due query using PostgreSQL timezone offsets.
* **Week 14: Value-Proposition Templating (FR-MVC-02, FR-MVC-03, FR-MVC-04)**
  - *Hand-Coding Focus*: Segment-based automated templating (attaching artisan ingredient origin notes to premium orders).
* **Week 15: Public Showcase Portfolio with Modern Filtering (FR-MVC-05)**
  - *Frontend Focus*: CSS subgrid and container queries for adaptive cake gallery, responsive image optimization with `Fetch priority`.
* **Week 16: Cross-Module Integration & End-to-End Testing**
  - *Hand-Coding Focus*: End-to-end user journeys using Bun test: Order Placed → Inventory Deducted → HPP Recorded → Profit Calculated.
  - *Interview Milestone*: **Module D & Full MVP Architecture Defense**.

---

### Phase 5: DevSecOps Hardening & Concurrency Engineering (Weeks 17–20)
*Goal: Production reliability, security posture, and database optimization.*

* **Week 17: Concurrency & Database Race Condition Hardening**
  - *Hand-Coding Focus*: Row-level locking (`FOR UPDATE`) in PostgreSQL when deducting inventory to eliminate race conditions under concurrent orders.
  - *DevSecOps*: Writing concurrent stress tests with Bun test (`Promise.all`) simulating 50 simultaneous orders on low stock.
* **Week 18: Security Audit & Automated SAST Pipeline**
  - *DevSecOps*: GitHub Actions workflow setup (`.github/workflows/ci.yml`). Integrate `bun audit`, Semgrep SAST scan, Gitleaks secret detection, and strict CSP headers.
* **Week 19: Session Security & Authentication Hardening**
  - *DevSecOps*: Inactivity session timeout (30 min), server-side session revocation in Postgres, secure cookie attributes (`SameSite=Lax`, `httpOnly`, `Secure`).
* **Week 20: Performance Tuning & Core Web Vitals (CWV)**
  - *Optimization*: Reduce API response time to <100ms, optimize Next.js LCP and INP, implement HTTP Cache-Control and ETag headers.

---

### Phase 6: Zero-Cost Deployment & Technical Interview Showcase (Weeks 21–24)
*Goal: Live production deployment and rock-solid interview storytelling.*

* **Week 21: Free-Tier Serverless Database Setup (Neon PostgreSQL)**
  - *Infrastructure*: Provision free Neon PostgreSQL database, configure pooled connection string, run migrations via GitHub Actions.
* **Week 22: Live Production Deployment (Cloudflare Workers + Vercel)**
  - *Deployment*: Deploy Hono REST API to Cloudflare Workers (or Vercel Serverless), deploy Next.js frontend to Vercel Hobby tier. Connect custom domain / HTTPS.
* **Week 23: Portfolio Case Study & Architecture Documentation**
  - *Portfolio*: Write comprehensive `ARCHITECTURE.md` case study highlighting key engineering decisions (why Hono over NestJS, Drizzle over Prisma, Ponytail simplicity, DevSecOps pipeline).
* **Week 24: Final Mock Technical Interviews & Storybank Drills**
  - *Interview Drills*: Full system design mock interview, behavioral STAR stories, live code defense against tough interviewers.

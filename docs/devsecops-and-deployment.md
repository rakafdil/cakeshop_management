# DevSecOps & Zero-Cost Cloud Deployment Guide

> **Target Architecture**:  
> - **Frontend**: Next.js 15 on **Vercel** (Hobby Free Tier)  
> - **Backend API**: Hono (TypeScript) on **Cloudflare Workers** (Free Tier: 100,000 req/day) or Vercel Serverless  
> - **Database**: **Neon Serverless PostgreSQL** (Free Tier: 0.5GB, pooled connection over WebSockets)  
> - **CI/CD & Security**: **GitHub Actions** (2,000 free runner minutes/month) with SAST & Secret Scanning  
> **Total Monthly Cost**: **$0.00 / month**

---

## 1. DevSecOps Architecture & Pipeline

DevSecOps ensures code quality, dependency health, and vulnerability scanning are automated on every commit and pull request.

```mermaid
flowchart LR
    A["Git Push"] --> B["GitHub Actions CI"]
    B --> C["Lint & Format (Biome)"]
    B --> D["TypeScript Typecheck"]
    B --> E["Security SAST & Secrets (Gitleaks / Semgrep)"]
    B --> F["Bun Audit (Dependencies)"]
    B --> G["Unit & SRS Tests (Bun Test)"]
    C & D & E & F & G --> H{"All Green?"}
    H -->|Yes| I["Auto-Deploy to Vercel & Cloudflare"]
    H -->|No| J["Block Merge & Alert Developer"]
```

---

## 2. GitHub Actions CI/CD Configuration

Create `.github/workflows/ci.yml` in your repository root:

```yaml
name: DevSecOps CI Pipeline

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  validate-and-test:
    name: Code Quality & Security Audit
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Bun Runtime
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: 1.3.14

      - name: Install Dependencies
        run: bun install --frozen-lockfile

      - name: 1. Biome Lint & Format Check
        run: bun run lint

      - name: 2. TypeScript Static Typecheck
        run: bun run typecheck

      - name: 3. Dependency Security Audit
        run: bun audit

      - name: 4. Secret Leak Detection (Gitleaks)
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: 5. Start Test PostgreSQL (Service Container)
        run: |
          docker compose up -d db
          sleep 3
        env:
          DATABASE_URL: postgres://user:password@localhost:5432/cakeshop

      - name: 6. Run Database Migrations
        run: bun run db:migrate
        env:
          DATABASE_URL: postgres://user:password@localhost:5432/cakeshop

      - name: 7. Run Unit & Integration Tests (SRS Verification)
        run: bun run test
        env:
          DATABASE_URL: postgres://user:password@localhost:5432/cakeshop
          JWT_SECRET: test-super-secret-key-that-is-at-least-32-chars-long
          COOKIE_SECRET: test-cookie-secret-that-is-at-least-32-chars
```

---

## 3. OWASP Top 10 Mitigation Matrix for Cakeshop

| OWASP Vulnerability | Risk in Cakeshop System | Mitigation Implemented |
| --- | --- | --- |
| **A01: Broken Access Control** | Temporary Staff accessing admin financial reports or editing recipes. | Role-Based Access Control (RBAC) middleware (`authenticate('admin')`) tested in `nfr-security.test.ts`. |
| **A02: Cryptographic Failures** | Public tracking tokens guessed by attackers; passwords leaked. | Argon2id password hashing; 24-byte cryptographically secure tracking tokens ($2^{192}$ entropy). |
| **A03: Injection (SQL / XSS)** | Malicious SQL inputs in order forms or price updates. | Drizzle ORM parameterized queries (zero string concatenation); Zod schema boundary validation (`zValid`). |
| **A04: Insecure Design** | Negative inventory balances when concurrent orders occur. | PostgreSQL ACID transactions with pessimistic row locks (`SELECT ... FOR UPDATE`). |
| **A05: Security Misconfiguration** | Missing security headers; CORS open to wildcard `*`. | Strict CORS origin allowlist with credentials; Content-Security-Policy; `X-Content-Type-Options: nosniff`. |
| **A06: Vulnerable Dependencies** | Outdated or compromised npm packages. | `bun audit` enforced on every PR in CI; Dependabot alerts enabled. |
| **A07: Identification & Auth** | Session hijacking; infinite session duration. | `httpOnly`, `Secure`, `SameSite=Lax` cookies; 30-minute idle timeout; server-side session revocation on logout. |
| **A08: Software & Data Integrity** | CSRF attacks modifying orders on behalf of an authenticated admin. | Double-submit CSRF token requirement (`x-csrf-token` header) on all state-changing endpoints. |
| **A09: Logging & Monitoring** | Silent auth brute-force attempts. | Structured error envelope `{ error: { code, message } }`; audit logging of failed auth attempts. |
| **A10: SSRF** | Fetching external cake reference photos from user-submitted URLs. | Strict URL allowlist / parsing via URL constructor; disallowing localhost and internal private IP ranges (RFC 1918). |

---

## 4. Free Production Deployment Walkthrough

### Step 1: Provision Free Database (Neon PostgreSQL)
1. Sign up at [neon.tech](https://neon.tech) (Free Tier: 0.5 GB storage, serverless compute).
2. Create project `cakeshop-production`.
3. Copy the pooled connection string:
   `postgresql://neondb_owner:PASSWORD@ep-xyz-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require`
4. Set `DATABASE_URL` in your deployment environments.
5. Apply migrations using Bun:
   ```bash
   DATABASE_URL="your-neon-url" bun run db:migrate
   ```

---

### Step 2: Deploy Backend API to Cloudflare Workers (or Vercel)

Hono is built natively for edge runtimes.

#### Option A: Cloudflare Workers (Recommended for Edge Speed)
1. Install Wrangler CLI:
   ```bash
   bun add -d wrangler
   ```
2. Create `apps/api/wrangler.jsonc`:
   ```jsonc
   {
     "name": "cakeshop-api",
     "main": "src/index.ts",
     "compatibility_date": "2026-09-01",
     "compatibility_flags": ["nodejs_compat"]
   }
   ```
3. Set your production secrets in Cloudflare:
   ```bash
   bunx wrangler secret put DATABASE_URL
   bunx wrangler secret put JWT_SECRET
   bunx wrangler secret put COOKIE_SECRET
   ```
4. Deploy with one command:
   ```bash
   bunx wrangler deploy
   ```
   *Result: Instant global edge API at `https://cakeshop-api.<your-subdomain>.workers.dev` with 0ms cold starts.*

---

### Step 3: Deploy Frontend to Vercel (Next.js)
1. Sign up at [vercel.com](https://vercel.com) (Hobby Free Tier).
2. Import your GitHub repository.
3. Configure the project settings:
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/web`
4. Add Environment Variables:
   - `NEXT_PUBLIC_API_URL`: `https://cakeshop-api.<your-subdomain>.workers.dev`
5. Click **Deploy**.
   *Result: Production frontend with custom domain support and edge CDN at `https://cakeshop.vercel.app`.*

---

## 5. Interview Talking Points on Deployment & Architecture

When asked in interviews: *"Tell me about your deployment and infrastructure decisions:"*

1. **Why Edge Runtime (Hono on Cloudflare) over Traditional Node.js?**
   > *"I chose Hono compiled to Cloudflare Workers because bakery operations require fast mobile response times for customers tracking cakes on 4G networks. Edge isolates provide instant cold starts (<5ms) compared to containerized Node.js (500ms–2s), while keeping operating costs at exactly $0."*

2. **How do you handle PostgreSQL connections in serverless environments?**
   > *"Serverless edge functions can spawn hundreds of ephemeral instances, which risks exhausting standard PostgreSQL connection limits. I used Neon's connection pooler over WebSockets (PgBouncer architecture), allowing multiplexed database access without saturating database connection slots."*

3. **What is your DevSecOps posture?**
   > *"Every PR runs an automated GitHub Actions pipeline performing static linting with Biome, TypeScript compile-time verification, secret detection with Gitleaks, dependency vulnerability checks with `bun audit`, and SRS acceptance criteria tests with Bun test before any code reaches production."*

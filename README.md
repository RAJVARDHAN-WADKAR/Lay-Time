# Demurrage Claim Management & Laytime System ("Lay-Time")

An enterprise-grade maritime Demurrage Claim Management and Laytime Calculation System built with Next.js 14 (App Router), TypeScript, SQLite (`better-sqlite3`), and JWT authentication.

---

## 1. System Architecture

The project is a unified, self-contained Next.js 14 full-stack application backed by an embedded SQLite database and cryptographically signed JWT sessions.

- **Frontend & API**: Next.js 14 App Router (`app/` with React Server & Client Components, Route Handlers under `app/api/**`).
- **Database**: SQLite embedded database using `better-sqlite3` located at `data/laytime.db` (auto-created and seeded on first run, or populated via realistic dataset script).
- **Authentication & Security**: Zero-trust, role-based access control (RBAC) enforced at Edge middleware (`middleware.ts`), backend API handlers (`withApi`, `requireUser`), and UI component trees (`app/access/roles/*`).
- **Calculation Engines**: Pure TypeScript maritime laytime calculation, Statement of Facts (SoF) event reconciliation, Oil/Chem pumping warranty engine, and RAC (Root-Cause Analysis) financial auditing.

---

## 2. Six Defined System Roles & Access Matrix

Access permissions, visible screens, tabs, buttons, and data scopes are strictly defined in `app/access/roles/*` and `lib/auth/pageAccessMatrix.ts`:

| Feature / Screen | ADMIN | SUPERVISOR | CLAIM_PROCESSOR | REVIEWER | FINANCE | CLIENT |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Dedicated Dashboard** | `/dashboard/admin` | `/dashboard/supervisor` | `/dashboard/claim-processor` | `/dashboard/reviewer-client` | `/dashboard/finance` | `/dashboard/reviewer-client` |
| **Data Scope** | Company-wide | Company-wide | Own assigned claims only | Company-wide read-only | Company-wide financial | Own client claims only |
| **Claims Ledger (`/claims`)** | View & Cleanup | Full CRUD, Assign & Settle | View & Edit Assigned Only | Read-only | Read & Payment Fields | Restricted DTO |
| **Create Claim (`/claims/create`)** | ❌ Restricted | ✅ Allowed | ✅ Allowed (auto-assigned) | ❌ Restricted | ❌ Restricted | ❌ Restricted |
| **Laytime Calculator (`/calculator`)** | ✅ Allowed | ✅ Allowed | ✅ Allowed | ❌ Restricted | ❌ Restricted | ❌ Restricted |
| **OCR Studio (`/ocr`)** | ✅ Allowed | ✅ Allowed | ✅ Allowed | ❌ Restricted | ❌ Restricted | ❌ Restricted |
| **RAC Portfolio (`/rac`)** | View & Authorize | Manage & Authorize | Log findings on assigned | Read-only | Read-only | ❌ Blocked |
| **Time-Bar Monitor (`/timebar`)** | ✅ Allowed | ✅ Allowed | ✅ Allowed | Read-only | Read-only | Read-only (Own claims) |
| **Macro Analytics (`/analytics`)** | ✅ Allowed | ✅ Allowed | ❌ Restricted | Read-only | Read-only | ❌ Restricted |
| **Financial Reports (`/reports`)** | Audit Reports | Operational Reports | ❌ Restricted | Read-only | Financial Reports | ❌ Restricted |
| **Documents (`/documents`)** | Manage | Manage | Upload on assigned | Read-only | Read-only | Upload requested (Own) |
| **User Management (`/users`)** | Full CRUD | Subtree Team | ❌ Restricted | ❌ Restricted | ❌ Restricted | ❌ Restricted |
| **System Settings (`/settings`)** | Full CRUD | ❌ Restricted | ❌ Restricted | ❌ Restricted | ❌ Restricted | ❌ Restricted |

### Document Upload Policy & Limits

All document upload endpoints and UI components share centralized configuration constants in [`lib/uploads/constants.ts`](lib/uploads/constants.ts):
- **Allowed Formats**: `PDF`, `PNG`, `JPG` (`JPEG`), `CSV`, `TSV` (verified server-side by magic bytes and UTF-8 tabular inspection).
- **Size Limits**: `MIN_FILE_BYTES = 15 KB` (`15,360` bytes) to `MAX_FILE_BYTES = 1 MB` (`1,048,576` bytes), measured from actual received bytes on the server and enforced early (`413`) at the request stream limit.
- **Note**: A `15 KB` minimum will reject tiny files such as small CSV timesheets and low-resolution scans. Keep both `MIN_FILE_BYTES` and `MAX_FILE_BYTES` in `lib/uploads/constants.ts` so they can be adjusted cleanly later if needed.
- **Deduplication & Storage**: Uploaded files are stored outside `public/` in `data/uploads/` using generated UUID names and deduplicated per claim by SHA-256 hash.

### Role Responsibilities:
1. **ADMIN**: System administration, user lifecycle management, company-wide audit trails, and configuration settings.
2. **SUPERVISOR**: Operations lead, claim approvals, calculation overrides, processor assignments, settlements, and company-wide financial reporting.
3. **CLAIM_PROCESSOR**: Demurrage analyst workbench, timebar tracking, voyage Statement of Facts reconciliation, and drafting negotiations on assigned claims only.
4. **REVIEWER**: Legal and compliance inspection portal with read-only audit access across company claims and calculations.
5. **FINANCE**: Accounts receivable/payable, tracking payments, generating invoices, and updating claim payment milestones. Restricted from editing operational claims, SoF, or overrides.
6. **CLIENT**: Counterparty portal showing only their company's claims, negotiations, and requested document uploads in a restricted DTO format.

---

## 3. Dedicated Role Dashboards

Each role has its own dedicated dashboard component and route:
- `/dashboard/admin`: Global oversight and user directory management
- `/dashboard/supervisor`: Operational health, pending approvals, and override controls
- `/dashboard/claim-processor`: Active worklist, timebar alerts, and assigned claim processing
- `/dashboard/reviewer-client`: Read-only compliance portal or counterparty portal
- `/dashboard/finance`: Receivables ledger, invoices, and payment tracking

Root navigation (`/`) and general `/dashboard` automatically redirect authenticated users to their role-specific dashboard. Unauthorized cross-dashboard navigation is blocked at the Edge and redirected to the user's authorized home.

---

## 4. Setup & Environment Variables

### Prerequisites & Node Version
- **Node.js**: Node 20 or Node 22 LTS is required.
- **npm**: npm 10+
- **Build Tools for `better-sqlite3`**: On Windows, ensure you have Python and Visual Studio C++ build tools installed (`npm install -g windows-build-tools` or install via Visual Studio Installer "Desktop development with C++"). If compiling native bindings fails, run:
  ```bash
  npm rebuild better-sqlite3
  ```

### Environment Configuration
Copy `.env.example` to `.env.local` and configure your environment:
```bash
cp .env.example .env.local
```

Example `.env.local`:
```env
# Application Environment
NODE_ENV=development
PORT=3000

# Authentication & Session Security (minimum 32 characters)
JWT_SECRET=c8e7b1a2f4d6e8a0b2c4d6e8f0a2b4c6d8e0f2a4b6c8d0e2f4a6b8c0d2e4f6a8
COOKIE_SECURE=false

# Database Path (defaults to data/laytime.db)
DATABASE_PATH=data/laytime.db
```

---

## 5. Quickstart & Commands

### 1. Install Dependencies
```bash
npm install
```

### 2. Load Dataset
To load the realistic 42-claim production dataset into SQLite:
```bash
node scripts/load-dataset.js
```
This populates all 24 database tables including claims, Statement of Facts (SoF), laytime calculations, deductions, documents, payments, invoices, and users.

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 6. Running Verification & Test Suites

The project includes automated verification and end-to-end integration test suites:

```bash
# 1. TypeScript Strict Typecheck
npx tsc --noEmit --incremental false

# 2. Next.js ESLint Validation
npm run lint

# 3. Next.js Production Build
npm run build

# 4. Consolidated Audited Defects Verification (42/42 checks)
npx tsx scripts/verify.js

# 5. Automated Auth & Access Control Test Suite (176 tests)
npm run test:auth

# 6. Comprehensive End-to-End System Suite (45 tests)
npm run test:e2e

# 7. Run All Tests
npm test
```

---

## 7. Pre-Configured Demo Accounts

All demo accounts share the password: **`Demo@12345`**

| Role | Email | Password | Data Scope |
|---|---|---|---|
| **Admin** | `admin@laytime.demo` | `Demo@12345` | Global system oversight, 42 claims, `/users`, `/settings` |
| **Supervisor** | `supervisor@laytime.demo` | `Demo@12345` | All 42 claims, approvals, assignments, overrides |
| **Claim Processor 1** | `processor1@laytime.demo` | `Demo@12345` | 22 assigned claims (`CLM-2026-001` through `022`) |
| **Claim Processor 2** | `processor2@laytime.demo` | `Demo@12345` | 20 assigned claims (`CLM-2026-023` through `042`) |
| **Reviewer** | `reviewer@laytime.demo` | `Demo@12345` | Read-only inspection across all 42 claims |
| **Finance** | `finance@laytime.demo` | `Demo@12345` | Invoices, payments, and claims financial milestones |
| **Client (Sokana)** | `client1@laytime.demo` | `Demo@12345` | 8 Sokana charterer claims (restricted counterparty DTO) |

---

## 8. Troubleshooting

1. **`SqliteError: unable to open database file` (`SQLITE_CANTOPEN`) on Windows**:
   - Ensure the `data/` directory exists (`mkdir data`).
   - If running test scripts while Next.js dev server is running, avoid concurrent schema locks or ensure tests open SQLite with `{ readonly: true }` when probing.

2. **`better-sqlite3` compilation errors during `npm install`**:
   - Verify Node version is 20 or 22 LTS (`node -v`).
   - Install Visual Studio C++ Build Tools and run `npm rebuild better-sqlite3`.

3. **Rate Limiting 429 Too Many Requests**:
   - The login endpoint enforces 5 failed attempts per IP + email per 15-minute window. Wait for the window to expire or restart the server to reset in-memory counters.

4. **Optimistic Concurrency 409 Conflict**:
   - The API uses optimistic locking via `updatedAt`. If another user or process modified the claim or RAC case, reload the record in the UI and re-apply changes.

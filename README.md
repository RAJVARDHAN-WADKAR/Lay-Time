# Demurrage Claim Management & Laytime System ("Lay-Time")

An enterprise-grade maritime Demurrage Claim Management and Laytime Calculation System built with Next.js 14 (App Router), TypeScript, SQLite (`better-sqlite3`), and JWT authentication.

---

## 1. System Architecture

The project is a unified, self-contained Next.js 14 full-stack application backed by an embedded SQLite database and cryptographically signed JWT sessions.

- **Frontend & API**: Next.js 14 App Router (`app/` with React Server & Client Components, Route Handlers under `app/api/**`).
- **Database**: SQLite embedded database using `better-sqlite3` located at `data/laytime.db` (auto-created and seeded on first run).
- **Authentication & Security**: Zero-trust, role-based access control (RBAC) enforced at Edge middleware (`middleware.ts`), backend API handlers (`withApi`, `requireUser`), and UI component trees (`app/access/roles/*`).
- **Calculation Engines**: Pure TypeScript maritime laytime calculation, Statement of Facts (SoF) event reconciliation, Oil/Chem pumping warranty engine, and RAC (Root-Cause Analysis) financial auditing.

> **Optional / Unused Backend Note**: The root directory contains an optional NestJS backend prototype (`backend/`) and `docker-compose.yml`. This is an **unused, standalone optional service** kept for external architectural reference. The active, production-ready system is fully powered by the internal Next.js API routes and SQLite database.

---

## 2. Four Defined System Roles & Access Matrix

Access permissions, visible screens, tabs, buttons, and data scopes are strictly defined in `app/access/roles/*`:

| Feature / Screen | ADMIN | SUPERVISOR | CLAIM_PROCESSOR | REVIEWER_CLIENT |
|---|:---:|:---:|:---:|:---:|
| **Dedicated Dashboard** | `/dashboard/admin` | `/dashboard/supervisor` | `/dashboard/claim-processor` | `/dashboard/reviewer-client` |
| **Data Scope** | Company-wide | Company-wide | Own assigned claims only | Own client claims (External Client) or Company-wide read-only (Internal Reviewer) |
| **Claims Ledger (`/claims`)** | View & Cleanup | Full CRUD, Assign & Settle | View & Edit Assigned Only | Read-only |
| **Create Claim (`/claims/create`)** | ❌ Restricted | ✅ Allowed | ✅ Allowed (auto-assigned) | ❌ Restricted |
| **Laytime Calculator (`/calculator`)** | ❌ Restricted | ✅ Allowed | ✅ Allowed | ❌ Restricted |
| **OCR Studio (`/ocr`)** | ❌ Restricted | ✅ Allowed | ✅ Allowed | ❌ Restricted |
| **RAC Portfolio (`/rac`)** | View only | Manage & Authorize | Log findings on assigned | Read-only (Internal Reviewer); ❌ Blocked (Client) |
| **Time-Bar Monitor (`/timebar`)** | ❌ Restricted | ✅ Allowed | ✅ Allowed | Read-only (Client/Reviewer) |
| **Macro Analytics (`/analytics`)** | ✅ Allowed | ✅ Allowed | ❌ Restricted (Workbench only) | Read-only |
| **Financial Reports (`/reports`)** | Audit Reports | Operational Reports | ❌ Restricted (Workbench only) | Read-only |
| **Documents (`/documents`)** | Manage | Manage | Upload on assigned | Upload requested documents (Client) / Read-only (Reviewer) |
| **User Management (`/users`)** | Full CRUD | View team | ❌ Restricted | ❌ Restricted |
| **System Settings (`/settings`)** | Full CRUD | ❌ Restricted | ❌ Restricted | ❌ Restricted |

### Role Responsibilities:
1. **ADMIN**: System administration, user lifecycle management, company-wide audit trails, and configuration settings. Prohibited from operational claim editing.
2. **SUPERVISOR**: Operations lead, claim approvals, calculation overrides, processor assignments, settlements, and company-wide financial reporting.
3. **CLAIM_PROCESSOR**: Demurrage analyst workbench, timebar tracking, voyage Statement of Facts reconciliation, and drafting negotiations on assigned claims only.
4. **REVIEWER_CLIENT**: Dual-mode read-only role:
   - *External Client* (with `clientId`): Dedicated counterparty portal showing only their company's claims, negotiations, and requested document uploads.
   - *Internal Reviewer*: Legal and compliance inspection portal with read-only audit access across company claims.

---

## 3. Dedicated Role Dashboards & Folders

Each role has its own dedicated dashboard component, route, and folder structure:
- `components/roles/admin/` & `components/dashboard/admin/AdminDashboard.tsx` (`/dashboard/admin`)
- `components/roles/supervisor/` & `components/dashboard/supervisor/SupervisorDashboard.tsx` (`/dashboard/supervisor`)
- `components/roles/claim-processor/` & `components/dashboard/claim-processor/ClaimProcessorDashboard.tsx` (`/dashboard/claim-processor`)
- `components/roles/reviewer-client/` & `components/dashboard/reviewer-client/ReviewerClientDashboard.tsx` (`/dashboard/reviewer-client`)
- Shared widgets: `components/dashboard/shared/` (`RoleAccessControlMatrix.tsx`, etc.)

Root navigation (`/`) and general `/dashboard` automatically redirect each authenticated user to their role-specific dashboard. Unauthorized cross-dashboard navigation is blocked at the Edge and redirected to the user's authorized home.

---

## 4. Environment Variables

Create a `.env.local` file in the project root:

```env
# Application Environment
NODE_ENV=development
PORT=3000

# Authentication & Session Security (minimum 32 characters)
JWT_SECRET=your_secure_random_jwt_secret_key_minimum_32_characters

# Database Path (defaults to data/laytime.db)
DATABASE_PATH=data/laytime.db

# Optional Demo Password Overrides
DEMO_ADMIN_PASSWORD=Raj@123
DEMO_PROCESSOR_PASSWORD=Rohit@123
DEMO_SUPERVISOR_PASSWORD=Swayam@123
DEMO_REVIEWER_PASSWORD=Paras@123
DEMO_CLIENT_PASSWORD=Client@123
```

> **SECURITY NOTICE**: Demo credentials are provided for local testing and evaluation. In production environments, set a unique, cryptographically strong `JWT_SECRET` and change all default passwords.

---

## 5. Quickstart & Commands

### Prerequisites
- Node.js 18+ or 20+
- npm 9+

### Install Dependencies
```bash
npm install
```

### Seed Authentication & Database
The application automatically creates and seeds `data/laytime.db` on first boot. To explicitly seed users and verify all role matrix accounts:
```bash
npm run db:seed-auth
```

### Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Run Verification & Tests
```bash
# 1. Typecheck
npx tsc --noEmit

# 2. Lint
npm run lint

# 3. Production Build
npm run build

# 4. Access Matrix Agreement Audit
node scripts/check-access.js

# 5. Automated End-to-End Auth & Security Test Suite
npm run test:auth
```

---

## 6. Pre-Configured Demo Accounts

| Role | Email | Password | Scope & Screen |
|---|---|---|---|
| **Admin** | `rajvardhanwadkar76@gmail.com` | `Raj@123` | Global admin oversight, `/users`, `/settings` |
| **Claim Processor** | `rohitmengane2975@gmail.com` | `Rohit@123` | Analyst workbench, assigned claims only |
| **Supervisor** | `swayamghatage3839@gmail.com` | `Swayam@123` | Full claim management, approvals, assignment |
| **Reviewer** | `paraschougale558@gmail.com` | `Paras@123` | Legal compliance audit, read-only oversight |
| **External Client** | `client@trafigura.com` | `Client@123` | Trafigura counterparty portal, own claims only |

# User Roles and Role-Based Access Control (RBAC)

This document specifies the four user roles implemented in the system, their exact permissions, operational boundaries, and security enforcement mechanisms.

---

## 1. Role Definitions

### 1. Admin
- **Role Identity**: Principal Administrator & Master Mariner.
- **Scope**: Unrestricted global administrative and operational access.
- **User Management**: Exclusive authority to create new user accounts, modify roles, update names/emails, reset passwords, and toggle account activation status (`Active` / `Inactive`).
- **Claims Ledger**: Unrestricted read, create, edit, and delete access across all claims in the portfolio.
- **System Settings**: Authority to configure business rules, default laytime assumptions, working hour rules, and currency settings.
- **Default Test Account**: `rajvardhanwadkar76@gmail.com`

---

### 2. Claim Processor
- **Role Identity**: Senior Demurrage Analyst.
- **Scope**: Hands-on operational data entry, Statement of Facts reconciliation, and deduction logging for assigned voyages.
- **Claims Access**: Can view and manage claims assigned to their account (matches name, email, or designated assignment).
- **Claim Creation**: Full authority to create new claims and log Statement of Facts activities.
- **Claim Modification**: Can update assigned claim details, add/edit berths, record deductions, resolve operational discrepancies, and trigger laytime calculations.
- **Restrictions**: Cannot access the User Management console (`/users`). Cannot delete claims. Cannot modify claims assigned to other analysts unless reassigned.
- **Default Test Account**: `rohitmengane2975@gmail.com`

---

### 3. Supervisor
- **Role Identity**: Operations Supervisor & Post-Fixture Lead.
- **Scope**: Portfolio-wide managerial oversight, calculation verification, and settlement authorization.
- **Claims Access**: Full read and edit access to all claims across all commercial accounts and counterparties.
- **Overrides**: Authority to apply manual demurrage/despatch overrides, approve agreed settlement figures, and execute claim deletions.
- **Analytics & Dashboards**: Full access to operational analytics, exposure heatmaps, and financial reports.
- **Restrictions**: Cannot manage user accounts (`/users`).
- **Default Test Account**: `swayamghatage3839@gmail.com`

---

### 4. Reviewer
- **Role Identity**: Legal Counsel, Chartering Auditor, or External Compliance Officer.
- **Scope**: Strictly read-only inspection mode across all views.
- **Claims Access**: Can view all claims in the ledger, inspect Statement of Facts chronologies, examine owner comparisons, and review timebar timelines.
- **Dashboards & Reports**: Can view operations dashboards, review analytics visualizations, and export PDF reports.
- **Strict Restrictions**:
  - Cannot create claims (`POST /api/claims` returns `403 Forbidden`).
  - Cannot edit claims (`PUT /api/claims/:id` returns `403 Forbidden`).
  - Cannot delete claims (`DELETE /api/claims/:id` returns `403 Forbidden`).
  - Cannot add or modify SoF activities.
  - Cannot access the User Management console (`/users`).
  - UI automatically hides all action buttons (`Edit Claim`, `Create Claim`, `Add Activity`, `Resolve Discrepancy`, `Delete`).
- **Default Test Account**: `paraschougale558@gmail.com`

---

## 2. Role × Permission Matrix

| Operational Capability | Admin | Supervisor | Claim Processor | Reviewer | Enforcement Mechanism |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Access Dashboard (`/dashboard`)** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | `middleware.ts` (Requires valid JWT session) |
| **View Claims Ledger (`/claims`)** | ✅ Yes | ✅ Yes | ✅ Assigned Only | ✅ Yes (Read-Only) | SQL filter in `getClaims()` + TanStack Table |
| **Create New Claim (`/claims/create`)** | ✅ Yes | ✅ Yes | ✅ Yes | ❌ Blocked | UI hidden + `POST /api/claims` returns `403` |
| **Edit Claim Particulars** | ✅ Yes | ✅ Yes | ✅ Assigned Only | ❌ Blocked | `canEditClaim()` check + `PUT /api/claims/:id` |
| **Add / Edit SoF Activities** | ✅ Yes | ✅ Yes | ✅ Assigned Only | ❌ Blocked | `canEditClaim()` check + API guard |
| **Delete Claim** | ✅ Yes | ✅ Yes | ❌ Blocked | ❌ Blocked | `DELETE /api/claims/:id` checks `Admin/Supervisor` |
| **Manual Demurrage Override** | ✅ Yes | ✅ Yes | ❌ Blocked | ❌ Blocked | UI gate + API permission check |
| **View Timebar Monitor (`/timebar`)** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | `middleware.ts` |
| **Access RAC Module (`/rac`)** | ✅ Yes | ✅ Yes | ✅ Assigned Only | ✅ View-Only | `middleware.ts` + `lib/api/rac.ts` |
| **Create RAC Case** | ✅ Yes | ✅ Yes | ✅ Yes | ❌ Blocked | `POST /api/rac/cases` returns `403` |
| **Edit RAC Case** | ✅ Yes | ✅ Yes | ✅ Assigned Only | ❌ Blocked | `PUT /api/rac/cases/:id` returns `403` |
| **Delete RAC Case** | ✅ Yes | ✅ Yes | ❌ Blocked | ❌ Blocked | `DELETE /api/rac/cases/:id` returns `403` |
| **Export PDF Reports (`/reports`)** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | Client-side jsPDF execution |
| **Access User Management (`/users`)** | ✅ Yes | ❌ Blocked | ❌ Blocked | ❌ Blocked | `middleware.ts` redirects to `/dashboard` |
| **Create / Modify User Accounts** | ✅ Yes | ❌ Blocked | ❌ Blocked | ❌ Blocked | `app/api/users/route.ts` returns `403` |
| **Deactivate User Accounts** | ✅ Yes | ❌ Blocked | ❌ Blocked | ❌ Blocked | `app/api/users/[id]/route.ts` returns `403` |
| **Modify Global System Settings** | ✅ Yes | ✅ Yes | ❌ Blocked | ❌ Blocked | `app/api/settings/route.ts` |

---

## 3. Two-Tier Permission Enforcement Architecture

Permissions are never enforced solely by hiding UI buttons. The application implements a **two-tier defense-in-depth model**:

1. **Client-Side Rendering Layer ([lib/context/AuthContext.tsx](file:///C:/Lay%20time/lib/context/AuthContext.tsx))**:
   - `canEditClaim(claimAssignedTo)`: Evaluates whether the active user has authority to edit a given claim.
   - `canAccessUsers`: Boolean flag evaluating `user?.role === "Admin"`.
   - `isReadOnly`: Boolean flag evaluating `user?.role === "Reviewer"`.
   - Action buttons, modal triggers, and form fields are conditionally disabled or hidden from view.
   - Access to `/users` displays an immediate **"Access Restricted: Administrator Privileges Required"** card if visited directly.

2. **Server-Side API & Middleware Layer ([middleware.ts](file:///C:/Lay%20time/middleware.ts), [app/api/](file:///C:/Lay%20time/app/api))**:
   - `middleware.ts` intercepts `/users` and redirects non-Admins to `/dashboard`.
   - Every mutating route handler (`POST`, `PUT`, `DELETE`) inspects the verified session from the HTTP-Only cookie via `getCurrentUserFromRequest()`.
   - If a Reviewer submits a `PUT` request to `/api/claims/CLM-2024-001`, the server aborts execution immediately:
     ```ts
     if (session.role === "Reviewer") {
       return NextResponse.json({ error: "Forbidden: Reviewers have read-only access." }, { status: 403 });
     }
     ```
   - If a Claim Processor attempts to edit a claim assigned to another analyst:
     ```ts
     if (!canEditClaim(session.role, session.email, existing.assignedTo, session.name)) {
       return NextResponse.json({ error: "Forbidden: You are only permitted to edit claims assigned to your account." }, { status: 403 });
     }
     ```

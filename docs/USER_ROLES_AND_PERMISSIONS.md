# Laytime & Demurrage Exact 4-Role Access Control (RBAC) Architecture

This document specifies the exact 4-Role Role-Based Access Control (RBAC) architecture implemented across backend and frontend in the "Lay-Time" application.

---

## 1. Single Source of Truth File Registry

Role definitions reside in `backend/src/access/roles/` and are mirrored in `app/access/roles/` for unified cross-tier security:

```
backend/src/access/roles/
├── permissions.types.ts       # Core interfaces (RoleName, Resource, Action, DataScope, RoleDefinition)
├── admin.role.ts              # ADMIN role definition & permissions
├── supervisor.role.ts         # SUPERVISOR role definition & permissions
├── claim-processor.role.ts    # CLAIM_PROCESSOR role definition & permissions
├── reviewer-client.role.ts    # REVIEWER_CLIENT role definition & permissions (Internal & External)
└── index.ts                   # ROLES_REGISTRY, normalizeRole(), hasPermission(), getRoleScope()

app/access/roles/              # Re-exports directly from backend/src/access/roles (Zero duplication)
```

### The Exact 4 Roles
1. **`ADMIN`** (system owner within the company)
2. **`SUPERVISOR`** (claim manager and approver)
3. **`CLAIM_PROCESSOR`** (claim preparer)
4. **`REVIEWER_CLIENT`** (strictly read-only legal/auditor internally, or commercial client portal externally)

All roles share one SQLite database (`data/laytime.db`) and one Prisma schema enum (`Role`). Role files hold pure permissions and UI capabilities—never data, seeds, or mock copies.

---

## 2. Role Definitions & Access Matrix

### 1. ADMIN (System Owner within the Company)
- **Purpose**: System owner and platform administrator.
- **Data Scope**: `company-wide`.
- **Allowed Actions**:
  - Full control over users, roles, company settings, clients, and vessels (`create`, `edit`, `delete`).
  - View all claims, Statement of Facts (SoF), documents, calculations, RAC cases, negotiations, invoices, payments, dashboards, analytics, reports, and the immutable audit log.
  - Can export reports and clean up / delete records for administrative maintenance.
- **Separation of Duties**:
  - Cannot review, approve settlements, apply calculation overrides, or accept commercial negotiations (these duties belong to the Supervisor).
- **Default Account**: `rajvardhanwadkar76@gmail.com` / `Raj@123`

### 2. SUPERVISOR (Claim Manager & Approver)
- **Purpose**: Operational lead, calculation approver, and financial settlement authority.
- **Data Scope**: `company-wide`.
- **Allowed Actions**:
  - Claims: `view`, `create`, `edit`, `approve`, `delete`. Assign and reassign claims to Claim Processors.
  - SoF, ports, berths, documents, calculations, OCR: `view`, `create`, `edit`, `delete` documents, and `verify`.
  - Apply calculation overrides with mandatory justification reason.
  - RAC: `view`, `create`, `edit`, `resolve`, `ignore`, `authorize`, and `close` findings.
  - Negotiations: `initiate`, `approve our offers`, `log counterparty offers`, set and view the minimum acceptable amount, `accept`, `reject`, and `close`.
  - Review and settle claims (settlement allowed only from an accepted negotiation).
  - Invoices and payments: full operational control (`view`, `create`, `edit`, `approve`).
  - Access to Owners Claim, Billable ($), and all financial fields.
  - Clients and vessels: `view`, `create`, `edit` (no delete). Users: `view` only.
  - Global dashboards, analytics, reports, and the audit log.
- **Default Account**: `swayamghatage3839@gmail.com` / `Swayam@123`

### 3. CLAIM_PROCESSOR (Claim Preparer)
- **Purpose**: Voyage demurrage preparer and frontline claim handler.
- **Data Scope**: `own assigned claims only` (`assigned_to = userId`). Claims created by the processor are auto-assigned to them.
- **Allowed Actions**:
  - Claims: `view`, `create`, `edit`, submit for review.
  - SoF, ports, berths, documents, calculations, OCR: `view`, `create`, `edit`, `upload`, `verify`, run and recalculate laytime on own claims. (No overrides).
  - RAC: `view`, `create`, `edit`, `analyze`, `resolve`, submit (cannot ignore, authorize, or close).
  - Negotiations: request negotiation, log counterparty offers, draft our offers. (Cannot initiate, approve, accept, or close; cannot see the minimum acceptable amount).
  - Payments & Invoices: record payments and create draft invoices on own claims (approval is Supervisor-only).
  - Financial fields: views Owners Claim amount only; Billable ($) and minimum acceptable amount are strictly hidden.
  - Clients and vessels: `view` and `create` (no edit or delete).
  - Dashboards, analytics, and reports for own claims only.
  - No access to users, settings, claim assignment, or the audit log.
- **Default Account**: `rohitmengane2975@gmail.com` / `Rohit@123`

### 4. REVIEWER_CLIENT (Strictly Read-Only Auditor or External Client)
- **Purpose**: Strictly read-only role for internal legal/auditors or external counterparty portals.
- **Dynamic Scope**:
  - **Internal Reviewer** (`clientId` is null): `company-wide` scope.
    - Can view claims, SoF, ports, berths, documents, stored calculation results, RAC findings and status, payments, invoices, negotiation history (in oversight mode including minimum acceptable amount), clients, vessels, dashboards, existing reports, and audit logs.
    - Strictly forbidden from modifying, calculating, overriding, assigning, settling, running OCR, or triggering any write endpoint.
    - Credentials: `paraschougale558@gmail.com` / `Paras@123`
  - **External Client** (`clientId` is set): `own client only` scope (`client_id = assignedClientId`).
    - Receives a restricted DTO: claim reference, vessel, port, status, total demurrage claimed, agreed amount, and shared documents.
    - Strictly forbidden from SoF, deductions, calculations, overrides, RAC data, internal notes, minimum acceptable amount, clients/vessels master lists, users, settings, and audit logs.
    - Client Exceptions: Can upload requested documents and approve final settlement offers in the negotiation room.
    - Credentials: `client@trafigura.com` / `Client@123` (Linked to `client-trafigura`)

---

## 3. Hierarchical User Management

### Creation Matrix (`CREATE_MATRIX`)
```typescript
export const CREATE_MATRIX: Record<string, UserRole[]> = {
  ADMIN: ["ADMIN", "SUPERVISOR", "REVIEWER_CLIENT"],
  SUPERVISOR: ["CLAIM_PROCESSOR"],
  CLAIM_PROCESSOR: ["REVIEWER_CLIENT"], // External Client with clientId
  REVIEWER_CLIENT: []
};
```

- Any attempt to create a user outside this matrix returns `403 Forbidden`.
- **Subtree Management**: Actors may only update, deactivate, or reset passwords for accounts located within their own recursive `created_by` subtree.
- **Self-Protection**: Self-deactivation and deactivating the last active Admin are strictly blocked (`403 Forbidden`).

---

## 4. Automated Test Verification

The entire automated authentication and enterprise RBAC test suite (`npm run test:auth`) verifies all constraints:
- **121 / 121 tests passing (100%)**
- Zero-trust middleware edge enforcement
- Row-level isolation on claims, SoF, calculations, and RAC
- Token version session revocation on deactivation and password reset
- Append-only negotiation room immutability and supervisor settlement confirmation
